import {readFileSync} from 'node:fs';

// 原始素材随插件打包；以内联 SVG 接入，不依赖临时目录或外部图片请求。
const artwork=readFileSync(new URL('../assets/neri-chatgpt-ui-assets/icons/chatgpt_quota_neri_dual_dynamic.svg',import.meta.url),'utf8');
export const quotaIconScript=`(${installQuotaIcon.toString()})(${JSON.stringify(artwork)});`;

function installQuotaIcon(artwork) {
  if(window.__codexPrismQuota)return;
  let serial=0,scheduled=false,disposed=false;
  const mounted=new Map();
  const clamp=v=>Math.max(0,Math.min(100,v));
  function remaining(button,paths) {
    const description=button.getAttribute('aria-description')||'';
    const five=description.match(/(?:5\s*(?:小时|hours?|h)).*?(?:剩余\s*|remaining\s*)?(\d+(?:\.\d+)?)\s*%/i);
    const week=description.match(/(?:每周|weekly|week).*?(?:剩余\s*|remaining\s*)?(\d+(?:\.\d+)?)\s*%/i);
    // 宿主 pathLength=100，dashoffset 代表已消耗比例。未知状态保留原生图标。
    const read=p=>{
      if(!p)return null;
      const offset=p.style.strokeDashoffset||p.getAttribute('stroke-dashoffset');
      const length=Number(p.getAttribute('pathLength'));
      return offset!==null&&offset!==''&&Number.isFinite(Number(offset))&&length>0?clamp(100-Number(offset)/length*100):null;
    };
    return [five?clamp(Number(five[1])):read(paths[0]),week?clamp(Number(week[1])):read(paths[1])];
  }
  function create(slot) {
    const svg=document.importNode(new DOMParser().parseFromString(artwork,'image/svg+xml').documentElement,true);
    const suffix='-neri-quota-'+(++serial);
    // 所有 ID（包括进度弧）均唯一，引用同步改写；通过 data 属性查找弧线。
    for(const node of svg.querySelectorAll('[id]')) {
      const id=node.id;
      node.dataset.quotaPart=id;
      node.id=id+suffix;
    }
    for(const node of [svg,...svg.querySelectorAll('*')]) {
      for(const attr of [...node.attributes]) {
        if(attr.value.includes('url(#'))node.setAttribute(attr.name,attr.value.replace(/url\(#([^)]+)\)/g,(_,id)=>'url(#'+id+suffix+')'));
      }
    }
    // 内联 SVG 的 style 也会作用于宿主文档，限定类名与聚焦选择器的范围。
    svg.querySelector('style').textContent=svg.querySelector('style').textContent
      .replace(/\.arc-fill/g,'[data-neri-quota] .neri-quota-arc-fill')
      .replace(/\.arc-group/g,'[data-neri-quota] .neri-quota-arc-group')
      .replace(/svg\[data-focus/g,'svg[data-neri-quota][data-focus')
      .replace(/\.group-week/g,'.neri-quota-group-week').replace(/\.group-5h/g,'.neri-quota-group-5h');
    for(const node of svg.querySelectorAll('[class]'))node.setAttribute('class',[...node.classList].map(c=>'neri-quota-'+c).join(' '));
    svg.setAttribute('data-neri-quota','');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
    svg.style.cssText='--quota-5h:0;--quota-week:0;pointer-events:none';
    slot.setAttribute('data-neri-quota-slot','');slot.append(svg);
    return svg;
  }
  function sync() {
    scheduled=false;if(disposed)return;
    const seen=new Set();
    for(const button of document.querySelectorAll('button[aria-label="用量"],button[aria-label="Usage"]')) {
      for(const native of button.querySelectorAll('svg:not([data-neri-quota])')) {
        if(native.closest('[data-neri-quota]'))continue;
        const paths=[...native.querySelectorAll('path[pathLength][stroke-dashoffset]')];
        if(paths.length!==2)continue;
        const slot=native.parentElement,values=remaining(button,paths);
        if(values.some(v=>v===null))continue;
        seen.add(slot);
        let svg=mounted.get(slot);
        if(!svg?.isConnected){svg=create(slot);mounted.set(slot,svg);}
        for(const [index,key] of ['5h','week'].entries()) {
          const value=String(values[index]);
          if(svg.style.getPropertyValue('--quota-'+key)!==value)svg.style.setProperty('--quota-'+key,value);
          const fill=svg.querySelector('[data-quota-part="arc-'+key+'-fill"]');
          const opacity=values[index]===0?'0':'1';
          if(fill.style.opacity!==opacity)fill.style.opacity=opacity;
        }
        const opacity=p=>{let a=1;for(let n=p;n&&n!==native;n=n.parentElement)a*=Number(getComputedStyle(n).opacity);return a;};
        const a=opacity(paths[0]),b=opacity(paths[1]);
        const focus=Math.abs(a-b)>.05?(a>b?'5h':'week'):'';
        if(focus){if(svg.dataset.focus!==focus)svg.dataset.focus=focus;}
        else if(svg.hasAttribute('data-focus'))svg.removeAttribute('data-focus');
      }
    }
    for(const [slot,svg] of mounted)if(!seen.has(slot)){svg.remove();slot.removeAttribute('data-neri-quota-slot');mounted.delete(slot);}
  }
  const observer=new MutationObserver(records=>{
    // 忽略自身 SVG 内的写入，避免 observer 反复触发。
    if(!scheduled&&records.some(r=>!r.target.closest?.('[data-neri-quota]'))){scheduled=true;queueMicrotask(sync);}
  });
  observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-description','aria-label','stroke-dashoffset','opacity','class','style']});
  window.__codexPrismQuota={sync,destroy(){disposed=true;observer.disconnect();for(const [slot,svg] of mounted){svg.remove();slot.removeAttribute('data-neri-quota-slot');}mounted.clear();delete window.__codexPrismQuota;}};
  sync();
}
