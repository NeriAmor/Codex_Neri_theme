import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9340');
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url()==='app://-/index.html');
const errors=[];const onError=e=>errors.push(e.message);page.on('pageerror',onError);
let checks=0;
try {
 const surfaces=[['user','[data-user-message-bubble]'],['assistant','[data-markdown-text-style="assistant-message"]:not(:empty)'],['composer','[data-composer-surface-variant]']];
 const results=[];
 for(const [name,selector]of surfaces){
  const element=page.locator(selector).filter({visible:true}).last();await element.waitFor();
  const paint=await element.evaluate(e=>{const c=getComputedStyle(e);return {background:c.backgroundColor,blur:c.backdropFilter,shadow:c.boxShadow,color:c.color}});
  assert.match(paint.blur,/blur\(/,`${name} must soften wallpaper behind it`);checks++;
  const alpha=Number(paint.background.match(/,\s*([\d.]+)\)$/)?.[1]);
  assert.ok(alpha>=.45&&alpha<=(name==='composer'?.9:.8),`${name} must separate text while retaining wallpaper translucency`);checks++;
  assert.notEqual(paint.shadow,'none',`${name} needs a visible edge`);checks++;
  results.push({name,...paint});
 }
 await page.screenshot({path:fileURLToPath(new URL('../artifacts/12-glass-after.png',import.meta.url))});
 assert.deepEqual(errors,[]);checks++;
 const report={checks,failures:0,results,errors};writeFileSync(new URL('../artifacts/glass-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
} finally {page.off('pageerror',onError);await browser.close();}
