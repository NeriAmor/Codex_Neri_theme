import {readFileSync} from 'node:fs';

// 原始素材随插件打包；以内联 SVG 接入，不依赖临时目录或外部图片请求。
const artwork=readFileSync(new URL('../assets/neri-chatgpt-ui-assets/icons/chatgpt_quota_neri_dual_dynamic.svg',import.meta.url),'utf8');
const exhaustedArtwork=readFileSync(new URL('../assets/neri-chatgpt-ui-assets/icons/chatgpt_quota_neri_exhausted.svg',import.meta.url),'utf8');
export const quotaIconScript=`(${installQuotaIcon.toString()})(${JSON.stringify(artwork)},${JSON.stringify(exhaustedArtwork)});`;

function installQuotaIcon(artwork,exhaustedArtwork) {
  if(window.__codexPrismQuota)return;
  let serial=0,scheduled=false,disposed=false;
  const mounted=new Map();
  const clamp=v=>Math.max(0,Math.min(100,v));
  function description(button) {
    // 只读取额度按钮及其关联 Tooltip，避免把聊天正文中的“使用上限”当作额度状态。
    const tooltip=(button.getAttribute('aria-describedby')||'').split(/\s+/).filter(Boolean)
      .map(id=>document.getElementById(id)?.textContent||'').join(' ');
    return ['aria-description','aria-label','title'].map(key=>button.getAttribute(key)||'').join(' ')+' '+tooltip;
  }
  function remaining(description,paths) {
    const five=description.match(/(?:5\s*(?:小时|hours?|h)).*?(?:剩余\s*|remaining\s*)?(-?\d+(?:\.\d+)?)\s*%/i);
    const week=description.match(/(?:每周|weekly|week).*?(?:剩余\s*|remaining\s*)?(-?\d+(?:\.\d+)?)\s*%/i);
    // 宿主 pathLength=100，dashoffset 代表已消耗比例。未知状态保留原生图标。
    const read=p=>{
      if(!p)return null;
      const offset=p.style.strokeDashoffset||p.getAttribute('stroke-dashoffset');
      const length=Number(p.getAttribute('pathLength'));
      return offset!==null&&offset!==''&&Number.isFinite(Number(offset))&&length>0?clamp(100-Number(offset)/length*100):null;
    };
    return [five?clamp(Number(five[1])):read(paths[0]),week?clamp(Number(week[1])):read(paths[1])];
  }
  function create(slot,state) {
    const svg=document.importNode(new DOMParser().parseFromString(state==='exhausted'?exhaustedArtwork:artwork,'image/svg+xml').documentElement,true);
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
        else if((attr.name==='href'||attr.name==='xlink:href')&&attr.value.startsWith('#'))node.setAttribute(attr.name,attr.value+suffix);
      }
    }
    // 内联 SVG 的 style 也会作用于宿主文档，限定类名与聚焦选择器的范围。
    const style=svg.querySelector('style');
    if(style)style.textContent=style.textContent
      .replace(/\.arc-fill/g,'[data-neri-quota] .neri-quota-arc-fill')
      .replace(/\.arc-group/g,'[data-neri-quota] .neri-quota-arc-group')
      .replace(/svg\[data-focus/g,'svg[data-neri-quota][data-focus')
      .replace(/\.group-week/g,'.neri-quota-group-week').replace(/\.group-5h/g,'.neri-quota-group-5h');
    for(const node of svg.querySelectorAll('[class]'))node.setAttribute('class',[...node.classList].map(c=>'neri-quota-'+c).join(' '));
    svg.setAttribute('data-neri-quota','');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
    svg.dataset.quotaState=state;
    svg.style.cssText='--quota-5h:0;--quota-week:0;pointer-events:none';
    slot.setAttribute('data-neri-quota-slot','');slot.append(svg);
    return svg;
  }
  function sync() {
    scheduled=false;if(disposed)return;
    const seen=new Set();
    for(const button of document.querySelectorAll('button[aria-label="用量"],button[aria-label="Usage"]')) {
      const text=description(button);
      const exhaustedText=/已用完|已耗尽|额度用尽|已达到(?:使用)?上限|(?:usage|quota)\s+limit\s+(?:reached|exceeded)|reached\s+(?:your\s+)?(?:usage\s+)?limit|quota\s+(?:exhausted|exceeded)/i.test(text);
      const natives=[...button.querySelectorAll('svg:not([data-neri-quota])')]
        .filter(svg=>!svg.closest('[data-neri-quota]')&&!svg.parentElement.closest('svg'));
      for(const native of natives) {
        const paths=[...native.querySelectorAll('path[pathLength][stroke-dashoffset]')];
        // 原生用尽态没有两条进度弧：允许“虚线圆 + 警示标记”及有语义名称的警示图标。
        const dashed=native.querySelector('circle[stroke-dasharray],path[stroke-dasharray]:not([pathLength])');
        const mark=native.querySelector('path:not([stroke-dasharray]):not([pathLength]),line,polyline,text')||native.querySelectorAll('circle').length>1;
        const warning=paths.length!==2&&(
          Boolean(dashed&&mark)||
          /(?:circle[-_ ]?(?:alert|exclamation)|quota[-_ ]?exhausted)/i.test([native.getAttribute('data-icon'),native.getAttribute('data-testid'),native.getAttribute('class')].join(' ')));
        if(paths.length!==2&&!warning&&!(exhaustedText&&native===natives[0]))continue;
        const slot=native.parentElement,values=remaining(text,paths);
        const state=warning||exhaustedText||values.some(v=>v!==null&&v<=0)?'exhausted':'normal';
        if(state==='normal'&&values.some(v=>v===null))continue;
        seen.add(slot);
        let svg=mounted.get(slot);
        if(!svg?.isConnected||svg.dataset.quotaState!==state){svg?.remove();svg=create(slot,state);mounted.set(slot,svg);}
        for(const [index,key] of ['5h','week'].entries()) {
          const value=values[index]===null?'':String(values[index]);
          if(svg.style.getPropertyValue('--quota-'+key)!==value)svg.style.setProperty('--quota-'+key,value);
          const fill=svg.querySelector('[data-quota-part="arc-'+key+'-fill"]');
          const opacity=values[index]===0?'0':'1';
          if(fill&&fill.style.opacity!==opacity)fill.style.opacity=opacity;
        }
        const opacity=p=>{let a=1;for(let n=p;n&&n!==native;n=n.parentElement)a*=Number(getComputedStyle(n).opacity);return a;};
        const a=paths[0]?opacity(paths[0]):1,b=paths[1]?opacity(paths[1]):1;
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
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-description','aria-describedby','aria-label','title','stroke-dashoffset','stroke-dasharray','pathLength','data-icon','data-testid','opacity','class','style']});
  window.__codexPrismQuota={sync,destroy(){disposed=true;observer.disconnect();for(const [slot,svg] of mounted){svg.remove();slot.removeAttribute('data-neri-quota-slot');}mounted.clear();delete window.__codexPrismQuota;}};
  sync();
}
