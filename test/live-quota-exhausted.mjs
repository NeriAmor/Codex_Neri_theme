import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {CdpSession,listCdpTargets} from '../sidecars/prism_studio/cdp-bridge.mjs';

const target=(await listCdpTargets(9340)).find(t=>t.url==='app://-/index.html');
assert.ok(target,'No running application debug connection');
const session=await CdpSession.connect(target.webSocketDebuggerUrl);
let checks=0,backup;
const check=(a,b)=>{assert.deepEqual(a,b);checks++;};
const wait=()=>new Promise(r=>setTimeout(r,100));
const read=()=>session.evaluate(`(()=>{const b=document.querySelector('button[aria-label="用量"],button[aria-label="Usage"]'),s=b.querySelector('[data-neri-quota]'),r=s.getBoundingClientRect();return{state:s.dataset.quotaState,mark:!!s.querySelector('[data-quota-part="exhausted-mark"]'),native:b.querySelectorAll('svg:not([data-neri-quota])').length,rect:{x:r.x,y:r.y,width:r.width,height:r.height},pointer:getComputedStyle(s).pointerEvents}})()`);
async function shot(name){
 const clip=await session.evaluate(`(()=>{const r=document.querySelector('button[aria-label="用量"],button[aria-label="Usage"]').getBoundingClientRect();return{x:Math.max(0,r.x-10),y:Math.max(0,r.y-10),width:r.width+20,height:r.height+20,scale:2}})()`);
 const image=await session.send('Page.captureScreenshot',{format:'png',clip});writeFileSync(new URL('../artifacts/'+name,import.meta.url),Buffer.from(image.data,'base64'));
}
try{
 backup=await session.evaluate(`(()=>{const b=document.querySelector('button[aria-label="用量"],button[aria-label="Usage"]');return{description:b.getAttribute('aria-description'),title:b.getAttribute('title')}})()`);
 const original=await read();check(original.state,'normal');await shot('44-live-quota-normal.png');
 await session.evaluate(`document.querySelector('button[aria-label="用量"],button[aria-label="Usage"]').setAttribute('aria-description','5 小时用量：剩余 0%；每周用量：剩余 70%')`);await wait();
 const exhausted=await read();check(exhausted.state,'exhausted');check(exhausted.mark,true);check(exhausted.native,original.native);check(exhausted.rect,original.rect);check(exhausted.pointer,'none');await shot('45-live-quota-exhausted.png');
 const point=await session.evaluate(`(()=>{const r=document.querySelector('button[aria-label="用量"],button[aria-label="Usage"]').getBoundingClientRect();return{x:r.x+r.width/2,y:r.y+r.height/2}})()`);
 await session.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});await session.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});await wait();
 check(await session.evaluate(`document.querySelector('button[aria-label="用量"],button[aria-label="Usage"]').getAttribute('aria-expanded')`),'true');
 await session.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await session.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
 await session.evaluate(`document.querySelector('button[aria-label="用量"],button[aria-label="Usage"]').setAttribute('aria-description','5 小时用量：剩余 80%；每周用量：剩余 0%')`);await wait();check((await read()).state,'exhausted');
 await session.evaluate(`(()=>{const b=document.querySelector('button[aria-label="用量"],button[aria-label="Usage"]');b.setAttribute('aria-description','5 小时用量：剩余 80%；每周用量：剩余 70%');b.setAttribute('title','已达到使用上限')})()`);await wait();check((await read()).state,'exhausted');
 await session.evaluate(`document.querySelector('button[aria-label="用量"],button[aria-label="Usage"]').removeAttribute('title')`);await wait();check((await read()).state,'normal');
 const report={checks,failures:0,menuInExhaustedState:true,zeroLayoutShift:true,realQuotaUnchanged:true,note:'Temporary DOM display attributes only; original attributes restored in finally.'};
 writeFileSync(new URL('../artifacts/live-quota-exhausted-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{
 if(backup)await session.evaluate(`(()=>{const b=document.querySelector('button[aria-label="用量"],button[aria-label="Usage"]');for(const [key,value] of Object.entries(${JSON.stringify({'aria-description':backup.description,title:backup.title})})){if(value===null)b.removeAttribute(key);else b.setAttribute(key,value)}window.__codexPrismQuota.sync()})()`);
 session.close();
}
