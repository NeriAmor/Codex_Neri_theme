import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {quotaIconScript} from '../codex/quota-icon.mjs';

const shots=new URL('../artifacts/',import.meta.url);mkdirSync(shots,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:560,height:220}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
let checks=0;
const check=(actual,expected)=>{assert.deepEqual(actual,expected);checks++;};
const progress='<svg viewBox="0 0 32 32"><g><path pathLength="100" stroke-dashoffset="5" d="M5 9A12 12 0 0 1 27 9"/></g><g><path pathLength="100" stroke-dashoffset="30" d="M5 20A12 12 0 0 0 27 20"/></g></svg>';
const warning='<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" stroke-dasharray="1 3"/><path d="M16 9v9m0 3v1"/></svg>';
const state=()=>page.locator('#usage [data-neri-quota]').getAttribute('data-quota-state');
const waitState=expected=>page.waitForFunction(expected=>document.querySelector('#usage [data-neri-quota]')?.dataset.quotaState===expected,expected);
async function shot(name){await page.screenshot({path:fileURLToPath(new URL(name,shots))});}
try{
 await page.setContent(`<html data-codex-prism><style>body{background:#171423;color:#ede6f0;font:16px 'Segoe UI';padding:35px}button{background:#241e34;border:1px solid #ffffff18;border-radius:12px;padding:20px}#slot{position:relative;display:inline-flex;width:28px;height:28px}svg{width:28px;height:28px}p{display:inline-block;margin-left:20px}</style><button id="usage" aria-label="Usage" aria-description="5 hours remaining 95%; weekly remaining 70%"><span id="slot">${progress}</span></button><p>Neri · quota status</p></html>`);
 await page.addStyleTag({content:readFileSync(new URL('../codex/neri-theme.css',import.meta.url),'utf8')});
 await page.evaluate(quotaIconScript);await waitState('normal');
 const geometry=await page.locator('#usage [data-neri-quota]').boundingBox();
 check(await state(),'normal');check(await page.locator('#slot > svg:not([data-neri-quota])').count(),1);await shot('42-quota-normal.png');
 await page.locator('#usage').evaluate(b=>b.setAttribute('aria-description','5 小时用量：剩余 0%；每周用量：剩余 70%'));await waitState('exhausted');
 check(await page.locator('#usage [data-quota-part="exhausted-mark"]').count(),1);
 check(await page.locator('#usage [data-neri-quota]').boundingBox(),geometry);await shot('43-quota-exhausted.png');
 await page.locator('#usage').evaluate(b=>b.setAttribute('aria-description','5 小时用量：剩余 95%；每周用量：剩余 0%'));await waitState('exhausted');check(await state(),'exhausted');
 await page.locator('#usage').evaluate(b=>b.setAttribute('aria-description','5 hours remaining -1%; weekly remaining 70%'));await waitState('exhausted');check(await state(),'exhausted');
 await page.locator('#usage').evaluate(b=>b.setAttribute('aria-description','5 hours remaining 95%; weekly remaining 70%'));await waitState('normal');check(await state(),'normal');
 await page.locator('#usage').evaluate(b=>{b.removeAttribute('aria-description');b.querySelector('path[pathLength]').setAttribute('stroke-dashoffset','100');});await waitState('exhausted');check(await state(),'exhausted');
 await page.locator('#usage').evaluate(b=>b.querySelector('path[pathLength]').setAttribute('stroke-dashoffset','5'));await waitState('normal');check(await state(),'normal');
 await page.locator('#usage').evaluate(b=>{b.setAttribute('aria-describedby','quota-tip');const t=document.createElement('div');t.id='quota-tip';t.textContent='已达到使用上限';document.body.append(t);});await waitState('exhausted');check(await state(),'exhausted');
 await page.locator('#quota-tip').evaluate(t=>t.firstChild.data='5 hours remaining 95%; weekly remaining 70%');await waitState('normal');check(await state(),'normal');
 await page.locator('#usage').evaluate((b,warning)=>{b.removeAttribute('aria-describedby');b.querySelector('svg:not([data-neri-quota])').outerHTML=warning;},warning);await waitState('exhausted');check(await state(),'exhausted');
 await page.locator('#usage').evaluate(b=>{b.setAttribute('aria-description','5 hours remaining 50%; weekly remaining 50%');});await waitState('exhausted');check(await state(),'exhausted');
 await page.evaluate(()=>{const b=document.querySelector('#usage').cloneNode(true);b.id='second';b.querySelector('#slot').removeAttribute('id');b.querySelector('[data-neri-quota]').remove();document.body.append(b);});
 await page.waitForFunction(()=>document.querySelectorAll('[data-neri-quota]').length===2);
 check(await page.evaluate(()=>{const ids=[...document.querySelectorAll('[data-neri-quota] [id]')].map(e=>e.id);return ids.length===new Set(ids).size;}),true);
 check(await page.evaluate(()=>[...document.querySelectorAll('[data-neri-quota] [fill],[data-neri-quota] [stroke],[data-neri-quota] [filter]')].every(n=>[...n.attributes].every(a=>[...a.value.matchAll(/url\(#([^)]+)\)/g)].every(m=>document.getElementById(m[1])?.closest('[data-neri-quota]')===n.closest('[data-neri-quota]'))))),true);
 await page.locator('#usage').evaluate((b,progress)=>{b.querySelector('svg:not([data-neri-quota])').outerHTML=progress;},progress);await waitState('normal');check(await state(),'normal');
 await page.evaluate(()=>{document.querySelector('#usage').onclick=()=>window.quotaClicked=true;});await page.locator('#usage').click();check(await page.evaluate(()=>window.quotaClicked),true);
 check(await page.locator('#usage [data-neri-quota]').evaluate(svg=>getComputedStyle(svg).pointerEvents),'none');
 await page.locator('#usage').evaluate(b=>{b.removeAttribute('aria-description');b.querySelector('svg:not([data-neri-quota])').outerHTML='<svg><circle cx="16" cy="16" r="12" stroke-dasharray="1 3"/></svg>';});
 await page.waitForFunction(()=>!document.querySelector('#usage [data-neri-quota]'));check(await page.locator('#usage [data-neri-quota]').count(),0);
 await page.evaluate(()=>window.__codexPrismQuota.destroy());check(await page.locator('[data-neri-quota]').count(),0);check(await page.locator('[data-neri-quota-slot]').count(),0);
 check(errors,[]);writeFileSync(new URL('quota-exhausted-report.json',shots),JSON.stringify({checks,failures:0,errors},null,2));console.log(JSON.stringify({checks,failures:0,errors}));
}finally{await browser.close();}
