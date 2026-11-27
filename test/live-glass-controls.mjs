import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {fileURLToPath} from 'node:url';
import {writeFileSync} from 'node:fs';
import {serviceRequest} from '../codex/service-client.mjs';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9340');
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url()==='app://-/index.html');
const original=await serviceRequest('state');
const errors=[];page.on('pageerror',e=>errors.push(e.message));
let saved,checks=0;const report={};
const check=(v,m)=>{assert.ok(v,m);checks++;};
const panel=page.locator('#codex-prism-floating');
const snapshot=()=>page.evaluate(()=>{
  const surfaces={main:'[data-app-shell-main-surface]',sidebar:'#app-shell-sidebar',ai:'[data-markdown-text-style="assistant-message"]:not(:empty)',user:'[data-user-message-bubble]',input:'[data-composer-surface-variant]'};
  return Object.fromEntries(Object.entries(surfaces).map(([key,selector])=>{
    const e=[...document.querySelectorAll(selector)].filter(e=>e.getBoundingClientRect().width>0).pop();
    if(!e)return [key,null];const c=getComputedStyle(e);
    return [key,{background:c.backgroundColor,blur:c.backdropFilter}];
  }));
});
async function open(){if(!await panel.isVisible())await page.getByRole('button',{name:'音理主题与壁纸设置',exact:true}).click();await page.waitForFunction(()=>document.getElementById('codex-prism-floating').shadowRoot.getElementById('notice').textContent.startsWith('已应用'));}
async function set(opacity,blur){
  await open();
  for(const [id,steps]of [['opacity',Math.round((opacity-.2)*100)],['blur',blur]]){
    await panel.locator('#'+id).focus();await page.keyboard.press('Home');
    for(let i=0;i<steps;i++)await page.keyboard.press('ArrowRight');
  }
  await panel.locator('#blur').blur();
  for(let i=0;i<80;i++){
    const state=await serviceRequest('state');
    const notice=await panel.locator('#notice').textContent();
    if(Math.abs(state.config.glassOpacity-opacity)<.001&&state.config.glassBlur===blur&&notice.startsWith('已应用'))return;
    await page.waitForTimeout(150);
  }
  throw Error('真实滑块未同步到设置及界面');
}
const shot=name=>page.screenshot({path:fileURLToPath(new URL('../artifacts/'+name,import.meta.url))});
try{
  await page.bringToFront();
  await serviceRequest('config',{paused:true});
  saved=await page.evaluate(()=>({theme:document.documentElement.getAttribute('data-theme'),panel:window.__codexPrismPanel.isOpen,paused:document.querySelector('#codex-prism-stage video')?.paused}));
  await page.evaluate(()=>document.querySelector('#codex-prism-stage video')?.pause());
  for(const mode of ['dark','light']){
    await page.evaluate(mode=>document.documentElement.dataset.theme=mode,mode);
    await page.waitForFunction(mode=>document.documentElement.dataset.neriAppearance===mode,mode);
    report[mode]=[];
    for(const [opacity,blur]of [[.25,0],[.45,12],[.85,40]]){
      await set(opacity,blur);const paint=await snapshot();
      for(const [name,value]of Object.entries(paint)){
        check(Boolean(value),name+' exists');
        const alpha=Number(value.background.match(/,\s*([\d.]+)\)$/)?.[1]);
        check(Math.abs(alpha-opacity)<.005,`${mode} ${name} opacity ${opacity}: ${value.background}`);
        check(value.blur.includes(`blur(${blur}px)`),`${mode} ${name} blur ${blur}: ${value.blur}`);
      }
      report[mode].push({opacity,blur,paint});
      await panel.locator('#close').click();await shot(`glass-${mode}-${opacity}.png`);
      await open();
      check(Number(await panel.locator('#opacity').inputValue())===opacity,'opacity survives reopening');
      check(Number(await panel.locator('#blur').inputValue())===blur,'blur survives reopening');
    }
  }
  // 固定不透明度与视频帧，单独查看聊天背景的模糊变化。
  await set(.45,0);await panel.locator('#close').click();await page.evaluate(()=>document.querySelector('#codex-prism-stage video')?.pause());await shot('glass-blur-clear.png');
  await set(.45,40);await panel.locator('#close').click();await page.evaluate(()=>document.querySelector('#codex-prism-stage video')?.pause());await shot('glass-blur-soft.png');
  check(errors.length===0,'no renderer errors');
  Object.assign(report,{checks,failures:0,errors});
  writeFileSync(new URL('../artifacts/glass-controls-report.json',import.meta.url),JSON.stringify(report,null,2));
  console.log(JSON.stringify({checks,failures:0,errors}));
}finally{
  await serviceRequest('config',{glassOpacity:original.config.glassOpacity,glassBlur:original.config.glassBlur,paused:original.config.paused});
  if(saved){await page.evaluate(saved=>{
    if(saved.theme===null)delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme=saved.theme;
    if(!saved.panel)window.__codexPrismPanel.close();
    if(saved.paused===false)document.querySelector('#codex-prism-stage video')?.play().catch(()=>{});
  },saved);}
  await browser.close();
}
