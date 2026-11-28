import {readFileSync} from 'node:fs';
// 原始星轨边条嵌入同一SVG坐标系，保持原比例平铺，不拉长图案。
const inner=name=>readFileSync(new URL('../assets/neri-chatgpt-ui-assets/border-starlight/'+name,import.meta.url),'utf8').replace(/^[\s\S]*?<svg\b[^>]*>/,'').replace(/<\/svg>\s*$/,'');
export const frameScript=`(${installFrame.toString()})(${JSON.stringify(inner('edge_horizontal.svg'))},${JSON.stringify(inner('edge_vertical.svg'))});`;
function installFrame(horizontal,vertical){
  if(window.__neriFrame)return;
  const element=document.createElement('div');element.id='codex-prism-frame';element.setAttribute('aria-hidden','true');
  for(const key of ['tl','tr','bl','br']){const e=document.createElement('div');e.dataset.neriFramePiece='corner-'+key;element.append(e);}
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('data-neri-frame-lines','');svg.setAttribute('aria-hidden','true');element.append(svg);document.body.append(element);
  let signature='',maskSignature='';
  function protectControls(){
    const holes=[];
    for(const e of document.querySelectorAll('[role="menubar"] button,[role="menubar"] [role="menuitem"]')){
      if(getComputedStyle(e).visibility!=='visible')continue;
      const range=document.createRange();range.selectNodeContents(e);const r=range.getBoundingClientRect();
      if(r.width&&r.height)holes.push({x:r.x-1,y:r.y-1,width:r.width+2,height:r.height+2,rx:2});
    }
    for(const e of document.querySelectorAll('button:is([aria-label="打开个人资料菜单"],[aria-label="Open profile menu"]) img')){
      if(getComputedStyle(e).visibility!=='visible')continue;
      const r=e.getBoundingClientRect();if(r.width&&r.height)holes.push({x:r.x-2,y:r.y-2,width:r.width+4,height:r.height+4,rx:(r.width+4)/2});
    }
    const key=JSON.stringify([innerWidth,innerHeight,holes]);if(key===maskSignature)return;maskSignature=key;
    const shape=holes.map(r=>`<rect x="${r.x}" y="${r.y}" width="${r.width}" height="${r.height}" rx="${r.rx}" fill="black"/>`).join('');
    const image=`<svg xmlns="http://www.w3.org/2000/svg" width="${innerWidth}" height="${innerHeight}" viewBox="0 0 ${innerWidth} ${innerHeight}"><mask id="neri-control-clearance"><rect width="100%" height="100%" fill="white"/>${shape}</mask><rect width="100%" height="100%" fill="white" mask="url(#neri-control-clearance)"/></svg>`;
    const url='url("data:image/svg+xml,'+encodeURIComponent(image)+'")';element.style.maskImage=url;element.style.webkitMaskImage=url;
    element.dataset.neriProtectedControls=String(holes.length);
  }
  function layout(){
    const w=innerWidth,h=innerHeight,c=Math.max(160,Math.min(240,w*.18)),s=c/320,key=w+','+h;
    protectControls();if(key===signature)return;signature=key;
    svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
    const halfW=Math.max(0,(w-2*c)/2/s),halfH=Math.max(0,(h-2*c)/2/s);
    // 两端均从原图基线起铺，中间镜像汇合；任意宽高不截断角纹接缝、不改变比例。
    const hPiece=`<g transform="translate(${c} 0) scale(${s})"><rect width="${halfW}" height="36" fill="url(#neri-starlight-horizontal)"/></g>`;
    const vPiece=`<g transform="translate(0 ${c}) scale(${s})"><rect width="36" height="${halfH}" fill="url(#neri-starlight-vertical)"/></g>`;
    const top=hPiece+`<g transform="translate(${w} 0) scale(-1 1)">${hPiece}</g>`;
    const side=vPiece+`<g transform="translate(0 ${h}) scale(1 -1)">${vPiece}</g>`;
    svg.innerHTML=`<defs><pattern id="neri-starlight-horizontal" width="400" height="36" patternUnits="userSpaceOnUse">${horizontal}</pattern><pattern id="neri-starlight-vertical" width="36" height="400" patternUnits="userSpaceOnUse">${vertical}</pattern></defs><g data-frame-edge="top">${top}</g><g data-frame-edge="bottom" transform="translate(0 ${h}) scale(1 -1)">${top}</g><g data-frame-edge="left">${side}</g><g data-frame-edge="right" transform="translate(${w} 0) scale(-1 1)">${side}</g>`;
  }
  const observer=new ResizeObserver(layout);observer.observe(document.documentElement);window.addEventListener('resize',layout);layout();
  window.__neriFrame={element,layout,protectControls,destroy(){observer.disconnect();window.removeEventListener('resize',layout);element.remove();delete window.__neriFrame;}};
}
