import {CdpSession,listCdpTargets} from '../sidecars/prism_studio/cdp-bridge.mjs';
import {mkdirSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const artifacts=new URL('../artifacts/',import.meta.url);mkdirSync(artifacts,{recursive:true});
const target=(await listCdpTargets(9340)).find(t=>t.url==='app://-/index.html');
const session=await CdpSession.connect(target.webSocketDebuggerUrl);
async function capture(name){const s=await session.send('Page.captureScreenshot',{format:'png'});writeFileSync(new URL(name,artifacts),Buffer.from(s.data,'base64'));}
try{
  for(let i=0;i<50;i++){if(await session.evaluate('Boolean(document.querySelector("#codex-prism-stage video")?.readyState>=2)'))break;await new Promise(r=>setTimeout(r,150));}
  const geometry=await session.evaluate(`(()=>{const svg=document.querySelector('[data-neri-frame-lines]');const t=svg.querySelector('[data-frame-edge="top"]'),b=svg.querySelector('[data-frame-edge="bottom"]');return {sameGeometry:t.innerHTML===b.innerHTML,mirror:b.getAttribute('transform'),width:innerWidth,height:innerHeight,corner:parseFloat(getComputedStyle(document.querySelector('[data-neri-frame-piece="corner-tl"]')).width),clickThrough:[...document.querySelectorAll('#codex-prism-frame,#codex-prism-frame *')].every(e=>getComputedStyle(e).pointerEvents==='none'),effects:window.__codexTypingEffects.status(),videoReady:document.querySelector('#codex-prism-stage video').readyState>=2}})()`);
  assert.ok(geometry.sameGeometry&&geometry.clickThrough&&geometry.videoReady);assert.equal(geometry.effects.length,2);
  await capture('34-independent-theme.png');
  await session.evaluate(`(()=>{const s=document.createElement('style');s.id='neri-frame-pixel-test';s.textContent='body > *:not(#codex-prism-frame){visibility:hidden!important}#codex-prism-frame{mask-image:none!important;-webkit-mask-image:none!important}';document.head.append(s)})()`);
  await capture('frame-pixels.png');
  // 故意放回曾漏掉的错位：容器尺寸不变、内部图案偏移，像素检查必须拒绝。
  await session.evaluate(`document.querySelector('[data-frame-edge="top"]').setAttribute('transform','translate(2 0)')`);
  await capture('frame-pixels-misaligned.png');
  await session.evaluate(`document.querySelector('[data-frame-edge="top"]').removeAttribute('transform')`);
  writeFileSync(new URL('frame-geometry.json',artifacts),JSON.stringify(geometry,null,2));
  await session.send('Emulation.setDeviceMetricsOverride',{width:900,height:700,deviceScaleFactor:1,mobile:false});
  await session.evaluate('window.__neriFrame.layout()');await capture('frame-pixels-narrow.png');
  console.log(JSON.stringify(geometry));
}finally{
  await session.evaluate(`document.querySelector('#neri-frame-pixel-test')?.remove();document.querySelector('[data-frame-edge="top"]')?.removeAttribute('transform')`);
  await session.send('Emulation.clearDeviceMetricsOverride');session.close();
}
