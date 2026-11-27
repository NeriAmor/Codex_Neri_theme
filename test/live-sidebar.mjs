import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9340');
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url()==='app://-/index.html');
const errors=[];const onError=e=>errors.push(e.message);page.on('pageerror',onError);
let checks=0;const check=(value,message)=>{assert.ok(value,message);checks++;};
const projectSelector='[data-app-action-sidebar-section-heading="Projects"] [data-app-action-sidebar-section-toggle]';
const menu=page.locator('#app-shell-sidebar [data-neri-new-chat]').filter({visible:true});
const project=page.locator(projectSelector).filter({visible:true});
const original=await project.getAttribute('aria-expanded');
try {
  await menu.waitFor();
  const paint=await page.evaluate(projectSelector=>{
    const visible=s=>[...document.querySelectorAll(s)].find(e=>e.getBoundingClientRect().width>0&&!e.closest('[inert]'));
    const menu=visible('#app-shell-sidebar [data-neri-new-chat]'),project=visible(projectSelector);
    const slot=menu.querySelector(':scope > :first-child > :first-child:has(svg)'),icon=getComputedStyle(slot),pre=getComputedStyle(project,'::before');
    return {svgHidden:[...menu.querySelectorAll('svg'),...project.querySelectorAll('svg')].every(e=>getComputedStyle(e).display==='none'),menuBackground:getComputedStyle(menu).backgroundColor,menuBorder:getComputedStyle(menu).borderTopColor,menuImage:icon.backgroundImage,menuIconWidth:icon.width,menuIconHeight:icon.height,projectImage:pre.backgroundImage,projectIconWidth:pre.width,projectIconHeight:pre.height,projectEvents:pre.pointerEvents,menuAfter:getComputedStyle(menu,'::after').content,projectAfter:getComputedStyle(project,'::after').content,menuTextX:menu.querySelector(':scope > :first-child > :last-child').getBoundingClientRect().x,projectTextX:project.querySelector(':scope > span').getBoundingClientRect().x,menuGap:getComputedStyle(slot.parentElement).columnGap,projectGap:getComputedStyle(project).columnGap};
  },projectSelector);
  check(paint.svgHidden,'custom menu items must hide their native SVGs');
  check(paint.menuBackground==='rgba(40, 32, 58, 0.75)','new chat uses dark star-night background');
  check(paint.menuBorder==='rgba(232, 125, 166, 0.35)','new chat uses fine pink-purple edge');
  check(paint.menuImage.includes('icon-bow.png'),'bow occupies native leading icon slot');
  check(paint.projectImage.includes('icon-notebook.png'),'project uses notebook leading icon');
  check([paint.menuIconWidth,paint.menuIconHeight,paint.projectIconWidth,paint.projectIconHeight].every(v=>Math.abs(parseFloat(v)-18)<.05),'both icons measure 18 by 18 CSS pixels');
  check(paint.menuAfter==='none'&&paint.projectAfter==='none','trailing duplicate decorations removed');
  check(Math.abs(paint.menuTextX-paint.projectTextX)<2,'menu labels share the same left baseline: '+JSON.stringify(paint));
  check(paint.menuGap===paint.projectGap,'icon-to-label gap follows native nav spacing');
  check(paint.projectEvents==='none','project decoration does not intercept clicks');
  await menu.click({trial:true});checks++;
  await project.click();check((await project.getAttribute('aria-expanded'))!==original,'project still expands and collapses');
  await project.click();check((await project.getAttribute('aria-expanded'))===original,'project expansion restored');
  await menu.hover();
  const hover=await menu.evaluate(e=>getComputedStyle(e).boxShadow);
  check(hover!=='none','hover provides soft highlight');
  await page.mouse.move(600,50);
  await page.screenshot({path:fileURLToPath(new URL('../artifacts/21-sidebar-after.png',import.meta.url))});
  check(errors.length===0,'no renderer exceptions');
  const report={checks,failures:0,paint,errors};writeFileSync(new URL('../artifacts/sidebar-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
} finally {
  if(await project.getAttribute('aria-expanded')!==original)await project.click();
  page.off('pageerror',onError);await browser.close();
}
