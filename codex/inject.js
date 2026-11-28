(() => {
  if (window.__codexPrism) return;
  let stage, style, button, frame, current = '', slideTimer, signature = '', enabled = false, escapeCount = 0, escapeAt = 0, mediaError = '';
  const queue = [];
  let suppressed = false, escapeDownSeen = false;
  // 宿主显式选择优先于系统；模式变化立即同步，无需重启。
  const systemAppearance = matchMedia('(prefers-color-scheme: light)');
  let lastPayload;
  function appearance() {
    const root = document.documentElement;
    if (root.dataset.theme === 'light' || root.dataset.theme === 'dark') return root.dataset.theme;
    if (root.classList.contains('light')) return 'light';
    if (root.classList.contains('dark')) return 'dark';
    return systemAppearance.matches ? 'light' : 'dark';
  }
  function syncAppearance() {
    document.documentElement.dataset.neriAppearance = appearance();
    if (lastPayload) window.__codexPrism?.apply(lastPayload);
  }
  const appearanceObserver = new MutationObserver(syncAppearance);
  appearanceObserver.observe(document.documentElement, {attributes:true, attributeFilter:['class','data-theme']});
  systemAppearance.addEventListener('change', syncAppearance);
  syncAppearance();
  const css = `
html[data-codex-prism] {background:#101216!important}
html[data-codex-prism] body {background:transparent!important;isolation:isolate}
#codex-prism-stage {position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden;background:#101216}
#codex-prism-stage>* {width:100%;height:100%;object-fit:var(--cp-fit,cover);opacity:var(--cp-opacity,1)}
html[data-codex-prism] :where(#root,#app,[data-app-shell-frame],[data-app-shell-active-page],[data-app-shell-page-surface],[data-app-shell-main-surface],[data-app-shell-surface-backing]) {background:transparent!important}
html[data-codex-prism] [data-app-shell-frame] {--color-token-main-surface-primary:transparent;--color-token-main-surface-secondary:transparent;--color-background:transparent;--color-bg-primary:transparent}
html[data-codex-prism] [data-app-shell-main-surface] {background:var(--cp-glass)!important;backdrop-filter:blur(var(--cp-blur,0px));-webkit-backdrop-filter:blur(var(--cp-blur,0px))}
html[data-codex-prism] [data-app-shell-main-surface] [data-sticky][data-expand-search],
html[data-codex-prism] [data-app-shell-main-surface] [data-sticky][data-expand-search]::before,
html[data-codex-prism] [data-app-shell-main-surface] [data-sticky][data-expand-search]::after {background:transparent!important;box-shadow:none!important}
html[data-codex-prism] [data-app-shell-page-surface] {--app-shell-content-fade:none!important}
html[data-codex-prism] [data-app-shell-main-surface] [class*="--app-shell-content-fade"] {background-image:none!important}
html[data-codex-prism] [data-app-shell-main-surface] .pointer-events-none.absolute:has([data-thread-scroll-footer])::before,
html[data-codex-prism] [data-app-shell-main-surface] .pointer-events-none.absolute:has([data-thread-scroll-footer])::after {background:none!important;box-shadow:none!important}
html[data-codex-prism] :is([data-app-shell-sidebar],[data-testid="sidebar"],aside) {background:var(--cp-glass)!important;backdrop-filter:blur(var(--cp-blur))}
/* 侧栏只绘制一层玻璃；外层 aside 不再叠加同样的背景和模糊。 */
html[data-codex-prism] aside:has(#app-shell-sidebar) {background:transparent!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}
html[data-codex-prism] :is(pre,[role="dialog"],[role="menu"],[data-radix-popper-content-wrapper]) {background:var(--cp-card,#202124f5)!important}
html[data-codex-prism] :is([data-user-message-bubble],[data-markdown-text-style="assistant-message"]:not(:empty),[data-composer-surface-variant]) {backdrop-filter:blur(var(--cp-blur,0px)) saturate(115%)!important;-webkit-backdrop-filter:blur(var(--cp-blur,0px)) saturate(115%)!important;color:var(--cp-message-text)!important;box-shadow:inset 0 0 0 1px var(--cp-message-edge),inset 0 1px 0 #ffffff0a,0 6px 20px #00000014!important}
html[data-codex-prism] [data-user-message-bubble] {background:var(--cp-user-glass)!important}
html[data-codex-prism] [data-markdown-text-style="assistant-message"]:not(:empty) {background:var(--cp-reply-glass)!important;border-radius:16px;padding:14px 18px;margin-block:4px;min-width:0}
html[data-codex-prism] [data-composer-surface-variant] {background:var(--cp-input-glass)!important}
html[data-codex-prism] [data-composer-surface-variant]:focus-within {box-shadow:inset 0 0 0 1px var(--cp-focus-edge),0 8px 24px #00000020!important}
#codex-prism-button {position:relative;display:flex;align-items:center;justify-content:center;width:36px;height:36px;flex:0 0 36px;border:1px solid #ffffff18;border-radius:10px;background:transparent;color:#EDE6F0;padding:6px;cursor:pointer;-webkit-app-region:no-drag}
#codex-prism-button::before {content:'';width:24px;height:24px;background:var(--neri-settings-icon) center/contain no-repeat;border-radius:0;pointer-events:none}
#codex-prism-button:hover{background:#e87da622}
#codex-prism-button[aria-pressed="true"]{background:rgba(243,139,194,.18)}
#codex-prism-button[aria-pressed="true"]::after{content:"";position:absolute;left:-1px;top:9px;width:3px;height:18px;border-radius:3px;background:#F38BC2;box-shadow:0 0 8px #F38BC2;pointer-events:none}
#codex-prism-button[hidden]{display:none!important}
html[data-codex-prism] [data-codex-prism-provider-label] {display:none!important}
/* NERI_THEME_CSS */
`;
  // Codex displays the custom model provider name beneath the account header.
  function hideProviderLabel() {
    for (const label of document.querySelectorAll('[role="menu"] [role="menuitem"].cursor-default.select-text.text-codex-description')) {
      label.toggleAttribute('data-codex-prism-provider-label', label.textContent.trim() === '晚照云');
    }
  }
  const providerLabelObserver = new MutationObserver(hideProviderLabel);
  providerLabelObserver.observe(document.documentElement, {childList:true, subtree:true, characterData:true});
  hideProviderLabel();
  function mount() {
    /* NERI_FRAME_SCRIPT */
    /* NERI_COMPOSER_SCRIPT */
    frame=window.__neriFrame.element;
    if (!stage?.isConnected) { stage = document.createElement('div'); stage.id = 'codex-prism-stage'; stage.setAttribute('aria-hidden','true'); document.body.prepend(stage); }
    if (!style?.isConnected) { style = document.createElement('style'); style.textContent = css; document.head.append(style); }
    if (!button?.isConnected) {
      button = document.createElement('button'); button.id = 'codex-prism-button'; button.setAttribute('aria-label','音理主题与壁纸设置');
      button.title = '打开壁纸设置 · Shift+点击开关壁纸 · Ctrl+Alt+W · 连按四次 Esc 恢复';
      button.onclick = e => e.shiftKey ? queue.push('toggle') : togglePanel(); 
    }
    const rail=document.querySelector('[data-app-navigation-rail]');
    const more=rail&&[...rail.querySelectorAll('button')].find(e=>e.getAttribute('data-slot')==='popover-trigger');
    const group=more?.parentElement||rail?.querySelector('[data-appearance]');
    if(group&&button.parentElement!==group){if(more)more.after(button);else group.append(button);}
  }
  function clear() { window.__neriComposerBorder?.update('',false); clearInterval(slideTimer); stage?.replaceChildren(); current = ''; mediaError = ''; document.documentElement.removeAttribute('data-codex-prism'); }
  function togglePanel(){if(window.__codexPrismPanel)window.__codexPrismPanel.toggle();else queue.push('studio');}
  function key(e) {
    if(e.key==='Escape'&&e.type==='keydown')escapeDownSeen=true;
    if (e.ctrlKey && e.altKey && e.code === 'KeyW') { e.preventDefault(); e.stopImmediatePropagation(); togglePanel(); return; }
    if(e.key==='Escape' && window.__codexPrismPanel?.isOpen){e.preventDefault();e.stopImmediatePropagation();window.__codexPrismPanel.close();escapeCount=0;return;}
    if ((e.ctrlKey && e.altKey && e.shiftKey && e.code === 'KeyR') || (e.key === 'Escape' && (++escapeCount >= 4) && Date.now()-escapeAt < 1600)) {
      suppressed = true; clear(); queue.push('disable');
    }
    if (e.key === 'Escape') { if (Date.now()-escapeAt >= 1600) escapeCount = 1; escapeAt = Date.now(); }
  }
  function visibility() {
    const video = stage?.querySelector('video');
    if (!video) return;
    if (document.hidden || !enabled) video.pause(); else if (!window.__codexPrism.paused) video.play().catch(() => {});
  }
  // Codex consumes Escape keydown before renderer listeners; keyup still reaches us.
  function panelKeyUp(e){if(e.key!=='Escape')return;if(!escapeDownSeen)key(e);escapeDownSeen=false;}
  window.addEventListener('keydown',key,true); window.addEventListener('keyup',panelKeyUp,true); document.addEventListener('visibilitychange',visibility);
  window.__codexPrism = {
    paused: false,
    apply(p) {
      if (!document.body) return;
      lastPayload = p;
      document.documentElement.dataset.neriAppearance = appearance();
      mount();
      window.__neriComposerBorder.update(p.neriAssetBase,p.enabled && !suppressed);
      // 只定位聊天页右上角工具栏，保留原生按钮、Tooltip 和点击事件。
      const topIcons={
        more:'button:is([aria-label="聊天操作"],[aria-label="Chat actions"],[aria-label="More options"])',
        share:'button:is([aria-label="分享"],[aria-label="Share"])',
        list:'button[data-thread-summary-panel-toggle]',
        panel:'button[data-app-shell-workspace-layout-toggle="main"]',
      };
      for(const [name,selector] of Object.entries(topIcons)) {
        for(const e of document.querySelectorAll('[data-app-shell-titlebar] '+selector))e.setAttribute('data-neri-top-icon',name);
      }
      /* NERI_QUOTA_SCRIPT */
      // 只有“新聊天”文本按钮缺少稳定标记；按可访问名称补充装饰标记，不改事件。
      for(const e of document.querySelectorAll('#app-shell-sidebar button')) {
        // 仅替换带文字的菜单项，保留“最近”标题旁的小型原生新聊天快捷按钮。
        e.toggleAttribute('data-neri-new-chat', /^(新聊天|New chat)$/.test(e.textContent.trim()));
        // 仅标记侧栏顶部模式按钮，保留可访问名称和原生菜单箭头。
        const modeLabel=e.getAttribute('aria-label')||'';
        const mode=/^(?:切换模式|Switch mode)/i.test(modeLabel) ? modeLabel.match(/ChatGPT|Codex/i)?.[0].toLowerCase() : null;
        if(mode) {
          e.setAttribute('data-neri-mode',mode);
          e.querySelector('svg[data-no-autosize]')?.parentElement.setAttribute('data-neri-wordmark-slot','');
        } else e.removeAttribute('data-neri-mode');
      }
      document.documentElement.toggleAttribute('data-neri-streaming', Boolean(document.querySelector('[data-composer-surface-variant] button:is([aria-label="停止"],[aria-label="Stop"])')));
      button.setAttribute('aria-pressed',String(Boolean(window.__codexPrismPanel?.isOpen)));
      button.setAttribute('aria-expanded',String(Boolean(window.__codexPrismPanel?.isOpen)));
      const nextSignature = JSON.stringify(p)+appearance();
      if (nextSignature === signature) return;
      signature = nextSignature;
      enabled = p.enabled;
      button.setAttribute('aria-pressed',String(Boolean(window.__codexPrismPanel?.isOpen)));
      button.dataset.enabled=String(enabled);
      if (!enabled) { window.__codexTypingEffects?.dispose(); suppressed = false; clear(); return; }
      if (suppressed) return;
      if (!p.url) return;
      const c = p.config || {};
      stage.style.setProperty('--cp-fit',c.fit === 'center' ? 'none' : c.fit || 'cover');
      stage.style.setProperty('--cp-opacity',c.mediaOpacity ?? 1);
      const light = appearance() === 'light';
      style.textContent = css + `html[data-codex-prism]{--cp-card:${light?'#f5f5f5f5':'#202124f5'};--cp-glass:rgba(${light?'247,249,252':'18,20,24'},${Math.max(.2,Math.min(.98,c.glassOpacity??.76))});--neri-opacity:${Math.max(.2,Math.min(.98,c.glassOpacity??.58))};--cp-blur:${Math.max(0,Math.min(40,c.glassBlur??16))}px;--cp-user-glass:${light?'rgba(239,244,250,.76)':'rgba(51,60,73,.68)'};--cp-reply-glass:${light?'rgba(250,251,253,.68)':'rgba(22,27,35,.58)'};--cp-input-glass:${light?'rgba(247,249,252,.76)':'rgba(33,39,49,.68)'};--cp-message-text:${light?'#17202c':'#f3f5f8'};--cp-message-edge:${light?'#ffffffb3':'#ffffff29'};--cp-focus-edge:${light?'#55678080':'#ffffff52'}}`;
      if(p.neriAssetBase) {
        const base=p.neriAssetBase.replace(/\/$/,'')+'/';
        // .mcp.json 的环境变量 CODEX_PRISM_NERI_OVERLAY_MODE=screen 可一键换滤色版。
        const mode=p.neriOverlayMode==='screen'?'screen':'transparent';
        const assets={'settings-icon':'plugin/neri_plugin_icon.svg','panel-ornament':'plugin/panel_header_ornament.svg','top-more':'navigation/top_more.svg','top-share':'navigation/top_share.svg','top-list':'navigation/top_list.svg','top-panel':'navigation/top_panel_right.svg','corner-tl':'border/corner_tl.svg','corner-tr':'border/corner_tr.svg','corner-bl':'border/corner_bl.svg','corner-br':'border/corner_br.svg','edge-horizontal':'border/edge_horizontal.svg','edge-vertical':'border/edge_vertical.svg','rail-home':'navigation/rail_home.svg','rail-cards':'navigation/rail_cards.svg','rail-tasks':'navigation/rail_tasks.svg','rail-explore':'navigation/rail_explore.svg','folder-open':'navigation/folder_open.svg','folder-closed':'navigation/folder_closed.svg','wordmark-codex':'wordmarks/codex_neri_wordmark.svg','wordmark-chatgpt':'wordmarks/chatgpt_neri_wordmark.svg',overlay:'overlays/transparent/neri-overlay-transparent.png',lace:'overlays/transparent/neri-lace-transparent.png',divider:'overlays/transparent/neri-divider-transparent.png',trim:'overlays/transparent/neri-composer-trim-transparent.png',bow:'icons/icon-bow.png',cat:'icons/icon-cat.png','cat-clean':'icons/icon-cat-clean.png',hairpin:'icons/icon-hairpin.png','white-bow':'icons/icon-white-bow.png',notebook:'icons/icon-notebook.png',line:'icons/icon-line.png'};
        style.textContent+=':root{--neri-overlay-blend:'+(mode==='screen'?'screen':'normal')+';'+Object.entries(assets).map(([key,path])=>'--neri-'+key+':url('+JSON.stringify(base+path.replaceAll('transparent',mode))+');').join('')+'}';
      }
      if (current !== p.url) {
        clearInterval(slideTimer); current = p.url;
        const media = document.createElement(p.kind === 'video' ? 'video' : 'img');
        mediaError = '';
        media.onerror = () => { mediaError = '壁纸加载失败，请选择其他文件或检查应用文件访问权限'; };
        if (p.kind === 'video') { media.autoplay = true; media.loop = !(c.rotationEnabled && c.rotationTrigger === 'videoEnd'); media.muted = true; media.playsInline = true; media.onended=()=>queue.push('ended'); }
        else { media.alt = ''; media.onload = () => document.documentElement.setAttribute('data-codex-prism',''); }
        if (p.kind === 'video') media.onloadeddata = () => document.documentElement.setAttribute('data-codex-prism','');
        media.src = p.url; stage.replaceChildren(media);
        if (p.slides?.length > 1) { let i=0; slideTimer=setInterval(()=>{media.src=p.slides[++i%p.slides.length];},Math.max(1000,(c.pictureSlideSeconds||30)*1000)); }
      }
      this.paused = Boolean(c.paused);
      const video=stage.querySelector('video');
      if(video) { video.loop=!(c.rotationEnabled && c.rotationTrigger==='videoEnd'); video.playbackRate=c.playbackRate||1; video.muted=c.audioEnabled!==true; video.volume=Math.max(0,Math.min(1,c.volume??.5)); if(c.paused)video.pause();else visibility(); }
    },
    drain() { const actions=queue.splice(0); if(mediaError)actions.push('error:'+mediaError); return actions; },
    destroy() { window.__neriComposerBorder?.destroy(); appearanceObserver.disconnect(); systemAppearance.removeEventListener('change',syncAppearance); delete document.documentElement.dataset.neriAppearance; window.__neriFrame?.destroy(); window.__codexTypingEffects?.dispose(); window.__codexPrismQuota?.destroy(); providerLabelObserver.disconnect(); document.querySelectorAll('[data-neri-top-icon]').forEach(e=>e.removeAttribute('data-neri-top-icon')); document.querySelectorAll('[data-codex-prism-provider-label]').forEach(label => label.removeAttribute('data-codex-prism-provider-label')); clear(); window.__codexPrismPanel?.destroy(); stage?.remove(); frame?.remove(); style?.remove(); button?.remove(); window.removeEventListener('keydown',key,true); window.removeEventListener('keyup',panelKeyUp,true); document.removeEventListener('visibilitychange',visibility); delete window.__codexPrism; },
  };
})();
