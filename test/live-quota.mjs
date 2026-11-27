import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {CdpSession,listCdpTargets} from '../sidecars/prism_studio/cdp-bridge.mjs';

const target=(await listCdpTargets(9340)).find(t=>t.url==='app://-/index.html');
const session=await CdpSession.connect(target.webSocketDebuggerUrl);
try {
  const report=await session.evaluate(`(async()=>{
    const button=document.querySelector('button[aria-label="用量"],button[aria-label="Usage"]');
    const native=button.querySelector('svg:has(path[pathLength])');
    const paths=[...native.querySelectorAll('path[pathLength]')];
    const description=button.getAttribute('aria-description');
    const originalOffsets=paths.map(p=>p.getAttribute('stroke-dashoffset'));
    const group=paths[0].parentElement,oldStyle=group.getAttribute('style');
    const wait=()=>new Promise(r=>setTimeout(r,80));
    const read=()=>{const svg=button.querySelector('[data-neri-quota]');return {
      five:Number(svg.style.getPropertyValue('--quota-5h')),week:Number(svg.style.getPropertyValue('--quota-week')),
      state:svg.dataset.quotaState,
      zeroOpacity:svg.querySelector('[data-quota-part="arc-5h-fill"]')?.style.opacity||null,
      fiveOffset:svg.querySelector('[data-quota-part="arc-5h-fill"]')?getComputedStyle(svg.querySelector('[data-quota-part="arc-5h-fill"]')).strokeDashoffset:null,
      focus:svg.dataset.focus||'',pointer:getComputedStyle(svg).pointerEvents,
      nativeRetained:native.isConnected,nativeHidden:getComputedStyle(native).opacity==='0',
      size:getComputedStyle(svg).width,inline:svg.namespaceURI==='http://www.w3.org/2000/svg',
    }};
    let clone;
    const result={original:read()};
    try {
      button.setAttribute('aria-description','5 小时用量：剩余 0%；每周用量：剩余 100%');await wait();result.zero=read();
      button.removeAttribute('aria-description');paths[0].setAttribute('stroke-dashoffset','25');paths[1].setAttribute('stroke-dashoffset','60');await wait();result.pathFallback=read();
      group.style.opacity='.3';await wait();result.focus=read().focus;
      clone=button.cloneNode(true);clone.removeAttribute('id');clone.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));
      clone.querySelectorAll('[data-neri-quota]').forEach(e=>e.remove());clone.style.cssText='position:fixed;left:-10000px';document.body.append(clone);await wait();
      const ids=[...document.querySelectorAll('[data-neri-quota] [id]')].map(e=>e.id);result.uniqueIds=ids.length===new Set(ids).size;result.instances=document.querySelectorAll('[data-neri-quota]').length;
    } finally {
      clone?.remove();
      if(description===null)button.removeAttribute('aria-description');else button.setAttribute('aria-description',description);
      paths.forEach((p,i)=>p.setAttribute('stroke-dashoffset',originalOffsets[i]));
      if(oldStyle===null)group.removeAttribute('style');else group.setAttribute('style',oldStyle);
      await wait();result.restored=read();
    }
    return result;
  })()`,{awaitPromise:true,timeoutMs:8000});
  assert.equal(report.original.inline,true);assert.equal(report.original.nativeRetained,true);assert.equal(report.original.nativeHidden,true);
  assert.equal(report.original.pointer,'none');assert.equal(report.original.size,'28px');
  assert.equal(report.zero.five,0);assert.equal(report.zero.week,100);assert.equal(report.zero.state,'exhausted');
  assert.equal(report.pathFallback.five,75);assert.equal(report.pathFallback.week,40);
  assert.equal(report.focus,'week');assert.equal(report.uniqueIds,true);assert.ok(report.instances>=2);
  assert.equal(report.restored.five,report.original.five);assert.equal(report.restored.week,report.original.week);
  const buttonPoint=await session.evaluate(`(()=>{const r=document.querySelector('button[aria-label="用量"],button[aria-label="Usage"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
  await session.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...buttonPoint});
  await session.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...buttonPoint});
  await new Promise(r=>setTimeout(r,150));
  report.menuOpened=await session.evaluate(`document.querySelector('button[aria-label="用量"],button[aria-label="Usage"]').getAttribute('aria-expanded')==='true'`);
  await session.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  await session.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
  assert.equal(report.menuOpened,true);
  writeFileSync(new URL('../artifacts/quota-report.json',import.meta.url),JSON.stringify(report,null,2));
  const shot=await session.send('Page.captureScreenshot',{format:'png'});
  writeFileSync(new URL('../artifacts/29-quota-neri.png',import.meta.url),Buffer.from(shot.data,'base64'));
  console.log(JSON.stringify(report,null,2));
} finally {session.close();}
