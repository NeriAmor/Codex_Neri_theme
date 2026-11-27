import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { CdpSession, listCdpTargets } from '../sidecars/prism_studio/cdp-bridge.mjs';
import { selectCodexTargets } from '../codex/bridge.mjs';

const info=JSON.parse(readFileSync(join(homedir(),'.neri-desktop-theme','codex-server.json'),'utf8'));
const state=await (await fetch(`http://127.0.0.1:${info.port}/api/state`,{headers:{'X-Prism-Token':info.token}})).json();
const all=await listCdpTargets(info.debugPort);
let checks=0,windows=0;
for(const target of selectCodexTargets(all)){
  const session=await CdpSession.connect(target.webSocketDebuggerUrl);
  try{
    await session.send('Page.bringToFront');
    let actual;
    for(let attempt=0;attempt<50;attempt++){
      actual=await session.evaluate(`(()=>{const main=document.querySelector('[data-app-shell-main-surface]');if(!main)return null;const backing=document.querySelector('[data-app-shell-surface-backing]'),media=document.querySelector('#codex-prism-stage video,#codex-prism-stage img');return{enabled:document.documentElement.hasAttribute('data-codex-prism'),main:getComputedStyle(main).backgroundColor,backing:backing?getComputedStyle(backing).backgroundColor:null,kind:media?.tagName,url:media?.currentSrc,ready:media?.tagName==='VIDEO'?media.readyState:media?.naturalWidth,buttons:document.querySelectorAll('#codex-prism-button').length}})()`);
      if(!actual || (actual.enabled && actual.ready>=2))break;
      await new Promise(resolve=>setTimeout(resolve,200));
    }
    if(!actual)continue;
    assert.equal(actual.enabled,true);checks++;
    assert.equal(actual.backing,'rgba(0, 0, 0, 0)');checks++;
    const alpha=Number(actual.main.match(/,\s*([\d.]+)\)$/)?.[1]);
    assert.ok(alpha>0&&alpha<1&&Math.abs(alpha-state.effectiveConfig.glassOpacity)<.01);checks++;
    assert.match(actual.url,/^app:\/\/fs\/@fs\//);checks++;
    assert.ok(actual.ready>=2);checks++;
    assert.equal(actual.buttons,1);checks++;
    const fades=await session.evaluate(`(()=>{const main=document.querySelector('[data-app-shell-main-surface]');const top=main.querySelector('[class*="--app-shell-content-fade"]');const footer=main.querySelector('.pointer-events-none.absolute:has([data-thread-scroll-footer])');return{top:top?getComputedStyle(top).backgroundImage:'none',bottom:footer?getComputedStyle(footer,'::before').backgroundImage:'none',bottomFill:footer?getComputedStyle(footer,'::after').backgroundColor:'rgba(0, 0, 0, 0)'}})()`);
    assert.equal(fades.top,'none');checks++;
    assert.equal(fades.bottom,'none');checks++;
    assert.equal(fades.bottomFill,'rgba(0, 0, 0, 0)');checks++;
    const screenshot=await session.send('Page.captureScreenshot',{format:'png'});
    writeFileSync(new URL('../artifacts/07-real-codex-fixed.png',import.meta.url),Buffer.from(screenshot.data,'base64'));
    windows++;
  }finally{session.close();}
}
assert.ok(windows>0,'No actual Codex main window verified');
for(const target of all.filter(t=>t.type==='page'&&/avatar-overlay/.test(t.url))){
  const s=await CdpSession.connect(target.webSocketDebuggerUrl);
  try{assert.equal(await s.evaluate('Boolean(window.__codexPrism)'),false);checks++;}finally{s.close();}
}
const report={checks,failures:0,windows,mainOpacity:state.effectiveConfig.glassOpacity,verified:'Actual running Codex: native media decoding, clear backing, translucent main surface, no top/bottom gradient strips, single control, avatar overlay excluded.'};
writeFileSync(new URL('../artifacts/live-codex-report.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
