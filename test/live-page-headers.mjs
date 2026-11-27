import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const browser=await chromium.connectOverCDP('http://127.0.0.1:9340');
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url()==='app://-/index.html');
assert.ok(page,'Actual Codex main window is required');
const results=[],errors=[];
const onError=e=>errors.push(e.message);
const onConsole=message=>{if(message.type()==='error')errors.push(message.text());};
page.on('pageerror',onError);
page.on('console',onConsole);
try{
  await page.bringToFront();
  await page.evaluate(()=>window.__codexPrismPanel?.close());
  for(const [destination,name]of [['space','space'],['customize','plugins']]){
    await page.locator(`[data-sidebar-destination="builtin:${destination}"]`).click();
    const headers=page.locator('[data-app-shell-main-surface] [data-sticky][data-expand-search]').filter({visible:true});
    await headers.first().waitFor({state:'visible'});
    // 跨应用页可能重建 document；等待桥接重新注入和壁纸首帧加载。
    await page.waitForFunction(()=>document.documentElement.hasAttribute('data-codex-prism'));
    const paints=await headers.evaluateAll(elements=>elements.map(e=>({
      background:getComputedStyle(e).backgroundColor,
      before:getComputedStyle(e,'::before').backgroundColor,
      beforeImage:getComputedStyle(e,'::before').backgroundImage,
      after:getComputedStyle(e,'::after').backgroundColor,
    })));
    const screenshot=`artifacts/11-${name}-header-fixed.png`;
    await page.screenshot({path:fileURLToPath(new URL('../'+screenshot,import.meta.url))});
    results.push({page:name,headers:paints,screenshot});
  }
  for(const result of results){
    assert.ok(result.headers.length>0,`${result.page} needs a visible page header`);
    for(const header of result.headers){
      assert.equal(header.background,'rgba(0, 0, 0, 0)',`${result.page} header background`);
      assert.equal(header.before,'rgba(0, 0, 0, 0)',`${result.page} header backing`);
      assert.equal(header.beforeImage,'none',`${result.page} header gradient`);
      assert.equal(header.after,'rgba(0, 0, 0, 0)',`${result.page} header after layer`);
    }
  }
  assert.deepEqual(errors,[]);
  const report={pages:results.length,failures:0,pageErrors:errors,results};
  writeFileSync(new URL('../artifacts/page-headers-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{
  page.off('pageerror',onError);
  page.off('console',onConsole);
  await page.locator('[data-sidebar-destination="builtin:home"]').click().catch(()=>{});
  await browser.close();
}
