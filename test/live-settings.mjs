import {CdpSession,listCdpTargets} from '../sidecars/prism_studio/cdp-bridge.mjs';
import {serviceRequest} from '../codex/service-client.mjs';
import {writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const original=await serviceRequest('state');
const session=await CdpSession.connect((await listCdpTargets(9340)).find(t=>t.url==='app://-/index.html').webSocketDebuggerUrl);
const read=`(()=>{const root=document.querySelector('#codex-prism-floating')?.shadowRoot;const sidebar=document.querySelector('#app-shell-sidebar');return {open:window.__codexPrismPanel?.isOpen,notice:root?.querySelector('#notice').textContent,count:root?.querySelectorAll('.card').length,default:root?.querySelector('.card')?.querySelector('strong').textContent,defaultId:root?.querySelector('.card')?.dataset.id,folders:root?.querySelector('#linked-folders')?.textContent,opacity:root?.querySelector('#opacity').value,blur:root?.querySelector('#blur').value,background:getComputedStyle(sidebar).backgroundColor,filter:getComputedStyle(sidebar).backdropFilter,entryInRail:!!document.querySelector('[data-app-navigation-rail] #codex-prism-button'),entryPosition:getComputedStyle(document.querySelector('#codex-prism-button')).position,videoReady:document.querySelector('#codex-prism-stage video')?.readyState>=2};})()`;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(predicate){for(let i=0;i<60;i++){const p=await session.evaluate(read);if(predicate(p))return p;await sleep(150);}throw Error('设置同步超时');}
async function sliders(opacity,blur){await session.evaluate(`(()=>{const r=document.querySelector('#codex-prism-floating').shadowRoot;for(const [id,value] of [['opacity',${opacity}],['blur',${blur}]]){const e=r.querySelector('#'+id);e.value=value;e.dispatchEvent(new Event('input',{bubbles:true}));}})()`);return until(p=>p.background.includes(', '+opacity+')')&&p.filter.includes('blur('+blur+'px)')&&!p.notice.includes('正在应用'));}
try{
  if(!await session.evaluate('window.__codexPrismPanel.isOpen'))await session.evaluate('document.querySelector("#codex-prism-button").click()');
  const initial=await until(p=>p.count>0&&p.default?.includes('默认音理'));
  assert.ok(initial.entryInRail);assert.equal(initial.entryPosition,'relative');assert.equal(initial.folders,undefined);assert.ok((await serviceRequest('state')).stats.weInstalled);
  const high=await sliders(.85,24),low=await sliders(.35,0);
  assert.notEqual(high.background,low.background);assert.notEqual(high.filter,low.filter);
  await session.evaluate('document.querySelector("#codex-prism-floating").shadowRoot.querySelector(".card").click()');
  await until(p=>p.videoReady&&!p.notice.includes('正在应用'));
  for(let i=0;i<40;i++){if((await serviceRequest('state')).activeItem.id===initial.defaultId)break;await sleep(150);}
  assert.equal((await serviceRequest('state')).activeItem.id,initial.defaultId);
  await session.evaluate('document.querySelector("#codex-prism-floating").shadowRoot.querySelector("#scan").click()');
  const refreshed=await until(p=>p.count>0&&p.notice.startsWith('已应用'));
  writeFileSync(new URL('../artifacts/settings-report.json',import.meta.url),JSON.stringify({initial,high,low,refreshed,failures:0},null,2));
  console.log(JSON.stringify({wallpapers:initial.count,linked:initial.folders,defaultVideoWorks:true,slidersVisible:true,scanCompletes:true,sidebarEntry:true}));
}finally{
  await serviceRequest('config',{glassOpacity:original.config.glassOpacity,glassBlur:original.config.glassBlur});
  if(original.activeItem)await serviceRequest('apply',{id:original.activeItem.id});
  await sleep(1800);
  const shot=await session.send('Page.captureScreenshot',{format:'png'});writeFileSync(new URL('../artifacts/38-sidebar-settings.png',import.meta.url),Buffer.from(shot.data,'base64'));
  session.close();
}
