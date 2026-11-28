import { readFileSync, createReadStream } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CdpSession, listCdpTargets } from '../sidecars/prism_studio/cdp-bridge.mjs';
import { buildBuiltinAuroraSvg } from '../src/engine/runtime/web-shim.mjs';
import { effortSliderScript } from './effort-slider/bundle.mjs';
import { frameScript } from './frame.mjs';
import { composerBorderScript } from './composer-border.mjs';
import { quotaIconScript } from './quota-icon.mjs';

export const script = readFileSync(new URL('./inject.js', import.meta.url), 'utf8').replace('/* NERI_THEME_CSS */', readFileSync(new URL('./neri-theme.css', import.meta.url), 'utf8')).replace('/* NERI_QUOTA_SCRIPT */',quotaIconScript).replace('/* NERI_FRAME_SCRIPT */',frameScript).replace('/* NERI_COMPOSER_SCRIPT */',composerBorderScript);
// 本地素材统一前缀；随插件移动，不依赖用户的临时素材目录。
const neriAssetBase = appFileUrl(fileURLToPath(new URL('../assets/neri-chatgpt-ui-assets/', import.meta.url)));
const neriOverlayMode = process.env.CODEX_PRISM_NERI_OVERLAY_MODE === 'screen' ? 'screen' : 'transparent';
const effectsScript=process.env.NERI_TYPING_EFFECTS==='0'?'':readFileSync(new URL('./typing-effects/effects.js',import.meta.url),'utf8');
export const panelScript = readFileSync(new URL('./panel.js', import.meta.url), 'utf8').replace('/* NERI_PANEL_CSS */',readFileSync(new URL('./neri-panel.css',import.meta.url),'utf8'));
const builtinPreview = 'data:image/svg+xml;base64,' + Buffer.from(buildBuiltinAuroraSvg()).toString('base64');
export function appFileUrl(path) {
  return 'app://fs/@fs/' + path.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/');
}
export function selectCodexTargets(targets) {
  return targets.filter(t => t.type === 'page' && t.webSocketDebuggerUrl &&
    /^app:\/\/-\/(?:index\.html)?(?:[?#].*)?$/.test(t.url) &&
    !/avatar-overlay|detached-window|picture-in-picture/i.test(new URL(t.url).searchParams.get('initialRoute') || ''));
}
export async function nativePayload(engine) {
  const state = engine.getActivePayload();
  const media = await engine.mediaServer.resolveNativeMedia(state.activeItem?.id);
  return {
    enabled: state.skinEnabled, config: state.effectiveConfig, neriAssetBase, neriOverlayMode,
    title: state.activeItem?.title || 'Prism', kind: media?.kind || 'image',
    url: media?.builtin ? 'data:image/svg+xml;base64,' + Buffer.from(buildBuiltinAuroraSvg()).toString('base64') : media?.path ? appFileUrl(media.path) : '',
    slides: (media?.slides || []).map(appFileUrl), fallback: Boolean(media?.fallback),
  };
}
export async function nativePanelState(engine) {
  const state=engine.getActivePayload(), library=await engine.listLibrary();
  const items=await Promise.all(library.items.map(async item=>{
    // 单张素材预览失效不能让整份列表和设置同步失败。
    let preview;try{preview=await engine.mediaServer.resolveNativeMedia(item.id,{previewOnly:true});}catch{}
    const isDefault=item.id===engine.neriLibrary?.defaultId;
    return {id:item.id,title:isDefault?'默认音理壁纸 · 6K':item.title,kind:item.kind,source:item.source,isDefault,preview:preview?.builtin?builtinPreview:preview?.path?appFileUrl(preview.path):isDefault?appFileUrl(fileURLToPath(new URL('../assets/wallpapers/neri-preview.gif',import.meta.url))):''};
  }));
  items.sort((a,b)=>Number(b.isDefault)-Number(a.isDefault));
  return {enabled:state.skinEnabled,config:state.config,activeId:state.activeItem?.id||'',title:state.activeItem?.title||'选择一张壁纸',items,folders:engine.neriLibrary?.folders||[],wallpaperEngine:engine.neriLibrary?.wallpaperEngine||''};
}
export function createCodexBridge({ engine, port = 9340, openStudio, onStatus = () => {} }) {
  let timer, busy = false, stopped = false, panelRequested = false;
  const connected = new Set();
  let lastStatus = { connected: false, windows: 0, port, error: '等待 Codex 调试端口' };
  async function tick() {
    if (busy || stopped) return;
    busy = true;
    let windows = 0, error = '';
    try {
      const targets = selectCodexTargets(await listCdpTargets(port));
      const payload = await nativePayload(engine);
      for (const target of targets) {
        let session;
        try {
          session = await CdpSession.connect(target.webSocketDebuggerUrl);
          if (!(await session.evaluate(`Boolean(document.querySelector('[data-app-shell-frame]'))`))) {
            await session.evaluate('window.__codexPrism?.destroy()');
            continue;
          }
          connected.add(target.webSocketDebuggerUrl);
          // Runtime.evaluate does not require Runtime.enable, persistent bindings, or a CSP bypass.
          const result = await session.evaluate(`${effortSliderScript};\n${panelScript}\n${script}\n;window.__codexPrism.apply(${JSON.stringify(payload)});if(${payload.enabled && payload.config?.typingEffectsEnabled!==false}){${effectsScript}}else{window.__codexTypingEffects?.dispose()};[...window.__codexPrism.drain(),...window.__codexPrismPanel.drain()]`, { returnByValue: true });
          for (const action of result || []) {
            if(action && typeof action==='object') {
              try {
                if(action.type==='config'){await engine.updateConfig(action.patch||{});if(action.scan)await engine.listLibrary({refresh:true});}
                else if(action.type==='apply')await engine.applyWallpaper(action.id);
                else if(action.type==='next')await engine.stepPlaylist(1);
                else if(action.type==='scan')await engine.listLibrary({refresh:true});
                else if(action.type==='upload'){
                  const remote=await session.send('Runtime.evaluate',{expression:`document.getElementById('codex-prism-floating')?.shadowRoot.getElementById('file').files[0]`,returnByValue:false});
                  const objectId=remote.result?.objectId;
                  if(!objectId)throw new Error('请选择一个文件');
                  try{const file=await session.send('DOM.getFileInfo',{objectId});if(!file.path)throw new Error('无法读取所选文件');await engine.uploadMedia({filename:basename(file.path),streamOrBuffer:createReadStream(file.path),title:basename(file.path)});}
                  finally{await session.send('Runtime.releaseObject',{objectId}).catch(()=>{});}
                  await session.evaluate(`document.getElementById('codex-prism-floating').shadowRoot.getElementById('file').value=''`);
                }
              }catch(e){await session.evaluate(`window.__codexPrismPanel.error(${JSON.stringify(e.message)})`);}
            }
            else if (action === 'studio') openStudio();
            else if (action === 'disable') await engine.updateConfig({ skinEnabled: false });
            else if (action === 'toggle') await engine.updateConfig({ skinEnabled: !engine.getConfig().skinEnabled });
            else if (action === 'next') await engine.stepPlaylist(1);
            else if (action === 'ended' && engine.getConfig().rotationEnabled && engine.getConfig().rotationTrigger === 'videoEnd') await engine.stepPlaylist(1, 'videoEnd');
            else if (action.startsWith('error:')) error = action.slice(6);
          }
          if(result?.some(action=>action&&typeof action==='object'&&['config','apply','next','upload','scan'].includes(action.type))){
            const latest=await nativePayload(engine);
            await session.evaluate(`window.__codexPrism.apply(${JSON.stringify(latest)});if(!${latest.enabled&&latest.config?.typingEffectsEnabled!==false})window.__codexTypingEffects?.dispose()`);
          }
          if(panelRequested){await session.evaluate('if(!window.__codexPrismPanel.isOpen)window.__codexPrismPanel.toggle()');panelRequested=false;}
          if(await session.evaluate('window.__codexPrismPanel.isOpen')){
            const panelState=await nativePanelState(engine);
            await session.evaluate(`window.__codexPrismPanel.update(${JSON.stringify(panelState)})`);
          }
          connected.add(target.webSocketDebuggerUrl);
          windows++;
        } catch (e) { error = e.message;try{await session?.evaluate(`window.__codexPrismPanel?.error(${JSON.stringify('同步失败：'+e.message)})`);}catch{} }
        finally { session?.close(); }
      }
      if (!targets.length) error = '调试端口可用，但未找到 Codex 主窗口';
    } catch (e) { error = '应用尚未开放本地调试端口，请从已配置的原有入口启动：' + e.message; }
    finally {
      lastStatus = { connected: windows > 0, windows, port, error };
      onStatus(lastStatus);
      busy = false;
    }
  }
  return {
    getStatus: () => lastStatus,
    async start() { await tick(); timer = setInterval(() => void tick(), 1500); },
    tick,
    async showPanel(){panelRequested=true;await tick();},
    async stop() {
      stopped = true; clearInterval(timer);
      while (busy) await new Promise(r => setTimeout(r, 30));
      for (const url of connected) {
        let s;
        try { s = await CdpSession.connect(url, 1000); await s.evaluate('window.__codexEffortSlider?.destroy();window.__codexPrism?.destroy()'); }
        catch {} finally { s?.close(); }
      }
    },
  };
}
