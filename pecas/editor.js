(() => {
'use strict';
const assets=window.ARTWORK_ASSETS;
const catalog=document.getElementById('catalog'),canvas=document.getElementById('canvas'),workspace=document.getElementById('workspace');
const ctx=canvas.getContext('2d'),ghost=document.getElementById('ghost'),empty=document.getElementById('empty');
const download=document.getElementById('download'),sidebar=document.querySelector('aside'),status=document.getElementById('status');
const selection=document.getElementById('selection');
const duplicate=document.getElementById('duplicate-handle');
const placed=[],images=new Map(),masks=new Map(),touchPoints=new Map(),stitches=[];let selected=null,drag=null,pinch=null,category='retalho',W=1,H=1,exporting=false,stitchMode=false,stitchPreview=null;
const stitchTool=document.createElement('button');stitchTool.type='button';stitchTool.className='stitch-tool';stitchTool.textContent='costura reta';stitchTool.setAttribute('aria-label','Costura reta vermelha');stitchTool.setAttribute('aria-pressed','false');stitchTool.title='Ative e arraste sobre a obra para desenhar uma costura reta vermelha.';document.querySelector('.art-actions').prepend(stitchTool);
const stitchStyle=document.createElement('style');stitchStyle.textContent='.art-actions .stitch-tool[aria-pressed="true"]{background:#f7e2e5;color:#99203a}#canvas.is-stitching{cursor:crosshair}';document.head.append(stitchStyle);

const backgroundSelect=document.getElementById('background');
let background='branco';const backgroundImages=new Map();
for(const [id,src] of Object.entries(window.ARTWORK_BACKGROUNDS)){const im=new Image();im.onload=()=>draw();im.src=src;backgroundImages.set(id,im);}
backgroundSelect.addEventListener('change',()=>{background=backgroundSelect.value;draw();});
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const MIN_SCALE=.035,MAX_SCALE=.9;
for(const a of assets)masks.set(a.id,Uint8Array.from(atob(a.mask),c=>c.charCodeAt(0)));
function ensureImage(a){
  if(images.has(a.id))return;
  const im=new Image();images.set(a.id,im);
  im.onload=()=>draw();
  im.onerror=()=>{images.delete(a.id);status.textContent='Não foi possível carregar esta peça. Tente adicioná-la novamente.';};
  im.src=a.src;
}
function size(a){const long=Math.max(a.width,a.height);const old=a.kind==='caco'?70+Math.sqrt(long)*2.6:48+Math.sqrt(long)*3.2;const vw=window.innerWidth,margin=vw<600?12:24,cols=Math.max(2,Math.floor((vw-margin*2)/(vw<600?106:142))),cell=(vw-margin*2)/cols;const length=Math.min(.9*Math.min(old*Math.min(1,cell/155),cell-24,cell*1.02-24),W*.8,H*.8);return {w:length*a.width/long,h:length*a.height/long};}
function dimensions(p){const long=p.relative*Math.min(W,H);return {w:long*p.asset.width/Math.max(p.asset.width,p.asset.height),h:long*p.asset.height/Math.max(p.asset.width,p.asset.height)};}
function angle(p){return (p.rotation||0)*Math.PI/180;}
function normalizeRotation(value){return ((value+180)%360+360)%360-180;}
function bounds(p){
  const {w,h}=dimensions(p),r=angle(p);
  return {w:Math.abs(w*Math.cos(r))+Math.abs(h*Math.sin(r)),h:Math.abs(w*Math.sin(r))+Math.abs(h*Math.cos(r))};
}
function keep(p,x,y){
  // Keep a small reachable overlap; the canvas clips everything outside it.
  const box=bounds(p),overlap=Math.min(8,box.w/2,box.h/2);
  p.x=clamp(x,-box.w/2+overlap,W+box.w/2-overlap)/W;
  p.y=clamp(y,-box.h/2+overlap,H+box.h/2-overlap)/H;
}
function setScale(p,relative){
  if(!p||exporting)return;
  p.relative=clamp(relative,MIN_SCALE,MAX_SCALE);
  keep(p,p.x*W,p.y*H);draw();
}
function setRotation(p,rotation){
  if(!p||exporting)return;
  p.rotation=normalizeRotation(rotation);
  keep(p,p.x*W,p.y*H);draw();
}
function syncControls(){
  duplicate.disabled=!selected||exporting||!!drag||!!pinch;
  selection.hidden=!selected||exporting||stitchMode;
  canvas.classList.toggle('has-selection',!!selected);
  canvas.classList.toggle('is-dragging',!!drag||!!pinch);
  canvas.classList.toggle('is-stitching',stitchMode);
  stitchTool.setAttribute('aria-pressed',String(stitchMode));
  stitchTool.disabled=exporting||!!drag||!!pinch;
  if(!selected)return;
  const dimensionsInCanvas=dimensions(selected);
  const w=Math.max(36,dimensionsInCanvas.w),h=Math.max(36,dimensionsInCanvas.h);
  selection.style.width=w+'px';selection.style.height=h+'px';
  selection.style.left=selected.x*W-w/2+'px';selection.style.top=selected.y*H-h/2+'px';
  selection.style.transform=`rotate(${selected.rotation}deg)`;
  const area=workspace.getBoundingClientRect(),art=canvas.getBoundingClientRect(),r=angle(selected);
  function positionHandle(id,x,y,rightSpace=0){
    const worldX=selected.x*W+x*Math.cos(r)-y*Math.sin(r);
    const worldY=selected.y*H+x*Math.sin(r)+y*Math.cos(r);
    const visibleX=clamp(worldX,area.left-art.left+24,area.right-art.left-24-rightSpace);
    const visibleY=clamp(worldY,Math.max(-34,area.top-art.top+24),H+22);
    const local=localPoint(selected,visibleX,visibleY),handle=document.getElementById(id);
    handle.style.left=local.x+w/2-22+'px';handle.style.top=local.y+h/2-22+'px';
    handle.style.right='auto';handle.style.bottom='auto';
    return {x:visibleX,y:visibleY};
  }
  positionHandle('resize-handle',w/2,h/2);
  const rotatePosition=positionHandle('rotate-handle',0,-h/2-30,52);
  const duplicatePosition=localPoint(selected,rotatePosition.x+52,rotatePosition.y);
  positionHandle('duplicate-handle',duplicatePosition.x,duplicatePosition.y);
  duplicate.style.transform=`rotate(${-selected.rotation}deg)`;
}
function localPoint(p,x,y){
  const dx=x-p.x*W,dy=y-p.y*H,r=angle(p);
  return {x:dx*Math.cos(r)+dy*Math.sin(r),y:-dx*Math.sin(r)+dy*Math.cos(r)};
}
function snapshot(p){return {x:p.x,y:p.y,relative:p.relative,rotation:p.rotation};}
function recipe(){return {version:1,background,pieces:placed.map(p=>({id:p.asset.id,x:p.x,y:p.y,relative:p.relative,rotation:p.rotation||0})),...(stitches.length?{stitches:stitches.map(line=>({...line}))}:{})};}
window.artworkEditor={snapshot:recipe};
function render(target,width,height){const artwork=recipe();if(stitchPreview)artwork.stitches=[...(artwork.stitches||[]),stitchPreview];window.ArtworkRendering.renderRecipe(target,width,height,artwork,images,backgroundImages);}
function draw(){ctx.setTransform(canvas.width/W,0,0,canvas.height/H,0,0);render(ctx,W,H);empty.hidden=placed.length>0;empty.style.color=background==='preto'?'#fff':'#000';backgroundSelect.disabled=exporting;download.disabled=!placed.length||exporting||drag?.type==='stitch';document.getElementById('publish').disabled=!placed.length||exporting||drag?.type==='stitch';syncControls();}
function resize(){
  if(drag||pinch)cancelGesture();
  const r=workspace.getBoundingClientRect();
  W=Math.max(1,Math.min(r.width-56,Math.max(90,r.height-140)*1.5));H=W/1.5;
  canvas.style.width=W+'px';canvas.style.height=H+'px';
  const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
  placed.forEach(p=>keep(p,p.x*W,p.y*H));draw();
}
function refresh(){catalog.replaceChildren();for(const a of assets.filter(a=>a.kind===category)){const b=document.createElement('button');b.type='button';b.className='asset';b.setAttribute('aria-label',`${a.label} — toque ou arraste para adicionar quantas vezes quiser`);const im=document.createElement('img');im.loading='lazy';im.decoding='async';im.src=a.src;im.alt='';im.draggable=false;b.append(im);b.addEventListener('pointerdown',e=>startCatalog(e,a,b));b.addEventListener('click',e=>{if(e.detail===0)add(a,W/2,H/2);});catalog.append(b);}}
function add(a,x,y){if(exporting)return;ensureImage(a);const s=size(a);const p={asset:a,x:.5,y:.5,rotation:0,relative:clamp(Math.max(s.w,s.h)/Math.min(W,H),MIN_SCALE,MAX_SCALE)};placed.push(p);selected=p;keep(p,x,y);draw();status.textContent=`${a.label} adicionada. Você pode usar este elemento novamente pela barra lateral.`;}
function point(e){const r=canvas.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
function stitchBetween(a,b){return {x1:clamp(a.x/W,0,1),y1:clamp(a.y/H,0,1),x2:clamp(b.x/W,0,1),y2:clamp(b.y/H,0,1)};}
function hit(p,x,y){
  const a=p.asset,{w,h}=dimensions(p),q=localPoint(p,x,y);
  const mx=Math.floor((q.x+w/2)/w*a.maskWidth),my=Math.floor((q.y+h/2)/h*a.maskHeight);
  if(mx<0||my<0||mx>=a.maskWidth||my>=a.maskHeight)return false;
  const bit=my*a.maskWidth+mx;
  return !!(masks.get(a.id)[bit>>3]&(1<<(bit&7)));
}
function insideSelection(p,x,y,pad=0){
  const {w,h}=dimensions(p),q=localPoint(p,x,y);
  return Math.abs(q.x)<=Math.max(36,w)/2+pad&&Math.abs(q.y)<=Math.max(36,h)/2+pad;
}
function pinchHit(p,x,y){return insideSelection(p,x,y,60);}
function findPinchTarget(a,b){const ordered=selected?[selected,...[...placed].reverse().filter(p=>p!==selected)]:[...placed].reverse();return ordered.find(p=>pinchHit(p,a.x,a.y)&&pinchHit(p,b.x,b.y))||null;}
function startCatalog(e,a,b){if(e.button!==0||drag||exporting)return;e.preventDefault();const s=size(a);ghost.replaceChildren();const im=document.createElement('img');im.src=a.src;im.style.width=s.w+'px';im.style.height=s.h+'px';ghost.append(im);ghost.style.display='block';drag={type:'new',asset:a,id:e.pointerId,owner:b,startX:e.clientX,startY:e.clientY,im,s,moved:false};b.setPointerCapture(e.pointerId);update(e);}
function overSidebar(e){const r=sidebar.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;}
function update(e){
 if(touchPoints.has(e.pointerId)){
   const q=point(e);touchPoints.set(e.pointerId,q);
   if(pinch&&pinch.ids.every(id=>touchPoints.has(id))){
     const a=touchPoints.get(pinch.ids[0]),b=touchPoints.get(pinch.ids[1]);
     const distance=Math.max(8,Math.hypot(b.x-a.x,b.y-a.y));
     const midX=(a.x+b.x)/2,midY=(a.y+b.y)/2;
     pinch.p.relative=clamp(pinch.startRelative*(distance/pinch.startDistance),MIN_SCALE,MAX_SCALE);
      pinch.p.rotation=normalizeRotation(pinch.original.rotation+(Math.atan2(b.y-a.y,b.x-a.x)-pinch.startAngle)*180/Math.PI);
     keep(pinch.p,pinch.startCenterX+(midX-pinch.startMidX),pinch.startCenterY+(midY-pinch.startMidY));
     e.preventDefault();draw();return;
   }
 }
 if(!drag||e.pointerId!==drag.id)return;
 if(drag.type==='stitch'){drag.end=point(e);stitchPreview=stitchBetween(drag.start,drag.end);e.preventDefault();draw();return;}
 if(drag.type==='new'){drag.im.style.left=e.clientX-drag.s.w/2+'px';drag.im.style.top=e.clientY-drag.s.h/2+'px';if(Math.hypot(e.clientX-drag.startX,e.clientY-drag.startY)>6)drag.moved=true;}
 else if(drag.type==='move'){
    const q=point(e);keep(drag.p,q.x-drag.dx,q.y-drag.dy);
    sidebar.classList.toggle('drop-ready',overSidebar(e));draw();
  }else{
    const q=point(e),dx=q.x-drag.centerX,dy=q.y-drag.centerY;
    if(drag.type==='resize'){
      const distance=Math.max(1,Math.hypot(dx,dy));
      setScale(drag.p,drag.original.relative*distance/drag.startDistance);
    }else{
      let rotation=drag.original.rotation+(Math.atan2(dy,dx)-drag.startAngle)*180/Math.PI;
      if(e.shiftKey)rotation=Math.round(rotation/15)*15;
      setRotation(drag.p,rotation);
    }
  }
}
canvas.addEventListener('pointerdown',e=>{
 if(exporting||(e.pointerType!=='touch'&&e.button!==0))return;
 const q=point(e);
 if(stitchMode){
   if(drag||pinch)return;
   if(e.pointerType==='touch')touchPoints.set(e.pointerId,q);
   canvas.setPointerCapture(e.pointerId);drag={type:'stitch',id:e.pointerId,owner:canvas,start:q,end:q};stitchPreview=stitchBetween(q,q);e.preventDefault();draw();return;
 }
 if(e.pointerType==='touch'){
   touchPoints.set(e.pointerId,q);canvas.setPointerCapture(e.pointerId);
   if(touchPoints.size===2){
     const entries=[...touchPoints.entries()].slice(0,2),a=entries[0][1],b=entries[1][1],target=findPinchTarget(a,b),distance=Math.hypot(b.x-a.x,b.y-a.y);
     if(target&&distance>8){
       selected=target;placed.splice(placed.indexOf(target),1);placed.push(target);
       pinch={p:target,ids:[entries[0][0],entries[1][0]],original:snapshot(target),startAngle:Math.atan2(b.y-a.y,b.x-a.x),startDistance:distance,startRelative:target.relative,startCenterX:target.x*W,startCenterY:target.y*H,startMidX:(a.x+b.x)/2,startMidY:(a.y+b.y)/2};
       drag=null;sidebar.classList.remove('drop-ready');e.preventDefault();draw();return;
     }
   }
 }
 if(drag)return;
 selected=[...placed].reverse().find(p=>hit(p,q.x,q.y))||(selected&&insideSelection(selected,q.x,q.y,8)?selected:null);
 if(selected){
   e.preventDefault();placed.splice(placed.indexOf(selected),1);placed.push(selected);
   drag={type:'move',id:e.pointerId,owner:canvas,p:selected,dx:q.x-selected.x*W,dy:q.y-selected.y*H,original:snapshot(selected)};
   if(!canvas.hasPointerCapture(e.pointerId))canvas.setPointerCapture(e.pointerId);canvas.focus();
 }
 draw();
});
document.addEventListener('pointermove',update);
function finish(e,cancel=false){
  if(!drag||(e&&e.pointerId!==drag.id))return;
  const d=drag;drag=null;ghost.style.display='none';sidebar.classList.remove('drop-ready');
  if(d.owner.hasPointerCapture(d.id))d.owner.releasePointerCapture(d.id);
  if(cancel){if(d.p)Object.assign(d.p,d.original);stitchPreview=null;}
  else if(d.type==='move'&&e&&overSidebar(e)){discard();}
  else if(d.type==='new'){
    const q=point(e);if(!d.moved)add(d.asset,W/2,H/2);else if(q.x>=0&&q.y>=0&&q.x<=W&&q.y<=H)add(d.asset,q.x,q.y);
  }else if(d.type==='stitch'){
    const q=e?point(e):d.end,line=stitchBetween(d.start,q);
    if(Math.hypot((line.x2-line.x1)*W,(line.y2-line.y1)*H)>=6){stitches.push(line);status.textContent='Costura reta vermelha adicionada. Arraste novamente para fazer outra.';}
    stitchPreview=null;
  }
  draw();
}
function endPointer(e,cancel=false){
  const wasTouch=touchPoints.has(e.pointerId);if(wasTouch)touchPoints.delete(e.pointerId);
  if(pinch&&pinch.ids.includes(e.pointerId)){
    const gesture=pinch;pinch=null;drag=null;
    if(cancel)Object.assign(gesture.p,gesture.original);
    const remaining=[...touchPoints.entries()].find(([id])=>gesture.ids.includes(id));
    if(remaining&&!cancel){
      const [id,q]=remaining;
      drag={type:'move',id,owner:canvas,p:gesture.p,dx:q.x-gesture.p.x*W,dy:q.y-gesture.p.y*H,original:snapshot(gesture.p)};
    }
    sidebar.classList.remove('drop-ready');
    if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);draw();return;
  }
  finish(e,cancel);
  if(wasTouch&&canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);
}
function cancelGesture(){
  if(pinch){Object.assign(pinch.p,pinch.original);pinch=null;}
  finish(null,true);
  for(const id of touchPoints.keys())if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);
  touchPoints.clear();draw();
}
document.addEventListener('pointerup',e=>endPointer(e));
document.addEventListener('pointercancel',e=>endPointer(e,true));
window.addEventListener('blur',cancelGesture);
function discard(){if(!selected||exporting)return;const label=selected.asset.label;placed.splice(placed.indexOf(selected),1);selected=null;refresh();draw();status.textContent=`${label} devolvida à barra lateral.`;}

function duplicateSelected(){
  if(!selected||exporting||drag||pinch)return;
  const copy={...selected},offset=24;
  keep(copy,copy.x*W+(copy.x>.5?-offset:offset),copy.y*H+(copy.y>.5?-offset:offset));
  placed.push(copy);selected=copy;draw();canvas.focus();
  status.textContent=`${copy.asset.label} duplicada com o mesmo tamanho e rotação. A cópia está selecionada.`;
}
duplicate.addEventListener('click',duplicateSelected);
stitchTool.addEventListener('click',()=>{
  if(exporting||drag||pinch)return;
  stitchMode=!stitchMode;draw();
  status.textContent=stitchMode?'Costura ativa. Arraste na obra para desenhar uma linha vermelha reta.':'Costura desativada.';
});

function startTransform(e,type){
  if(!selected||exporting||drag||pinch||e.button!==0)return;
  e.preventDefault();
  const q=point(e),centerX=selected.x*W,centerY=selected.y*H;
  drag={type,id:e.pointerId,owner:e.currentTarget,p:selected,original:snapshot(selected),centerX,centerY,
    startDistance:Math.max(1,Math.hypot(q.x-centerX,q.y-centerY)),startAngle:Math.atan2(q.y-centerY,q.x-centerX)};
  e.currentTarget.setPointerCapture(e.pointerId);canvas.focus();draw();
}
document.getElementById('resize-handle').addEventListener('pointerdown',e=>startTransform(e,'resize'));
document.getElementById('rotate-handle').addEventListener('pointerdown',e=>startTransform(e,'rotate'));
function keyboardTransform(e){
  if(exporting)return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&stitches.length){e.preventDefault();stitches.pop();draw();status.textContent='Última costura removida.';return;}
  if(e.key==='Escape'){e.preventDefault();const active=!!drag||!!pinch;cancelGesture();if(!active)selected=null;draw();canvas.focus();return;}
  if(e.key==='Enter'&&e.target===canvas){
    e.preventDefault();selected=placed[(placed.indexOf(selected)+1)%placed.length]||null;draw();return;
  }
  if(!selected||e.target instanceof HTMLInputElement)return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'){e.preventDefault();duplicateSelected();return;}
  if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();discard();return;}
  const dirs={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  if(dirs[e.key]){
    e.preventDefault();const [x,y]=dirs[e.key],step=e.shiftKey?10:1;
    keep(selected,selected.x*W+x*step,selected.y*H+y*step);draw();
  }else if(e.key==='+'||e.key==='='||e.key==='-'){
    e.preventDefault();setScale(selected,selected.relative*(e.key==='-'?1/1.12:1.12));
  }else if(e.key==='['||e.key===']'){
    e.preventDefault();setRotation(selected,selected.rotation+(e.key==='['?-1:1)*(e.shiftKey?15:1));
  }
}
canvas.addEventListener('keydown',keyboardTransform);
selection.addEventListener('keydown',keyboardTransform);
document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>{category=b.dataset.kind;document.querySelectorAll('.tab').forEach(t=>{t.classList.toggle('active',t===b);t.setAttribute('aria-pressed',String(t===b));});catalog.scrollTop=0;refresh();}));
download.addEventListener('click',async()=>{if(exporting||!placed.length)return;exporting=true;download.textContent='Preparando…';draw();try{await Promise.all([...placed.map(p=>images.get(p.asset.id).decode()),...(backgroundImages.has(background)?[backgroundImages.get(background).decode()]:[])]);const out=document.createElement('canvas'),factor=3000/Math.max(W,H);out.width=Math.round(W*factor);out.height=Math.round(H*factor);render(out.getContext('2d'),out.width,out.height);const blob=await new Promise((resolve,reject)=>out.toBlob(b=>b?resolve(b):reject(new Error('JPG indisponível')),'image/jpeg',.95));const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='minha-obra.jpg';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);status.textContent='JPG preparado para download.';}catch(error){status.textContent='Não foi possível baixar. Tente novamente.';alert('Não foi possível baixar o JPG. Tente novamente.');}finally{exporting=false;download.textContent='salvar JPG';draw();}});
new ResizeObserver(resize).observe(workspace);refresh();resize();
const mc=document.modelContext;if(mc?.registerTool){try{Promise.resolve(mc.registerTool({name:'read_composition',description:'Read the pieces placed in the artwork.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({pieces:placed.map(p=>({id:p.asset.id,x:p.x,y:p.y,relative:p.relative,rotation:p.rotation})),width:W,height:H,background})})).catch(()=>{});}catch(_){}}
})();
