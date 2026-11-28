import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {fileURLToPath} from 'node:url';
import {writeFileSync} from 'node:fs';
import {script} from '../codex/bridge.mjs';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1360,height:900},colorScheme:'dark'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
let checks=0;const check=(v,m)=>{assert.ok(v,m);checks++;};
const payload={enabled:true,kind:'image',neriAssetBase:'https://neri-assets.test/',url:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1" fill="%23322a45"/></svg>',config:{glassOpacity:.62,glassBlur:18}};
const geometry=()=>page.locator('#capsule').evaluate(e=>{
  const c=getComputedStyle(e),r=e.getBoundingClientRect();
  return {rect:r.toJSON(),background:c.backgroundColor,blur:c.backdropFilter,radius:c.borderRadius,overflow:c.overflow,shadow:c.boxShadow,old:[getComputedStyle(e,'::before').content,getComputedStyle(e,'::after').content],stitch:{border:getComputedStyle(e,'::before').borderTopStyle,inset:getComputedStyle(e,'::before').top,events:getComputedStyle(e,'::before').pointerEvents},pieces:[...e.querySelectorAll('.neri-composer-decor img')].map(i=>{const s=getComputedStyle(i),b=i.getBoundingClientRect();return {name:i.className,decoded:i.complete&&i.naturalWidth>0,width:s.width,height:s.height,fit:s.objectFit,events:s.pointerEvents,offset:[b.left-r.left,b.top-r.top,r.right-b.right,r.bottom-b.bottom]};})};
});
try{
  await page.route('https://neri-assets.test/**',route=>route.fulfill({path:fileURLToPath(new URL('../assets/neri-chatgpt-ui-assets/'+new URL(route.request().url()).pathname.slice(1),import.meta.url)),contentType:'image/svg+xml'}));
  await page.setContent('<style>body{margin:0;font:16px system-ui}main{padding:80px 24px}[data-composer-surface-variant]{max-width:860px;margin:40px auto;padding:12px;display:flex;gap:12px;align-items:center}textarea{flex:1;min-width:0;background:transparent;color:inherit;font:inherit;resize:vertical}button{width:32px;height:32px}</style><main data-app-shell-frame><div id="capsule" data-composer-surface-variant><button id="plus">+</button><textarea placeholder="输入消息"></textarea><button id="send" data-testid="send-button">↑</button></div></main>');
  await page.evaluate(script);await page.evaluate(p=>window.__codexPrism.apply(p),payload);
  await page.waitForFunction(()=>document.querySelectorAll('#capsule .neri-composer-decor img').length===6&&[...document.querySelectorAll('#capsule img')].every(i=>i.complete&&i.naturalWidth>0));
  const normal=await geometry();
  check(normal.pieces.length===6,'all six original SVGs decode');
  check(normal.radius==='24px'&&normal.overflow==='visible','outer capsule retains required geometry');
  check(normal.old[0]===String.fromCharCode(34,34)&&normal.old[1]==='none','v2 stitch replaces old outer outline and PNG');
  check(normal.stitch.border==='dashed'&&normal.stitch.inset==='4px','inner stitch has required inset');
  check(normal.stitch.events==='none','inner stitch permits clicks');
  for(const item of normal.pieces){check(item.decoded,'real SVG decoded');check(item.events==='none'&&item.fit==='contain','decoration cannot intercept and preserves ratio');}
  await page.evaluate(p=>window.__codexPrism.apply({...p,config:{glassOpacity:.25,glassBlur:0}}),payload);
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#capsule')).backgroundColor==='rgba(22, 21, 38, 0.25)');
  check((await geometry()).background==='rgba(22, 21, 38, 0.25)','SVG border keeps low opacity functional');
  check((await geometry()).blur.includes('blur(0px)'),'SVG border allows blur off');
  await page.evaluate(()=>document.documentElement.dataset.theme='light');
  await page.waitForFunction(()=>document.documentElement.dataset.neriAppearance==='light');
  await page.waitForFunction(()=>getComputedStyle(document.querySelector('#capsule')).backgroundColor==='rgba(255, 250, 254, 0.25)');
  check((await geometry()).background==='rgba(255, 250, 254, 0.25)','light SVG capsule follows same opacity');
  check(await page.locator('.neri-composer-decor').evaluate(e=>getComputedStyle(e).filter.includes('brightness(0.65)')),'light decoration has adapted contrast');
  await page.evaluate(p=>{document.documentElement.dataset.theme='dark';window.__codexPrism.apply(p);},payload);
  for(const width of [1360,700,390]){
    await page.setViewportSize({width,height:900});
    for(const height of [72,240]){
      await page.locator('#capsule').evaluate((e,h)=>e.style.minHeight=h+'px',height);
      const g=await geometry();check(g.rect.width<=width-48,'capsule fits viewport');
      for(const item of g.pieces.filter(i=>i.name.includes('corner'))){
        check(item.width==='96px'&&item.height==='72px','corner does not stretch in wide/narrow or multiline');
        const right=/neri-c-[tb]r/.test(item.name),bottom=/neri-c-b[lr]/.test(item.name);
        check(Math.abs(item.offset[right?2:0]+22)<=2&&Math.abs(item.offset[bottom?3:1]+22)<=2,'corner remains attached to rim');
      }
    }
  }
  await page.locator('textarea').fill('第一行\n第二行\n第三行');await page.locator('textarea').focus();await page.waitForTimeout(260);
  check((await geometry()).shadow.includes('224, 92, 168'),'real focus shows supplied pink glow');
  check(await page.locator('#plus').evaluate(e=>document.elementFromPoint(e.getBoundingClientRect().x+16,e.getBoundingClientRect().y+16)===e),'left button stays clickable');
  await page.locator('#send').click({trial:true});checks++;
  await page.screenshot({path:fileURLToPath(new URL('../artifacts/52-composer-narrow-multiline.png',import.meta.url))});
  await page.evaluate(()=>document.querySelector('#capsule .neri-composer-decor').remove());await page.waitForFunction(()=>document.querySelector('#capsule .neri-composer-decor'));
  check(await page.locator('#capsule .neri-composer-decor').count()===1,'React replacement recovers without duplicates');
  await page.evaluate(p=>window.__codexPrism.apply({...p,enabled:false}),payload);
  check(await page.locator('.neri-composer-decor').count()===0,'disable clears decorations');
  await page.evaluate(p=>window.__codexPrism.apply(p),payload);
  check(await page.locator('.neri-composer-decor').count()===1,'enable restores exactly one decoration');
  await page.evaluate(()=>window.__codexPrism.destroy());
  check(await page.locator('.neri-composer-wrap,.neri-composer-decor,[data-neri-composer-border]').count()===0,'unload restores original host');
  check(errors.length===0,'zero browser errors');
  writeFileSync(new URL('../artifacts/composer-border-report.json',import.meta.url),JSON.stringify({checks,failures:0,errors,normal},null,2));
  console.log(JSON.stringify({checks,failures:0,errors}));
}finally{await browser.close();}
