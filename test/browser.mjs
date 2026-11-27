import {script as rendererScript, panelScript} from '../codex/bridge.mjs';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { mkdtemp,rm,mkdir,readFile,writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createCodexServer } from '../codex/server.mjs';
import { buildBuiltinAuroraSvg } from '../src/engine/runtime/web-shim.mjs';

const dataDir=await mkdtemp(join(tmpdir(),'prism-browser-'));
const shots=new URL('../artifacts/',import.meta.url);await mkdir(shots,{recursive:true});
const app=await createCodexServer({dataDir,connect:false});
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900},colorScheme:'dark'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
let checks=0;
async function check(condition){assert.ok(condition);checks++;}
try {
  await page.goto(app.studioUrl);await page.locator('.card').first().waitFor();
  await page.screenshot({path:fileURLToPath(new URL('01-studio.png',shots)),fullPage:true});
  await page.reload();await page.locator('.card').first().waitFor();await check(!(await page.locator('#error').textContent()));
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aB9sAAAAASUVORK5CYII=','base64');
  await page.locator('#upload').setInputFiles({name:'browser-check.png',mimeType:'image/png',buffer:png});
  await page.getByRole('button',{name:/browser-check/}).waitFor();await page.getByRole('button',{name:/browser-check/}).click();
  await page.waitForFunction(()=>document.querySelector('.card.active')?.textContent.includes('browser-check'));await check(app.engine.getActiveItem().title.includes('browser-check'));
  await page.screenshot({path:fileURLToPath(new URL('02-upload-applied.png',shots)),fullPage:true});
  await page.locator('#opacity').fill('0.53');await page.locator('#opacity').dispatchEvent('change');await page.waitForFunction(()=>document.querySelector('#opacity-value').textContent==='53%');await check(app.engine.getConfig().glassOpacity===.53);
  await page.getByRole('button',{name:'恢复原界面'}).click();await page.getByRole('button',{name:'启用壁纸',exact:true}).waitFor();await check(!app.engine.getConfig().skinEnabled);
  await page.getByRole('button',{name:'启用壁纸',exact:true}).click();await page.getByRole('button',{name:'关闭壁纸',exact:true}).waitFor();await check(app.engine.getConfig().skinEnabled);
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:fileURLToPath(new URL('03-studio-mobile.png',shots)),fullPage:true});
  const fixture=await browser.newPage({viewport:{width:1280,height:850},colorScheme:'dark'});fixture.on('pageerror',e=>errors.push(e.message));
  await fixture.setContent(`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src app: blob: data: https:; media-src app: blob: data: https:; style-src 'unsafe-inline'"><style>body{margin:0;font:16px system-ui;color:#eee;background:#111}#root{height:100vh;display:flex}aside{width:230px;padding:24px;background:#202124}main{flex:1;padding:48px}article{max-width:650px;margin:100px auto}pre{padding:20px;border-radius:8px}h1{font-size:30px}</style><div id="root" data-app-shell-frame><nav data-app-navigation-rail><div data-appearance="plain"><button data-slot="popover-trigger">探索</button></div></nav><aside data-app-shell-sidebar>Codex<br><br>项目<br><br>Wallpaper Prism</aside><main data-app-shell-page-surface><article><h1>壁纸背景适配预览</h1><p>此页面用于验证背景层、玻璃透明度和恢复操作。</p><pre>代码与弹窗保持可读</pre><input aria-label="test-input" value="输入框仍可点击"></article></main></div>`);
  const inject=rendererScript;
  await fixture.evaluate(panelScript);
  await fixture.evaluate(inject);
  await fixture.evaluate(()=>{
    const backing=document.createElement('div');backing.dataset.appShellSurfaceBacking='true';
    backing.style.cssText='position:absolute;inset:0;background:rgb(13,17,23);z-index:-1';
    document.querySelector('#root').prepend(backing);
    const main=document.querySelector('main');
    const pageHeader=document.createElement('div');pageHeader.dataset.sticky='true';pageHeader.dataset.expandSearch='true';pageHeader.className='page-header-test';pageHeader.textContent='资料空间与插件页的共用页头';main.prepend(pageHeader);
    const fade=document.createElement('div');fade.className='top-fade --app-shell-content-fade';main.append(fade);
    const footer=document.createElement('div');footer.className='pointer-events-none absolute footer-test';footer.innerHTML='<div data-thread-scroll-footer="true"></div>';main.append(footer);
    const style=document.createElement('style');style.textContent='.page-header-test::before{content:"";position:absolute;inset:0;background:rgb(13,17,23);pointer-events:none}.page-header-test{position:relative}.top-fade{background-image:linear-gradient(#111,transparent)}.footer-test::before{content:"";background:linear-gradient(transparent,#111)}.footer-test::after{content:"";position:absolute;bottom:0;height:16px;background:rgb(13,17,23)}';document.head.append(style);
  });
  const payload={enabled:true,url:'data:image/svg+xml;base64,'+Buffer.from(buildBuiltinAuroraSvg()).toString('base64'),kind:'image',config:{glassOpacity:.53,glassBlur:16},slides:[]};
  await fixture.evaluate(p=>window.__codexPrism.apply(p),payload);await fixture.waitForFunction(()=>document.documentElement.hasAttribute('data-codex-prism'));
  // Current Codex paints a separate solid backing behind its main surface.
  // A visible wallpaper requires both a clear backing and a translucent main surface.
  await fixture.evaluate(()=>document.querySelector('main').setAttribute('data-app-shell-main-surface','default'));
  await check(await fixture.evaluate(()=>getComputedStyle(document.querySelector('[data-app-shell-surface-backing]')).backgroundColor==='rgba(0, 0, 0, 0)'));
  await check(await fixture.evaluate(()=>{const bg=getComputedStyle(document.querySelector('main')).backgroundColor;return bg==='rgba(18, 20, 24, 0.53)';}));
  await check(await fixture.evaluate(()=>getComputedStyle(document.querySelector('.top-fade')).backgroundImage==='none'));
  await check(await fixture.evaluate(()=>getComputedStyle(document.querySelector('.footer-test'),'::before').backgroundImage==='none'));
  await check(await fixture.evaluate(()=>getComputedStyle(document.querySelector('.footer-test'),'::after').backgroundColor==='rgba(0, 0, 0, 0)'));
  await check(await fixture.evaluate(()=>getComputedStyle(document.querySelector('.page-header-test'),'::before').backgroundColor==='rgba(0, 0, 0, 0)'));
  await fixture.getByRole('textbox').fill('still interactive');await check(await fixture.getByRole('textbox').inputValue()==='still interactive');
  await fixture.screenshot({path:fileURLToPath(new URL('04-host-fixture.png',shots)),fullPage:true});
  // 固定的本地 1 秒 VP8 测试色条，避免依赖无头浏览器的 canvas 录制支持。
  const videoBuffer=await readFile(new URL('./fixtures/playback.webm',import.meta.url));
  await page.locator('#upload').setInputFiles({name:'playback-check.webm',mimeType:'video/webm',buffer:videoBuffer});
  await page.getByRole('button',{name:/playback-check/}).click();await page.waitForFunction(()=>document.querySelector('.card.active')?.textContent.includes('playback-check'));
  await check(app.engine.getActiveItem().kind==='video');
  const vp={...payload,kind:'video',url:'data:video/webm;base64,'+videoBuffer.toString('base64')};
  await fixture.bringToFront();
  await fixture.evaluate(p=>window.__codexPrism.apply(p),vp);
  try { await fixture.waitForFunction(()=>document.querySelector('#codex-prism-stage video')?.currentTime>0); }
  catch(error) { console.error(await fixture.evaluate(()=>{const v=document.querySelector('#codex-prism-stage video');return {hidden:document.hidden,paused:v?.paused,ready:v?.readyState,error:v?.error?.message,time:v?.currentTime,bytes:v?.src.length};})); throw error; }
  await fixture.evaluate(p=>window.__codexPrism.apply({...p,config:{...p.config,paused:true}}),vp);await check(await fixture.evaluate(()=>document.querySelector('#codex-prism-stage video').paused));
  await fixture.locator('#codex-prism-button').click();await check(await fixture.evaluate(()=>window.__codexPrismPanel.isOpen));
  await fixture.evaluate(()=>window.__codexPrismPanel.update({enabled:true,config:{glassOpacity:.53,glassBlur:16,fit:'cover',rotationInterval:15,rotationOrder:'random',rotationTrigger:'interval'},items:[],title:'测试壁纸'}));
  const grip=fixture.locator('#codex-prism-floating').locator('#grip');
  const before=await grip.boundingBox();await fixture.mouse.move(before.x+40,before.y+20);await fixture.mouse.down();await fixture.mouse.move(before.x-80,before.y+60);await fixture.mouse.up();
  const after=await grip.boundingBox();await check(after.x<before.x&&after.y>before.y);
  await fixture.screenshot({path:fileURLToPath(new URL('08-floating-fixture.png',shots)),fullPage:true});
  await fixture.keyboard.press('Escape');await check(!(await fixture.evaluate(()=>window.__codexPrismPanel.isOpen)));
  await fixture.keyboard.press('Control+Alt+KeyW');await check(await fixture.evaluate(()=>window.__codexPrismPanel.isOpen));
  await fixture.getByRole('button',{name:'关闭壁纸设置',exact:true}).click();await check(!(await fixture.evaluate(()=>window.__codexPrismPanel.isOpen)));
  for(let i=0;i<4;i++)await fixture.keyboard.press('Escape');await check(!(await fixture.evaluate(()=>document.documentElement.hasAttribute('data-codex-prism'))));
  await check((await fixture.evaluate(()=>window.__codexPrism.drain())).includes('disable'));
  await fixture.evaluate(()=>window.__codexPrism.destroy());await check(await fixture.locator('#codex-prism-button').count()===0);
  await fixture.screenshot({path:fileURLToPath(new URL('05-host-restored.png',shots)),fullPage:true});
  console.log({errors}); await check(errors.length===0);
  const report={checks,failures:0,consoleErrors:errors,limitation:'Host DOM in this suite is a fixture; actual running Codex is checked separately by test/live-codex.mjs.'};
  await writeFile(new URL('browser-report.json',shots),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
} finally {await browser.close();await app.close();await rm(dataDir,{recursive:true,force:true});}
