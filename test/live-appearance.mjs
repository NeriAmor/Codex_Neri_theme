import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9340');
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url()==='app://-/index.html');
const errors=[];const onError=e=>errors.push(e.message);page.on('pageerror',onError);
let checks=0,original;
const check=(v,m)=>{assert.ok(v,m);checks++;};
const report={};
async function click(locator){
  const box=await locator.boundingBox();assert.ok(box,'control visible');
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
  await page.waitForTimeout(120);await page.mouse.down();await page.mouse.up();
}
async function settings(){
  if(!await page.locator('#appearance-mode').isVisible()){
    const profile=page.getByRole('button',{name:'打开个人资料菜单',exact:true});
    if(await profile.getAttribute('aria-expanded')!=='true')await click(profile);
    await click(page.getByRole('menuitem',{name:/^设置/}).filter({visible:true}));
    await page.getByRole('button',{name:'外观',exact:true}).click();
    await page.locator('#appearance-mode').waitFor();
  }
}
async function mode(label){
  await settings();
  await click(page.getByRole('radio',{name:label,exact:true}).locator('..'));
  await page.waitForFunction(expected=>document.documentElement.dataset.neriAppearance===expected,label==='浅色'?'light':'dark');
}
async function chat(){
  await page.locator('button[data-sidebar-destination="builtin:home"]').filter({visible:true}).first().click();
  const thread=page.getByRole('button',{name:'修复 wallpaper 插件兼容性',exact:true});
  if(await thread.isVisible())await thread.click();
  await page.locator('[data-composer-surface-variant]').filter({visible:true}).last().waitFor();
}
const shot=name=>page.screenshot({path:fileURLToPath(new URL('../artifacts/'+name,import.meta.url))});
async function paint(){return page.evaluate(()=>{
  const get=s=>{const e=[...document.querySelectorAll(s)].filter(e=>e.getBoundingClientRect().width>0).pop();if(!e)return null;const c=getComputedStyle(e);const theme=[...document.querySelectorAll('style')].find(e=>e.textContent.includes('--neri-chrome'));const font=c.fontFamily,background=c.backgroundColor,color=c.color,blur=c.backdropFilter;theme.disabled=true;const nativeFont=getComputedStyle(e).fontFamily;theme.disabled=false;return {background,color,font,nativeFont,blur};};
  return {mode:document.documentElement.dataset.neriAppearance,ai:get('[data-markdown-text-style="assistant-message"]:not(:empty)'),user:get('[data-user-message-bubble]'),input:get('[data-composer-surface-variant]'),sidebar:get('#app-shell-sidebar'),video:document.getElementById('codex-prism-stage')?.querySelector('video')?.currentSrc};
});}
try{
  await page.bringToFront();await settings();
  original=await page.locator('input[name="appearance-theme"]:checked').getAttribute('aria-label');
  await mode('浅色');await shot('47-light-settings.png');await chat();
  report.light=await paint();
  for(const key of ['ai','user','input','sidebar']){
    check(Boolean(report.light[key]),key+' exists in real chat');
    check(Number(report.light[key].background.match(/[\d.]+/)[0])>220,key+' uses light glass');
    check(Number(report.light[key].color.match(/[\d.]+/)[0])<120,key+' uses dark text');
  }
  check(Boolean(report.light.video),'existing video wallpaper retained');
  check(await page.locator('[data-app-shell-frame]').filter({visible:true}).first().evaluate(e=>getComputedStyle(e).backgroundColor==='rgba(0, 0, 0, 0)'), 'real app frame stays transparent');
  await shot('48-light-chat.png');
  await page.getByRole('button',{name:'音理主题与壁纸设置',exact:true}).click();
  const panel=page.locator('#codex-prism-floating');await panel.waitFor();await page.waitForFunction(()=>document.getElementById('codex-prism-floating').shadowRoot.getElementById('notice').textContent.startsWith('已应用'));
  const panelPaint=await panel.locator('.neri-panel').evaluate(e=>({background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color}));
  check(Number(panelPaint.background.match(/[\d.]+/)[0])>220,'real shadow panel light');
  check(Number(panelPaint.color.match(/[\d.]+/)[0])<120,'real shadow panel text dark');
  await panel.locator('#search').fill('音理');
  check(await panel.locator('#search').inputValue()==='音理','panel search remains usable');
  await panel.locator('#search').fill('');await shot('49-light-panel.png');
  await panel.locator('#close').click();
  await mode('深色');await chat();report.dark=await paint();
  check(Number(report.dark.ai.background.match(/[\d.]+/)[0])<60,'native dark switch restores night glass');
  check(report.dark.input.font===report.dark.input.nativeFont && report.light.input.font===report.light.input.nativeFont,'both modes preserve their app-configured font');
  check(report.dark.video===report.light.video,'wallpaper unchanged across mode switch');
  await shot('50-dark-restored.png');
  check(errors.length===0,'no renderer errors');
  Object.assign(report,{checks,failures:0,errors});
  writeFileSync(new URL('../artifacts/live-appearance-report.json',import.meta.url),JSON.stringify(report,null,2));
  console.log(JSON.stringify({checks,failures:0,errors}));
}finally{
  try{
    if(original){await settings();await click(page.getByRole('radio',{name:original,exact:true}).locator('..'));await chat();}
    if(await page.locator('#codex-prism-floating').isVisible())await page.locator('#codex-prism-floating').locator('#close').click();
  }finally{page.off('pageerror',onError);await browser.close();}
}
