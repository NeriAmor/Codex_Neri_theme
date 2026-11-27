import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { join } from 'node:path';

const info=JSON.parse(readFileSync(join(homedir(),'.neri-desktop-theme/codex-server.json'),'utf8'));
const readState=async()=>await(await fetch(`http://127.0.0.1:${info.port}/api/state`,{headers:{'X-Prism-Token':info.token}})).json();
const browser=await chromium.connectOverCDP(`http://127.0.0.1:${info.debugPort}`);
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url()==='app://-/index.html');
assert.ok(page,'Codex main window is required');
const original=await readState();let checks=0;
const expect=condition=>{assert.ok(condition);checks++;};
try {
  await page.bringToFront();
  await page.evaluate(()=>window.__codexPrismPanel.close());
  const windowCount=browser.contexts().flatMap(c=>c.pages()).length;
  await page.locator('#codex-prism-button').click();
  const panel=page.locator('#codex-prism-floating');
  await panel.locator('.card').first().waitFor({timeout:12000});
  expect(await panel.isVisible());
  expect(browser.contexts().flatMap(c=>c.pages()).length===windowCount);
  const count=await panel.locator('.card').count();expect(count>0);
  await panel.locator('.card img').first().waitFor();
  await page.waitForFunction(()=>[...document.getElementById('codex-prism-floating').shadowRoot.querySelectorAll('.card img')].some(i=>i.naturalWidth>0));
  expect(await panel.locator('.card img').first().evaluate(i=>i.naturalWidth>0));
  await panel.locator('#search').fill('prism-test-no-match-98b3');expect(await panel.locator('.card').count()===0);
  await panel.locator('#search').fill('');expect(await panel.locator('.card').count()===count);
  const testOpacity=original.config.glassOpacity>=.97?.96:Math.round((original.config.glassOpacity+.01)*100)/100;
  await panel.locator('#opacity').fill(String(testOpacity));await panel.locator('#opacity').dispatchEvent('change');
  for(let i=0;i<50&&(await readState()).config.glassOpacity!==testOpacity;i++)await new Promise(r=>setTimeout(r,100));
  expect((await readState()).config.glassOpacity===testOpacity);
  await panel.locator('#opacity').fill(String(original.config.glassOpacity));await panel.locator('#opacity').dispatchEvent('change');
  for(let i=0;i<50&&(await readState()).config.glassOpacity!==original.config.glassOpacity;i++)await new Promise(r=>setTimeout(r,100));
  expect((await readState()).config.glassOpacity===original.config.glassOpacity);
  const box=await panel.locator('#grip').boundingBox();
  await page.mouse.move(box.x+40,box.y+20);await page.mouse.down();await page.mouse.move(box.x-100,box.y+60,{steps:8});await page.mouse.up();
  const moved=await panel.locator('#grip').boundingBox();expect(moved.x<box.x&&moved.y>box.y);
  const sizeBefore=await panel.boundingBox();
  await page.mouse.move(sizeBefore.x+sizeBefore.width-4,sizeBefore.y+sizeBefore.height-4);await page.mouse.down();await page.mouse.move(sizeBefore.x+sizeBefore.width-64,sizeBefore.y+sizeBefore.height-64,{steps:8});await page.mouse.up();
  const sizeAfter=await panel.boundingBox();expect(sizeAfter.width<sizeBefore.width&&sizeAfter.height<sizeBefore.height);
  await page.keyboard.press('Escape');expect(!(await panel.isVisible()));
  await page.keyboard.press('Control+Alt+KeyW');await panel.waitFor({state:'visible'});expect(await panel.isVisible());
  await panel.getByRole('button',{name:'关闭壁纸设置',exact:true}).click();expect(!(await panel.isVisible()));
  await page.locator('#codex-prism-button').click();await panel.waitFor({state:'visible'});
  await page.screenshot({path:fileURLToPath(new URL('../artifacts/10-real-floating-settings.png',import.meta.url))});
  expect(await panel.locator('iframe').count()===0);
  const report={checks,failures:0,wallpapers:count,verified:'Actual Codex: in-app panel, no new browser window, library search, persisted opacity edit and restore, drag, Escape/close button/hotkey reopen.'};
  writeFileSync(new URL('../artifacts/live-floating-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{
  if((await readState()).config.glassOpacity!==original.config.glassOpacity){
    await fetch(`http://127.0.0.1:${info.port}/api/config`,{method:'POST',headers:{'X-Prism-Token':info.token,'Content-Type':'application/json'},body:JSON.stringify({glassOpacity:original.config.glassOpacity})});
  }
  await browser.close();
}
