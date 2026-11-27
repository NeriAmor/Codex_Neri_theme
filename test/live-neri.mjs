import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9340');
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url()==='app://-/index.html');
const session=await page.context().newCDPSession(page);
const errors=[];const onError=e=>errors.push(e.message);page.on('pageerror',onError);
let checks=0;const check=(condition,message)=>{assert.ok(condition,message);checks++;};
const report={};
try {
  const loaded=await page.evaluate(async()=>{
    const css=getComputedStyle(document.documentElement);
    return Promise.all(['overlay','lace','divider','trim','bow','cat','cat-clean','hairpin','white-bow','notebook','line','corner-tl','corner-tr','corner-bl','corner-br','edge-horizontal','edge-vertical'].map(async name=>{
      const url=css.getPropertyValue('--neri-'+name).trim().slice(4,-1).replace(/^"|"$/g,'');
      const image=new Image();image.src=url;try{await image.decode();return {name,width:image.naturalWidth,url};}catch{return {name,width:0,url};}
    }));
  });
  for(const item of loaded)check(item.width>0&&item.url.startsWith('app://fs/@fs/'),item.name+' must decode through native resource path');
  report.assets=loaded.map(({name,width})=>({name,width}));
  const paint=await page.evaluate(()=>{
    const visible=s=>[...document.querySelectorAll(s)].filter(e=>e.getBoundingClientRect().width>0).pop();
    const read=s=>{const e=visible(s);const c=getComputedStyle(e);return {background:c.backgroundColor,blur:c.backdropFilter,font:c.fontFamily,color:c.color,radius:c.borderRadius};};
    const overlay=getComputedStyle(document.querySelector('#codex-prism-frame'));
    const oldOverlay=getComputedStyle(document.body,'::after');
    const gradient=getComputedStyle(document.querySelector('#codex-prism-stage'),'::after');
    const titlebar=visible('[data-app-shell-titlebar]');
    const lace=getComputedStyle(titlebar,'::after');
    const trim=getComputedStyle(visible('[data-composer-surface-variant]'),'::after');
    const surfaces=['[data-codex-composer]','[data-markdown-text-style="assistant-message"]','#app-shell-sidebar [data-thread-title]'];
    const fonts=()=>surfaces.map(s=>getComputedStyle(visible(s)).fontFamily);
    const actualFonts=fonts();
    const theme=[...document.querySelectorAll('style')].find(e=>e.textContent.includes('--neri-chrome'));
    theme.disabled=true;const nativeFonts=fonts();theme.disabled=false;
    return {composer:read('[data-composer-surface-variant]'),assistant:read('[data-markdown-text-style="assistant-message"]:not(:empty)'),user:read('[data-user-message-bubble]'),overlay:overlay.pointerEvents,overlayOpacity:overlay.opacity,oldOverlay:oldOverlay.content,gradient:gradient.pointerEvents,gradientImage:gradient.backgroundImage,laceOpacity:lace.opacity,laceHeight:lace.height,trimOpacity:trim.opacity,actualFonts,nativeFonts,borders:['[data-composer-surface-variant]','[data-user-message-bubble]','[data-markdown-text-style="assistant-message"]:not(:empty)','#app-shell-sidebar'].map(s=>{const c=getComputedStyle(visible(s));return {color:c.borderTopColor,width:c.borderTopWidth};})};
  });
  check(paint.composer.background==='rgba(22, 21, 38, 0.88)','composer needs opaque violet background');
  check(paint.assistant.background==='rgba(27, 25, 46, 0.76)','assistant needs Neri glass');
  check(paint.user.background==='rgba(56, 39, 53, 0.8)','user needs warm violet glass');
  check(paint.composer.blur.includes('18px'),'glass blur active');
  check(paint.composer.radius==='24px','composer has 24px capsule corners');
  check(paint.assistant.color==='rgb(237, 230, 240)','body uses specified warm white');
  check(JSON.stringify(paint.actualFonts)===JSON.stringify(paint.nativeFonts),'theme preserves app-configured fonts in composer, body and sidebar');
  check(Number(paint.overlayOpacity)>=.65&&Number(paint.overlayOpacity)<=.9,'SVG edge opacity follows asset guidance');
  check(paint.oldOverlay==='none','old full-screen frame removed');
  check(Number(paint.laceOpacity)<.35&&parseFloat(paint.laceHeight)<=6,'header lace stays small and faint');
  check(Number(paint.trimOpacity)===.4,'composer retains subtle trim');
  check(paint.gradientImage.includes('0.42')&&paint.gradientImage.match(/0\.15/g)?.length===2,'mask darkens the center symmetrically');
  for(const edge of paint.borders){const alpha=Number(edge.color.match(/,\s*([\d.]+)\)$/)?.[1]);check(parseFloat(edge.width)===0||(alpha>=.08&&alpha<=.14),'container edge must stay subtle or absent: '+edge.color);}
  check(paint.overlay==='none'&&paint.gradient==='none','full-screen decorations never intercept input');
  report.paint=paint;
  // 最坏情况按纯白壁纸合成透明底，验证主文字和输入栏辅助文字。
  const luminance=rgb=>rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((a,v,i)=>a+v*[.2126,.7152,.0722][i],0);
  const contrast=(fg,bg,a)=>{const f=luminance(fg),b=luminance(bg.map(v=>v*a+255*(1-a)));return (Math.max(f,b)+.05)/(Math.min(f,b)+.05);};
  report.contrast={assistant:contrast([237,230,240],[27,25,46],.76),user:contrast([237,230,240],[56,39,53],.8),composerMuted:contrast([169,159,184],[22,21,38],.88)};
  for(const [key,value]of Object.entries(report.contrast))check(value>=4.5,key+' meets AA even over white wallpaper');
  const layout=await page.evaluate(()=>{
    const visible=s=>[...document.querySelectorAll(s)].find(e=>e.getBoundingClientRect().width>0);
    const column=visible('[data-thread-user-message-navigation-content]'),composer=visible('[data-thread-composer-backdrop]');
    return {viewport:innerWidth,column:column.getBoundingClientRect().toJSON(),composer:composer.getBoundingClientRect().toJSON(),maxWidth:getComputedStyle(column).maxWidth,left:getComputedStyle(column).marginLeft,right:getComputedStyle(column).marginRight};
  });
  check(layout.maxWidth==='860px','chat width capped at 860 CSS pixels');
  check(Math.abs(parseFloat(layout.right)-parseFloat(layout.left))<2,'wide chat is centered');
  report.desktop=layout;
  const composer=page.locator('[data-codex-composer]').filter({visible:true}).last();
  await composer.click();check(await composer.evaluate(e=>e===document.activeElement),'decoration permits input focus');
  check(await page.locator('[data-composer-surface-variant]').filter({visible:true}).last().evaluate(e=>getComputedStyle(e).boxShadow.includes('232, 125, 166')),'focus shows pink halo');
  await composer.evaluate(e=>e.blur());
  await page.screenshot({path:fileURLToPath(new URL('../artifacts/18-neri-refined-desktop.png',import.meta.url))});
  await session.send('Emulation.setDeviceMetricsOverride',{width:1000,height:850,deviceScaleFactor:1,mobile:false});
  const narrow=await page.evaluate(()=>{
    const e=[...document.querySelectorAll('[data-thread-composer-backdrop]')].find(e=>e.getBoundingClientRect().width>0),c=getComputedStyle(e);return {left:parseFloat(c.marginLeft),right:parseFloat(c.marginRight),width:e.getBoundingClientRect().width};
  });
  check(Math.abs(narrow.left-narrow.right)<2,'narrow chat is centered');
  check(narrow.width<=860,'narrow composer fits');report.narrow=narrow;
  await page.screenshot({path:fileURLToPath(new URL('../artifacts/19-neri-refined-narrow.png',import.meta.url))});
  check(errors.length===0,'no renderer exceptions');
  report.checks=checks;report.failures=0;report.errors=errors;
  writeFileSync(new URL('../artifacts/neri-report.json',import.meta.url),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
} finally {await session.send('Emulation.clearDeviceMetricsOverride');await session.detach();page.off('pageerror',onError);await browser.close();}
