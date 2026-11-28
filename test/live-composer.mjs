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
  await page.bringToFront();
  const action=page.locator('[data-composer-surface-variant] button:has(> .icon-primary-action)').filter({visible:true}).last();
  const scroll=page.getByRole('button',{name:'滚动到底部',exact:true});
  await action.waitFor();await page.mouse.move(600,50);
  const capsule=await action.evaluate(button=>{
    const e=button.closest('[data-composer-surface-variant]'),c=getComputedStyle(e),r=e.getBoundingClientRect();
    const pieces=[...e.querySelectorAll('.neri-composer-decor img')].map(i=>{const css=getComputedStyle(i);return {name:i.className,ready:i.complete&&i.naturalWidth>0,width:css.width,height:css.height,fit:css.objectFit,events:css.pointerEvents,top:css.top,left:css.left,right:css.right,bottom:css.bottom};});
    return {position:c.position,overflow:c.overflow,pieces,trailing:[...e.querySelectorAll('[data-composer-trailing-controls]')].map(n=>getComputedStyle(n).backgroundColor),old:[getComputedStyle(e,'::before').content,getComputedStyle(e,'::after').content],stitch:{border:getComputedStyle(e,'::before').borderTopStyle,inset:getComputedStyle(e,'::before').top,events:getComputedStyle(e,'::before').pointerEvents},gap:innerHeight-Math.max(...[...e.querySelectorAll('.neri-composer-decor img')].map(i=>i.getBoundingClientRect().bottom)),containsControls:[...e.querySelectorAll('button,[contenteditable="true"]')].filter(x=>x.getBoundingClientRect().width>0).every(x=>{const b=x.getBoundingClientRect();return b.left>=r.left-1&&b.right<=r.right+1&&b.bottom<=r.bottom+1;})};
  });
  check(capsule.position==='relative'&&capsule.overflow==='visible','outer capsule allows decoration outside its bounds');
  check(capsule.trailing.length>0&&capsule.trailing.every(c=>c==='rgba(0, 0, 0, 0)'), 'native grey control strip is transparent');
  check(capsule.containsControls,'capsule contains editor and all left/right controls');
  check(capsule.old[0]===String.fromCharCode(34,34)&&capsule.old[1]==='none'&&capsule.stitch.border==='dashed'&&capsule.stitch.inset==='4px'&&capsule.stitch.events==='none','v2 inner stitch replaces old outline without intercepting clicks');
  check(capsule.pieces.length===6&&capsule.pieces.every(i=>i.ready),'all six bundled SVG images decode in real host');
  check(capsule.pieces.every(i=>i.events==='none'&&i.fit==='contain'),'decorations never intercept and retain aspect ratio');
  check(capsule.pieces.filter(i=>i.name.includes('corner')).every(i=>i.width==='96px'&&i.height==='72px'),'four corners remain fixed size');
  check(capsule.gap>14,'decorations stay above the full-window bottom edge');
  const expandedStyle=await page.evaluate(()=>{const s=document.createElement('style');s.id='neri-composer-size-test';s.textContent='[data-neri-composer-border]{min-height:240px!important}';document.head.append(s);return true;});
  try{
    check(await action.evaluate(e=>[...e.closest('[data-composer-surface-variant]').querySelectorAll('.neri-c-corner')].every(i=>getComputedStyle(i).width==='96px'&&getComputedStyle(i).height==='72px')),'expanded native capsule never stretches corner art');
    await page.screenshot({path:fileURLToPath(new URL('../artifacts/53-composer-expanded.png',import.meta.url))});
  }finally{await page.evaluate(()=>document.getElementById('neri-composer-size-test')?.remove());}
  const normal=await action.evaluate(e=>({background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e.querySelector('svg')).color,radius:getComputedStyle(e).borderRadius,label:e.getAttribute('aria-label')}));
  check(normal.background==='rgb(201, 74, 97)','primary action uses madder red');
  check((normal.color.match(/\d+/g)||[]).slice(0,3).every(v=>Number(v)>=220),'action icon remains light');
  check(normal.radius==='50%','primary action stays circular');
  await action.hover();
  for(let i=0;i<20;i++){if(await action.evaluate(e=>getComputedStyle(e).backgroundColor)==='rgb(223, 94, 117)')break;await page.waitForTimeout(50);}
  check(await action.evaluate(e=>getComputedStyle(e).backgroundColor)==='rgb(223, 94, 117)','hover uses the lighter theme red');
  // 只做点击命中检查，不启动语音、停止生成或发送内容。
  if(await action.isEnabled()){await action.click({trial:true});checks++;}
  else check(await action.evaluate(e=>{const r=e.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return e.disabled&&(hit===e||e.contains(hit));}),'empty native send stays disabled and its icon is not covered');
  check(await action.evaluate(e=>[...e.closest('[data-composer-surface-variant]').querySelectorAll('button')].filter(b=>b.getBoundingClientRect().width>0).every(b=>{const r=b.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return hit===b||b.contains(hit);})), 'all native button centres remain unobstructed');
  await page.mouse.move(600,50);
  scrollState=await page.evaluate(()=>{
    const host=[...document.querySelectorAll('[data-app-action-timeline-scroll]')].find(e=>e.getBoundingClientRect().width>0&&!e.closest('[inert]'));
    if(!host||host.scrollHeight-host.clientHeight<420)return null;
    const state={top:host.scrollTop,bottom:Math.abs(host.scrollHeight-host.clientHeight-host.scrollTop)<8};
    host.scrollTop=Math.max(0,host.scrollTop-400);return state;
  });
  let spacing={available:false,reason:'Current chat has no long scrollable timeline'};
  if(scrollState){
  await scroll.waitFor({state:'visible'});
  spacing=await scroll.evaluate(e=>{
    const margin=getComputedStyle(e).marginBottom,raised=e.getBoundingClientRect().y,original=e.getAttribute('style');
    e.style.setProperty('margin-bottom','0px','important');const nativeY=e.getBoundingClientRect().y;
    if(original===null)e.removeAttribute('style');else e.setAttribute('style',original);
    return {margin,movedUp:nativeY-raised,translate:getComputedStyle(e).translate};
  });
  check(spacing.margin==='10px','back-to-bottom receives 10px extra bottom spacing');
  check(spacing.movedUp>0,'additional spacing actually raises the button');
  check(spacing.translate.includes('50%'),'native horizontal centering retained');
  await scroll.click({trial:true});checks++;
  }
  await page.screenshot({path:fileURLToPath(new URL('../artifacts/25-trim-after.png',import.meta.url))});
  check(errors.length===0,'no renderer exceptions');
  const report={checks,failures:0,capsule,normal,spacing,errors,limitation:'Verified current native input and temporary expanded container; scroll spacing only when the current chat has enough messages; did not change draft text, send messages, activate voice or stop generation.'};
  writeFileSync(new URL('../artifacts/composer-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
} finally {
  if(scrollState)await page.evaluate(state=>{const host=[...document.querySelectorAll('[data-app-action-timeline-scroll]')].find(e=>e.getBoundingClientRect().width>0&&!e.closest('[inert]'));if(host)host.scrollTop=state.bottom?host.scrollHeight:state.top;},scrollState);
  page.off('pageerror',onError);await browser.close();
}
