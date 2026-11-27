const token=location.hash.slice(1)||sessionStorage.getItem('prism-token')||'';sessionStorage.setItem('prism-token',token);history.replaceState(null,'',location.pathname);
let state,items=[];
const $=id=>document.getElementById(id);
async function api(path,body){const r=await fetch('/api/'+path,{method:body===undefined?'GET':'POST',headers:{'X-Prism-Token':token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});const v=await r.json();if(!r.ok)throw Error(v.error||r.statusText);return v;}
async function run(fn){$('error').textContent='';try{await fn();}catch(e){$('error').textContent=e.message;}}
function draw(){
  const q=$('search').value.toLowerCase(),kind=$('kind').value;
  const visible=items.filter(x=>(!kind||x.kind===kind)&&x.title.toLowerCase().includes(q));
  $('count').textContent=`${visible.length} 张壁纸`;$('library').replaceChildren();
  for(const item of visible){const b=document.createElement('button');b.className='card'+(item.id===state.activeItem?.id?' active':'');b.dataset.id=item.id;
    if(item.thumbUrl){const img=document.createElement('img');img.src=item.thumbUrl;img.alt='';img.loading='lazy';b.append(img);}
    const title=document.createElement('strong');title.textContent=item.title;const sub=document.createElement('small');sub.textContent=`${item.kind} · ${item.source}`;b.append(title,sub);
    b.onclick=()=>run(async()=>{await api('apply',{id:item.id});await load();});$('library').append(b);
  }
}
async function load(library=false){state=await api('state');if(library){const result=await api('library');items=result.items||result;}
  $('status').textContent=state.host.connected?`已连接 ${state.host.windows} 个 Codex 窗口 · ${state.activeItem?.title||'未选择壁纸'}${state.host.error?' · '+state.host.error:''}`:state.host.error;
  $('power').textContent=state.skinEnabled?'关闭壁纸':'启用壁纸';
  for(const [id,key]of [['opacity','glassOpacity'],['blur','glassBlur'],['fit','fit']]){if(document.activeElement!==$(id))$(id).value=state.config[key];}
  $('opacity-value').textContent=Math.round(state.config.glassOpacity*100)+'%';$('paused').checked=state.config.paused;$('audio').checked=state.config.audioEnabled;
  $('rotation').checked=state.config.rotationEnabled;for(const [id,key]of [['interval','rotationInterval'],['order','rotationOrder'],['trigger','rotationTrigger']])if(document.activeElement!==$(id))$(id).value=state.config[key];draw();
}
for(const [id,key]of [['opacity','glassOpacity'],['blur','glassBlur'],['fit','fit'],['paused','paused'],['audio','audioEnabled'],['rotation','rotationEnabled'],['interval','rotationInterval'],['order','rotationOrder'],['trigger','rotationTrigger']])$(id).onchange=()=>run(async()=>{const el=$(id);await api('config',{[key]:el.type==='checkbox'?el.checked:['range','number'].includes(el.type)?Number(el.value):el.value});await load();});
$('power').onclick=()=>run(async()=>{await api('config',{skinEnabled:!state.skinEnabled});await load();});
$('restore').onclick=()=>run(async()=>{await api('restore',{});await load();});
$('next').onclick=()=>run(async()=>{await api('next',{});await load();});
$('refresh').onclick=()=>run(async()=>{await api('scan',{});await load(true);});
$('folders').onsubmit=e=>{e.preventDefault();void run(async()=>{const folder=$('folder').value.trim();if(!folder)return;await api('config',{customFolders:[...new Set([...(state.config.customFolders||[]),folder])]});await api('scan',{});await load(true);});};
$('upload').onchange=()=>run(async()=>{const f=$('upload').files[0];if(!f)return;if(f.size>512*1024*1024)throw Error('文件不能超过 512 MB');const r=await fetch('/api/upload',{method:'POST',headers:{'X-Prism-Token':token,'X-Filename':encodeURIComponent(f.name),'Content-Type':f.type||'application/octet-stream'},body:f});const v=await r.json();if(!r.ok)throw Error(v.error);await load(true);$('upload').value='';});
$('search').oninput=draw;$('kind').onchange=draw;
void run(()=>load(true));setInterval(()=>void run(()=>load()),4000);
