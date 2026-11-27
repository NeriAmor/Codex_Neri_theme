import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {script, panelScript} from '../codex/bridge.mjs';
import {mkdir,writeFile} from 'node:fs/promises';

const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1360,height:900},colorScheme:'dark'});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
const paint=()=>page.evaluate(()=>{
  const read=(e)=>{const c=getComputedStyle(e);return {background:c.backgroundColor,color:c.color,shadow:c.textShadow,blur:c.backdropFilter,font:c.fontFamily};};
  const root=document.documentElement;
  const panel=document.getElementById('codex-prism-floating').shadowRoot;
  return {mode:root.dataset.neriAppearance,ai:read(document.querySelector('[data-markdown-text-style]')),user:read(document.querySelector('[data-user-message-bubble]')),input:read(document.querySelector('[data-composer-surface-variant]')),sidebar:read(document.getElementById('app-shell-sidebar')),menu:read(document.querySelector('[role=menu]')),panel:read(panel.querySelector('.neri-panel')),muted:read(panel.querySelector('.neri-subtitle')),selectScheme:getComputedStyle(panel.querySelector('select')).colorScheme,send:read(document.querySelector('[data-testid=send-button]')),stage:getComputedStyle(document.getElementById('codex-prism-stage'),'::after').backgroundImage};
});
const rgb=s=>s.match(/[\d.]+/g).map(Number);
const luminance=values=>values.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
const contrast=(fg,bg,wallpaper)=>{
  const f=luminance(rgb(fg)), b=rgb(bg), a=b[3]??1;
  const l=luminance(b.slice(0,3).map(v=>v*a+wallpaper*(1-a)));
  return (Math.max(f,l)+.05)/(Math.min(f,l)+.05);
};
const report={};
try{
  await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});
  await page.setContent(`<style>body{margin:0;font:16px 'Segoe UI',sans-serif}#root{display:flex;height:100vh}aside{width:220px}main{flex:1;padding:48px}article{max-width:860px;margin:auto}[data-composer-surface-variant]{padding:20px}#codex-prism-floating{left:24px;top:80px}</style><div id="root" data-app-shell-frame data-app-shell-application-menu-bar><aside id="app-shell-sidebar">最近的会话</aside><main data-app-shell-main-surface><article><div data-user-message-bubble>浅色模式的音理主题</div><div data-markdown-text-style="assistant-message">柔白淡紫的玻璃，保留壁纸与正文的可读性。<a href="#">链接</a><pre>const neri = '星光';</pre></div><div data-composer-surface-variant><button>+</button><textarea placeholder="输入消息"></textarea><button data-testid="send-button">↑</button></div><div role="menu">模型菜单</div></article></main></div>`);
  await page.evaluate(panelScript);await page.evaluate(script);
  await page.evaluate(()=>window.__codexPrism.apply({enabled:true,kind:'image',url:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><rect width="8" height="8" fill="%2332264a"/></svg>',config:{glassOpacity:.55,glassBlur:11}}));
  await page.waitForFunction(()=>document.documentElement.hasAttribute('data-codex-prism'));
  await page.evaluate(()=>{window.__codexPrismPanel.toggle();window.__codexPrismPanel.update({enabled:true,config:{glassOpacity:.55,glassBlur:11},items:[]});});
  report.dark=await paint();
  check(report.dark.mode==='dark','system dark resolved');
  check(rgb(report.dark.ai.background)[0]<60,'dark reply retains night palette');
  await page.evaluate(()=>document.documentElement.dataset.theme='light');
  await page.waitForFunction(()=>document.documentElement.dataset.neriAppearance==='light');
  report.light=await paint();
  check(await page.locator('#root').evaluate(e=>getComputedStyle(e).backgroundColor==='rgba(0, 0, 0, 0)'), 'menu marker on shell cannot mask wallpaper');
  for(const name of ['ai','user','input','sidebar','menu','panel']){
    const c=report.light[name];
    check(rgb(c.background)[0]>220,`${name} becomes a light surface`);
    check(rgb(c.color)[0]<120,`${name} has dark text`);
    check(contrast(c.color,c.background,0)>=4.5,`${name} text passes AA over black wallpaper`);
  }
  check(contrast(report.light.muted.color,report.light.panel.background,0)>=4.5,'panel secondary text passes AA');
  check(report.light.selectScheme==='light','native select uses light menu');
  check(report.light.ai.shadow==='none','light text has no dark halo');
  check(report.light.input.blur.includes('11px'),'user blur retained');
  check(report.light.send.background==='rgb(201, 74, 97)','send stays crimson');
  check(report.light.stage.includes('249, 244, 252'),'wallpaper veil turns soft white');
  check(report.light.ai.font===report.dark.ai.font,'app font preserved');
  await page.locator('textarea').fill('浅色模式可以输入');
  check(await page.locator('textarea').inputValue()==='浅色模式可以输入','decorations permit input');
  await page.screenshot({path:fileURLToPath(new URL('../artifacts/46-light-fixture.png',import.meta.url))});
  await page.evaluate(()=>{document.documentElement.dataset.theme='dark';document.documentElement.classList.add('light');});
  await page.waitForFunction(()=>document.documentElement.dataset.neriAppearance==='dark');
  check((await paint()).ai.background===report.dark.ai.background,'explicit dark beats stale light class');
  await page.evaluate(()=>{delete document.documentElement.dataset.theme;document.documentElement.className='light';});
  await page.waitForFunction(()=>document.documentElement.dataset.neriAppearance==='light');
  check((await paint()).ai.background===report.light.ai.background,'light class supported');
  await page.evaluate(()=>document.documentElement.className='');
  await page.emulateMedia({colorScheme:'light'});
  await page.waitForFunction(()=>document.documentElement.dataset.neriAppearance==='light');
  check((await paint()).panel.background===report.light.panel.background,'system light updates open shadow panel');
  await page.emulateMedia({colorScheme:'dark'});
  await page.waitForFunction(()=>document.documentElement.dataset.neriAppearance==='dark');
  check((await paint()).panel.background===report.dark.panel.background,'system dark restores panel');
  await page.evaluate(()=>window.__codexPrism.destroy());
  check(await page.evaluate(()=>!document.documentElement.hasAttribute('data-neri-appearance')&&!document.documentElement.hasAttribute('data-codex-prism')),'disable removes appearance state');
  check(errors.length===0,'zero browser errors');
  Object.assign(report,{checks,failures:0,errors});
  await writeFile(new URL('../artifacts/appearance-report.json',import.meta.url),JSON.stringify(report,null,2));
  console.log(JSON.stringify({checks,failures:0,errors}));
}finally{await browser.close();}
