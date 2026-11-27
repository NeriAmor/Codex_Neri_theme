// 整个边线只使用一个坐标系；上下复制同一组路径再镜像，不再拼接四段背景图。
export const frameScript=`(${installFrame.toString()})();`;
function installFrame(){
  if(window.__neriFrame)return;
  const element=document.createElement('div');element.id='codex-prism-frame';element.setAttribute('aria-hidden','true');
  for(const key of ['tl','tr','bl','br']){const e=document.createElement('div');e.dataset.neriFramePiece='corner-'+key;element.append(e);}
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('data-neri-frame-lines','');svg.setAttribute('aria-hidden','true');element.append(svg);document.body.append(element);
  let signature='';
  function layout(){
    const w=innerWidth,h=innerHeight,s=Math.min(280,w*.24,h*.4)/320,key=w+','+h;
    if(key===signature)return;signature=key;
    svg.setAttribute('viewBox',`0 0 ${w} ${h}`);
    const wave=length=>{
      const start=48*s,end=length-start,n=Math.max(2,Math.round((end-start)/(48*s))*2),step=(end-start)/n;
      let d=`M ${start} ${17*s}`;
      for(let i=0;i<n;i++)d+=` Q ${start+(i+.5)*step} ${28*s} ${start+(i+1)*step} ${17*s}`;
      return `<path d="${d}" fill="none" stroke="#E4C9ED" stroke-opacity=".48" stroke-width="${.9*s}"/>`;
    };
    let top=`<path d="M ${10*s} ${40*s} L ${10*s} ${34*s} Q ${10*s} ${10*s} ${34*s} ${10*s} L ${w-34*s} ${10*s} Q ${w-10*s} ${10*s} ${w-10*s} ${34*s} L ${w-10*s} ${40*s}" fill="none" stroke="#E4C9ED" stroke-opacity=".44" stroke-width="${1.2*s}"/><path d="M ${17*s} ${40*s} Q ${17*s} ${17*s} ${40*s} ${17*s} L ${w-40*s} ${17*s} Q ${w-17*s} ${17*s} ${w-17*s} ${40*s}" fill="none" stroke="#D8C2EC" stroke-opacity=".24" stroke-width="${.8*s}" stroke-dasharray="${3*s} ${7*s}"/>`+wave(w);
    for(let x=w/2;x<w-64*s;x+=400*s){for(const xx of x===w/2?[x]:[x,w-x])top+=`<path d="M ${xx} ${19*s} l ${s} ${4*s} l ${4*s} ${s} l ${-4*s} ${s} l ${-s} ${4*s} l ${-s} ${-4*s} l ${-4*s} ${-s} l ${4*s} ${-s} Z" fill="#FFF3FC" opacity=".65"/>`;}
    const vertical=wave(h);
    const side=`<path d="M ${10*s} ${40*s} V ${h-40*s}" fill="none" stroke="#E4C9ED" stroke-opacity=".44" stroke-width="${1.2*s}"/><path d="M ${17*s} ${40*s} V ${h-40*s}" fill="none" stroke="#D8C2EC" stroke-opacity=".24" stroke-width="${.8*s}" stroke-dasharray="${3*s} ${7*s}"/>`+`<g transform="matrix(0 1 1 0 0 0)">${vertical}</g>`;
    svg.innerHTML=`<g data-frame-edge="top">${top}</g><g data-frame-edge="bottom" transform="translate(0 ${h}) scale(1 -1)">${top}</g><g>${side}</g><g transform="translate(${w} 0) scale(-1 1)">${side}</g>`;
  }
  const observer=new ResizeObserver(layout);observer.observe(document.documentElement);window.addEventListener('resize',layout);layout();
  window.__neriFrame={element,layout,destroy(){observer.disconnect();window.removeEventListener('resize',layout);element.remove();delete window.__neriFrame;}};
}
