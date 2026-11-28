// 使用独立 SVG 图像文档，避免素材内部渐变 ID 与宿主或其他输入框冲突。
export const composerBorderScript=`(${installComposerBorder.toString()})();`;
function installComposerBorder(){
  if(window.__neriComposerBorder)return;
  let base='',enabled=false,queued=false;
  const nodes=new Set();
  const pieces={tl:'corner_tl',tr:'corner_tr',bl:'corner_bl',br:'corner_br',top:'top_crown',bottom:'bottom_lace'};
  function clean(e){e.querySelectorAll(':scope > .neri-composer-decor').forEach(n=>n.remove());e.classList.remove('neri-composer-wrap');e.removeAttribute('data-neri-composer-border');nodes.delete(e);}
  function refresh(){
    queued=false;
    for(const e of [...nodes])if(!enabled||!e.isConnected)clean(e);
    if(!enabled||!base)return;
    for(const e of document.querySelectorAll('[data-composer-surface-variant]')){
      if(e.querySelector(':scope > .neri-composer-decor'))continue;
      const layer=document.createElement('div');layer.className='neri-composer-decor';layer.setAttribute('aria-hidden','true');
      for(const [key,file]of Object.entries(pieces)){
        const img=document.createElement('img');img.className=['tl','tr','bl','br'].includes(key)?'neri-c-corner neri-c-'+key:'neri-c-'+key;
        img.alt='';img.draggable=false;img.src=base+'composer/composer_'+file+'.svg';layer.append(img);
      }
      e.classList.add('neri-composer-wrap');e.setAttribute('data-neri-composer-border','');e.append(layer);nodes.add(e);
    }
  }
  const observer=new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(refresh);}});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.__neriComposerBorder={
    update(assetBase,on){const next=assetBase?assetBase.replace(/\/$/,'')+'/':'';if(base!==next)for(const e of [...nodes])clean(e);base=next;enabled=Boolean(on);refresh();},
    destroy(){enabled=false;observer.disconnect();for(const e of [...nodes])clean(e);delete window.__neriComposerBorder;}
  };
}
