(() => {
  if (window.__codexPrismPanel) return;
  let host, root, state, drag, listSignature='',lastError='',pendingTimer;
  const actions=[],$=id=>root.getElementById(id);
  const switchMarkup=(id,text)=>`<label class="neri-switch"><input id="${id}" type="checkbox"><span class="neri-switch-track"></span><span>${text}</span></label>`;
  function send(action){
    lastError='';const queued=action.type==='config'&&actions.find(a=>a.type==='config'&&!a.scan&&!action.scan);
    if(queued)Object.assign(queued.patch,action.patch);else actions.push(action);
    $('notice').className='neri-status-pill';$('notice').textContent='正在应用…';clearTimeout(pendingTimer);
    pendingTimer=setTimeout(()=>window.__codexPrismPanel?.error('连接暂时中断，等待后台恢复'),6500);
  }
  function ranges(){for(const id of ['opacity','blur']){const e=$(id),value=Number(e.value);e.style.setProperty('--val',((value-Number(e.min))/(Number(e.max)-Number(e.min))*100)+'%');$(id+'-value').textContent=id==='opacity'?Math.round(value*100)+'%':value+'px';}}
  function mount(){
    if(host?.isConnected)return;
    host=document.createElement('div');host.id='codex-prism-floating';host.hidden=true;root=host.attachShadow({mode:'open'});
    const style=document.createElement('style');style.textContent=`/* NERI_PANEL_CSS */`;root.append(style);
    const section=document.createElement('section');section.className='neri-panel';section.setAttribute('role','dialog');section.setAttribute('aria-label','音理主题设置');section.setAttribute('aria-modal','false');
    section.innerHTML=`<div class="neri-panel-ornament" aria-hidden="true"></div>
<header id="grip" class="neri-header"><div class="neri-header-left"><span class="neri-header-icon" aria-hidden="true"></span><div class="neri-title-group"><h2 class="neri-title">Neri</h2><span class="neri-subtitle">主题与壁纸设置</span></div><span id="notice" class="neri-status-pill" role="status">正在连接…</span></div><div class="neri-header-actions"><button id="power" class="neri-btn neri-btn-ghost neri-btn-danger">关闭主题</button><button id="close" class="neri-btn neri-btn-icon neri-btn-ghost" aria-label="关闭壁纸设置">✕</button></div></header>
<div class="scroll neri-body"><section class="neri-card"><div class="neri-row"><label class="neri-slider-field"><span class="neri-field-label">不透明度</span><input id="opacity" class="neri-range" aria-label="玻璃不透明度" type="range" min="0.2" max="0.98" step="0.01"><output id="opacity-value" class="neri-value-chip"></output></label><label class="neri-slider-field"><span class="neri-field-label">模糊度</span><input id="blur" class="neri-range" aria-label="界面背景模糊" type="range" min="0" max="40" step="1"><output id="blur-value" class="neri-value-chip"></output></label><select id="fit" class="neri-select" aria-label="壁纸填充"><option value="cover">铺满</option><option value="contain">适应</option><option value="center">居中</option><option value="fill">拉伸</option></select></div><div class="neri-divider"></div><div class="neri-row neri-row-between"><div class="neri-row">${switchMarkup('typingeffects','文字与光标特效')}${switchMarkup('paused','暂停视频')}${switchMarkup('audio','视频声音')}</div><div class="neri-row"><button id="next" class="neri-btn neri-btn-primary">✦ 下一张</button><button id="restore" class="neri-btn neri-btn-ghost">恢复原界面</button></div></div></section>
<section class="neri-card"><div class="neri-row neri-row-between">${switchMarkup('rotation','自动轮换壁纸')}<div class="neri-row"><label class="neri-field-label">间隔 <input id="interval" class="neri-input neri-input-num" aria-label="轮换间隔" type="number" min="1" max="1440"> 分钟</label><select id="order" class="neri-select" aria-label="轮换顺序"><option value="random">随机</option><option value="sequence">依次</option></select><select id="trigger" class="neri-select" aria-label="切换时机"><option value="interval">定时</option><option value="videoEnd">视频结束</option></select></div></div></section>
<section class="neri-card"><div class="neri-row neri-library-tools"><input id="search" class="neri-input" placeholder="搜索壁纸" aria-label="搜索壁纸"><select id="kind" class="neri-select" aria-label="壁纸类型"><option value="">全部</option><option value="image">图片</option><option value="video">视频</option><option value="slideshow">轮播</option><option value="scene">场景</option><option value="web">网页</option></select><button id="import" class="neri-btn">+ 导入</button><input id="file" type="file" accept="image/*,video/*"><button id="scan" class="neri-btn neri-btn-ghost">↻ 扫描</button></div><div class="neri-dir-bar"><span id="dir-summary">网页/无内嵌视频场景使用预览图</span><button id="dir-toggle" class="neri-dir-toggle" aria-expanded="false" aria-controls="directory-drawer">管理目录 ▾</button></div><div id="directory-drawer" class="neri-dir-drawer" hidden><form id="folders"><input id="folder" class="neri-input" placeholder="本地壁纸文件夹路径" aria-label="本地壁纸文件夹"><button class="neri-btn">添加文件夹</button></form><div id="dir-list" class="neri-dir-list"></div></div><div id="grid" class="neri-gallery-grid"></div></section></div>
<footer class="neri-footer"><span>拖动标题栏移动 · 右下角调整大小</span><span><kbd class="neri-kbd">Esc</kbd> 关闭 · <kbd class="neri-kbd">Ctrl+Alt+W</kbd> 再次打开</span></footer>`;
    root.append(section);document.body.append(host);
    $('close').onclick=close;$('power').onclick=()=>send({type:'config',patch:{skinEnabled:!state?.enabled}});$('restore').onclick=()=>send({type:'config',patch:{skinEnabled:false}});$('next').onclick=()=>send({type:'next'});$('scan').onclick=()=>send({type:'scan'});$('import').onclick=()=>$('file').click();$('file').onchange=()=>{if($('file').files[0])send({type:'upload'});};
    $('dir-toggle').onclick=()=>{const open=$('directory-drawer').hidden;$('directory-drawer').hidden=!open;$('dir-toggle').setAttribute('aria-expanded',String(open));$('dir-toggle').textContent='管理目录 '+(open?'▴':'▾');};
    $('folders').onsubmit=e=>{e.preventDefault();const path=$('folder').value.trim();if(path){send({type:'config',patch:{customFolders:[...new Set([...(state?.config.customFolders||[]),path])]},scan:true});$('folder').value='';}};
    $('search').oninput=renderLibrary;$('kind').onchange=renderLibrary;
    for(const [id,key] of [['opacity','glassOpacity'],['blur','glassBlur'],['fit','fit'],['paused','paused'],['audio','audioEnabled'],['typingeffects','typingEffectsEnabled'],['rotation','rotationEnabled'],['interval','rotationInterval'],['order','rotationOrder'],['trigger','rotationTrigger']]){
      const apply=()=>{const e=$(id);send({type:'config',patch:{[key]:e.type==='checkbox'?e.checked:['range','number'].includes(e.type)?Number(e.value):e.value,...(['rotation','interval','order','trigger'].includes(id)?{rotationGroupId:''}:{})}});};
      $(id).onchange=apply;if(['opacity','blur'].includes(id))$(id).oninput=()=>{ranges();apply();};
    }
    $('grip').onpointerdown=e=>{if(e.target.closest('button')||e.button!==0)return;const r=host.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,left:r.left,top:r.top};$('grip').setPointerCapture(e.pointerId);};
    $('grip').onpointermove=e=>{if(!drag)return;host.style.left=Math.max(8,Math.min(innerWidth-host.offsetWidth-8,drag.left+e.clientX-drag.x))+'px';host.style.top=Math.max(8,Math.min(innerHeight-host.offsetHeight-8,drag.top+e.clientY-drag.y))+'px';host.style.right='auto';};
    $('grip').onpointerup=$('grip').onpointercancel=()=>{drag=null;};
  }
  function close(){if(host)host.hidden=true;}
  function clamp(){if(!host||host.hidden)return;const r=host.getBoundingClientRect();if(r.right>innerWidth||r.bottom>innerHeight){host.style.left=Math.max(8,Math.min(r.left,innerWidth-r.width-8))+'px';host.style.top=Math.max(8,Math.min(r.top,innerHeight-r.height-8))+'px';host.style.right='auto';}}
  function renderLibrary(){
    if(!state)return;const q=$('search').value.toLowerCase(),kind=$('kind').value,all=state.items||[];
    $('kind').options[0].textContent='全部 · '+all.length+' 张';
    const items=all.filter(i=>(!kind||i.kind===kind)&&i.title.toLowerCase().includes(q));
    const signature=JSON.stringify([items,state.activeId]);if(signature===listSignature)return;listSignature=signature;$('grid').replaceChildren();
    for(const item of items){const b=document.createElement('button');b.className='card neri-wp-card'+(item.id===state.activeId?' active is-active':'');b.dataset.id=item.id;b.title=item.title;b.setAttribute('aria-pressed',String(item.id===state.activeId));
      const thumb=document.createElement('div');thumb.className='neri-wp-thumb';if(item.preview){const img=document.createElement('img');img.src=item.preview;img.alt='';img.loading='lazy';thumb.append(img);}else{const ph=document.createElement('div');ph.className='placeholder';ph.textContent='无预览图';thumb.append(ph);}
      const badge=document.createElement('span');badge.className='neri-wp-badge';badge.textContent=item.kind.toUpperCase();thumb.append(badge);
      if(item.id===state.activeId){const star=document.createElement('span');star.className='neri-wp-active-star';star.textContent='✦';star.setAttribute('aria-hidden','true');thumb.append(star);}
      const meta=document.createElement('div');meta.className='neri-wp-meta';const name=document.createElement('strong');name.className='neri-wp-name';name.textContent=item.title;const sub=document.createElement('small');sub.className='neri-wp-sub';sub.textContent=item.source;meta.append(name,sub);b.append(thumb,meta);b.onclick=()=>send({type:'apply',id:item.id});$('grid').append(b);
    }
  }
  window.addEventListener('resize',clamp);
  window.__codexPrismPanel={get isOpen(){return Boolean(host&&!host.hidden);},toggle(){mount();host.hidden=!host.hidden;if(!host.hidden){actions.push({type:'panel'});$('search').focus();clamp();}},close,
    update(next){mount();clearTimeout(pendingTimer);if(lastError.startsWith('连接暂时中断'))lastError='';state=next;const c=next.config||{};
      for(const [id,key] of [['opacity','glassOpacity'],['blur','glassBlur'],['fit','fit'],['interval','rotationInterval'],['order','rotationOrder'],['trigger','rotationTrigger']])if(root.activeElement!==$(id))$(id).value=c[key];
      for(const [id,key] of [['paused','paused'],['audio','audioEnabled'],['typingeffects','typingEffectsEnabled'],['rotation','rotationEnabled']])$(id).checked=Boolean(c[key]);ranges();$('power').textContent=next.enabled?'关闭主题':'启用主题';
      $('notice').className='neri-status-pill'+(lastError?' error':'');$('notice').textContent=lastError||'已应用 · '+(next.title||'选择一张壁纸');$('notice').title=$('notice').textContent;
      const dirs=[...new Set([...(next.folders||[]),...(c.customFolders||[])])];$('dir-summary').textContent=(dirs.length?'已自动连接 '+dirs.length+' 个 Wallpaper Engine 目录 · ':'')+'网页/无内嵌视频场景使用预览图';$('dir-list').replaceChildren();for(const path of dirs){const line=document.createElement('div');line.textContent=path;$('dir-list').append(line);}renderLibrary();
    },error(message){clearTimeout(pendingTimer);lastError=message;mount();$('notice').className='neri-status-pill error';$('notice').textContent=message;$('notice').title=message;},drain(){return actions.splice(0);},destroy(){clearTimeout(pendingTimer);host?.remove();window.removeEventListener('resize',clamp);delete window.__codexPrismPanel;}
  };
})();
