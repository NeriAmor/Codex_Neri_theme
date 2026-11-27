import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9340');
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url()==='app://-/index.html');
const errors=[];const onError=e=>errors.push(e.message);page.on('pageerror',onError);
let checks=0;const check=(v,m)=>{assert.ok(v,m);checks++;};
let scrollState;
try {
  const action=page.locator('[data-composer-surface-variant] button:has(> .icon-primary-action)').filter({visible:true}).last();
  const scroll=page.getByRole('button',{name:'滚动到底部',exact:true});
  await action.waitFor();await page.mouse.move(600,50);
  const capsule=await action.evaluate(button=>{
    const e=button.closest('[data-composer-surface-variant]'),c=getComputedStyle(e),ring=getComputedStyle(e,'::before'),trim=getComputedStyle(e,'::after'),r=e.getBoundingClientRect();
    return {position:c.position,overflow:c.overflow,ring:{top:parseFloat(ring.top),bottom:parseFloat(ring.bottom),left:parseFloat(ring.left),right:parseFloat(ring.right),events:ring.pointerEvents},trim:{height:parseFloat(trim.height),bottom:parseFloat(trim.bottom),events:trim.pointerEvents},containsControls:[...e.querySelectorAll('button,[data-codex-composer]')].filter(x=>x.getBoundingClientRect().width>0).every(x=>{const b=x.getBoundingClientRect();return b.left>=r.left-1&&b.right<=r.right+1&&b.bottom<=r.bottom+1;})};
  });
  check(capsule.position==='relative'&&capsule.overflow==='visible','outer capsule allows decoration outside its bounds');
  check(capsule.containsControls,'capsule contains editor and all left/right controls');
  check(Math.abs(capsule.ring.top+3)<.05&&Math.abs(capsule.ring.bottom+3)<.05&&Math.abs(capsule.ring.left+6)<.05&&Math.abs(capsule.ring.right+6)<.05,'CSS outline surrounds the capsule with 3px/6px clearance');
  check(capsule.trim.height<=5.05&&capsule.trim.bottom<0,'PNG is confined to a thin strip at the outer bottom edge');
  check(capsule.ring.events==='none'&&capsule.trim.events==='none','decorative outline and trim never intercept controls');
  const normal=await action.evaluate(e=>({background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e.querySelector('svg')).color,radius:getComputedStyle(e).borderRadius,label:e.getAttribute('aria-label')}));
  check(normal.background==='rgb(201, 74, 97)','primary action uses madder red');
  check((normal.color.match(/\d+/g)||[]).slice(0,3).every(v=>Number(v)>=220),'action icon remains light');
  check(normal.radius==='50%','primary action stays circular');
  await action.hover();
  check(await action.evaluate(e=>getComputedStyle(e).backgroundColor)==='rgb(223, 94, 117)','hover uses the lighter theme red');
  // 只做点击命中检查，不启动语音、停止生成或发送内容。
  await action.click({trial:true});checks++;
  await page.mouse.move(600,50);
  scrollState=await page.evaluate(()=>{
    const host=[...document.querySelectorAll('[data-app-action-timeline-scroll]')].find(e=>e.getBoundingClientRect().width>0&&!e.closest('[inert]'));
    const state={top:host.scrollTop,bottom:Math.abs(host.scrollHeight-host.clientHeight-host.scrollTop)<8};
    host.scrollTop=Math.max(0,host.scrollTop-400);return state;
  });
  await scroll.waitFor({state:'visible'});
  const spacing=await scroll.evaluate(e=>{
    const margin=getComputedStyle(e).marginBottom,raised=e.getBoundingClientRect().y,original=e.getAttribute('style');
    e.style.setProperty('margin-bottom','0px','important');const nativeY=e.getBoundingClientRect().y;
    if(original===null)e.removeAttribute('style');else e.setAttribute('style',original);
    return {margin,movedUp:nativeY-raised,translate:getComputedStyle(e).translate};
  });
  check(spacing.margin==='10px','back-to-bottom receives 10px extra bottom spacing');
  check(spacing.movedUp>0,'additional spacing actually raises the button');
  check(spacing.translate.includes('50%'),'native horizontal centering retained');
  await scroll.click({trial:true});checks++;
  await page.screenshot({path:fileURLToPath(new URL('../artifacts/25-trim-after.png',import.meta.url))});
  check(errors.length===0,'no renderer exceptions');
  const report={checks,failures:0,capsule,normal,spacing,errors,limitation:'Verified the current primary-action state; did not send text, activate voice or stop generation.'};
  writeFileSync(new URL('../artifacts/composer-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
} finally {
  if(scrollState)await page.evaluate(state=>{const host=[...document.querySelectorAll('[data-app-action-timeline-scroll]')].find(e=>e.getBoundingClientRect().width>0&&!e.closest('[inert]'));if(host)host.scrollTop=state.bottom?host.scrollHeight:state.top;},scrollState);
  page.off('pageerror',onError);await browser.close();
}
