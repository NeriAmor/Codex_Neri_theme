import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {writeFileSync} from 'node:fs';
import {script} from '../codex/bridge.mjs';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1920,height:1080},colorScheme:'dark'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
let checks=0;const check=(v,m)=>{assert.ok(v,m);checks++;};
try{
  await page.route('https://neri-assets.test/**',r=>r.fulfill({path:fileURLToPath(new URL('../assets/neri-chatgpt-ui-assets/'+new URL(r.request().url()).pathname.slice(1),import.meta.url)),contentType:'image/svg+xml'}));
  await page.setContent('<style>body{margin:0;font:18px system-ui}[role=menubar]{height:46px;display:flex;gap:20px;padding-left:120px}button{font:inherit;background:transparent;color:inherit;border:0}#account{position:fixed;bottom:4px;left:14px}#account img{width:32px;height:32px}</style><main data-app-shell-frame><nav role="menubar"><button id="file">文件</button><button>编辑</button><button>视图</button><button>帮助</button></nav><button id="account" aria-label="打开个人资料菜单"><img alt="头像" src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'32\' height=\'32\'%3E%3Ccircle cx=\'16\' cy=\'16\' r=\'16\' fill=\'pink\'/%3E%3C/svg%3E"></button></main>');
  await page.evaluate(script);await page.evaluate(()=>{window.__fileClicks=0;document.getElementById('file').onclick=()=>window.__fileClicks++;window.__codexPrism.apply({enabled:true,kind:'image',neriAssetBase:'https://neri-assets.test/',url:'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/%3E',config:{glassOpacity:.62,glassBlur:18}});});
  await page.waitForFunction(()=>document.documentElement.hasAttribute('data-codex-prism'));
  for(const [width,height]of [[1920,1080],[900,700],[390,700]]){
    await page.setViewportSize({width,height});await page.evaluate(()=>window.__neriFrame.layout());
    const g=await page.evaluate(async()=>{
      const frame=document.getElementById('codex-prism-frame'),svg=frame.querySelector('svg');
      const corners=await Promise.all([...frame.querySelectorAll('[data-neri-frame-piece]')].map(async e=>{const c=getComputedStyle(e),url=c.backgroundImage.slice(4,-1).replace(/^"|"$/g,'');const img=new Image();img.src=url;await img.decode();return {width:parseFloat(c.width),height:parseFloat(c.height),natural:img.naturalWidth,url};}));
      return {corners,top:svg.querySelector('[data-frame-edge=top]').innerHTML,bottom:svg.querySelector('[data-frame-edge=bottom]').innerHTML,left:svg.querySelector('[data-frame-edge=left]').innerHTML,right:svg.querySelector('[data-frame-edge=right]').innerHTML,patterns:[...svg.querySelectorAll('pattern')].map(p=>[p.getAttribute('width'),p.getAttribute('height')]),controls:Number(frame.dataset.neriProtectedControls),mask:getComputedStyle(frame).maskImage,events:[frame,...frame.querySelectorAll('*')].every(e=>getComputedStyle(e).pointerEvents==='none')};
    });
    const size=Math.max(160,Math.min(240,width*.18));
    for(const c of g.corners){check(c.width===size&&c.height===size,'corners follow requested clamp');check(c.natural===320&&c.url.includes('/border-starlight/'),'real starlight corner resources decode');}
    check(g.top===g.bottom&&g.left===g.right,'opposite edges mirror identical artwork');
    check(JSON.stringify(g.patterns)===JSON.stringify([['400','36'],['36','400']]),'edge tiles keep original aspect ratios');
    check(g.controls===5&&g.mask.startsWith('url('),'menu text and avatar receive clearance');
    check(g.events,'all decorations permit pointer input');
  }
  const oldMask=await page.locator('#codex-prism-frame').evaluate(e=>e.style.maskImage);
  await page.locator('#file').evaluate(e=>e.style.fontSize='28px');await page.evaluate(()=>window.__neriFrame.protectControls());
  check(await page.locator('#codex-prism-frame').evaluate(e=>e.style.maskImage)!==oldMask,'clearance updates with configured font size');
  await page.locator('#file').click();check(await page.evaluate(()=>window.__fileClicks)===1,'menu button still responds');
  await page.evaluate(()=>window.__codexPrism.destroy());check(await page.locator('#codex-prism-frame').count()===0,'unload removes complete frame and mask');
  check(errors.length===0,'zero browser errors');
  writeFileSync(new URL('../artifacts/starlight-report.json',import.meta.url),JSON.stringify({checks,failures:0,errors},null,2));
  console.log(JSON.stringify({checks,failures:0,errors}));
}finally{await browser.close();}
