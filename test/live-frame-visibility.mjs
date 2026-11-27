import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9340');
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url()==='app://-/index.html');
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const shot=name=>page.screenshot({path:fileURLToPath(new URL('../artifacts/'+name,import.meta.url))});
let saved;
try {
  await page.bringToFront();
  saved=await page.evaluate(()=>{
    const v=document.querySelector('#codex-prism-stage video'),f=document.getElementById('codex-prism-frame');
    const saved={paused:v?.paused,theme:document.documentElement.getAttribute('data-theme'),style:f.getAttribute('style')};
    v?.pause();const s=document.createElement('style');s.id='neri-visibility-test';
    s.textContent='*,*::before,*::after{animation-play-state:paused!important;transition:none!important;caret-color:transparent!important}';document.head.append(s);
    return saved;
  });
  const report={};
  for(const mode of ['dark','light']){
    await page.evaluate(mode=>document.documentElement.dataset.theme=mode,mode);
    await page.waitForFunction(mode=>document.documentElement.dataset.neriAppearance===mode,mode);
    await shot('frame-visible-'+mode+'.png');
    await page.evaluate(()=>document.getElementById('codex-prism-frame').style.setProperty('display','none','important'));
    await shot('frame-hidden-'+mode+'.png');
    await page.evaluate(style=>{const f=document.getElementById('codex-prism-frame');if(style===null)f.removeAttribute('style');else f.setAttribute('style',style);},saved.style);
    // 临时打开命中检测仅检查绘制顺序，完成后恢复；真正装饰始终不接收事件。
    report[mode]=await page.evaluate(()=>{
      const f=document.getElementById('codex-prism-frame');
      const pass=[f,...f.querySelectorAll('*')].every(e=>getComputedStyle(e).pointerEvents==='none');
      f.style.setProperty('pointer-events','auto','important');
      const points=[[10,innerHeight/2],[10,innerHeight-10],[innerWidth/2,10]];
      const onTop=points.map(([x,y])=>document.elementFromPoint(x,y)===f);
      f.style.removeProperty('pointer-events');
      return {pass,onTop};
    });
    assert.ok(report[mode].pass,'decorations must permit clicks');
    assert.ok(report[mode].onTop.every(Boolean),'edges must paint above sidebar/titlebar');
  }
  assert.deepEqual(errors,[]);
  writeFileSync(new URL('../artifacts/frame-visibility-dom.json',import.meta.url),JSON.stringify(report,null,2));
  console.log(execFileSync('python',[fileURLToPath(new URL('./frame-visibility.py',import.meta.url))],{encoding:'utf8',windowsHide:true}));
}finally{
  if(saved)await page.evaluate(saved=>{
    const f=document.getElementById('codex-prism-frame');if(saved.style===null)f.removeAttribute('style');else f.setAttribute('style',saved.style);
    if(saved.theme===null)delete document.documentElement.dataset.theme;else document.documentElement.dataset.theme=saved.theme;
    document.getElementById('neri-visibility-test')?.remove();
    if(saved.paused===false)document.querySelector('#codex-prism-stage video')?.play().catch(()=>{});
  },saved);
  await browser.close();
}
