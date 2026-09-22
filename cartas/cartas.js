'use strict';
const cards = [
  { name: 'Prisão', front: 'IMG_2776_element_02.png', back: 'IMG_2775_element_01.webp' },
  { name: 'Conversação', front: 'IMG_2777_element_06.png', back: 'IMG_2775_element_02.webp' },
  { name: 'Militar', front: 'IMG_2778_element_03.png', back: 'IMG_2775_element_03.webp' },
  { name: 'Viagem', front: 'IMG_2779_element_06.png', back: 'IMG_2775_element_04.webp' },
  { name: 'Os Delirantes', front: 'IMG_2776_element_01.png', back: 'IMG_2775_element_05.webp' },
  { name: 'Esperança', front: 'IMG_2777_element_04.png', back: 'IMG_2775_element_06.webp' },
  { name: 'Moça', front: 'IMG_2779_element_04.png', back: 'IMG_2775_element_08.webp' },
  { name: 'Consolo', front: 'IMG_2777_element_05.png', back: 'IMG_2775_element_09.webp' },
  { name: 'Mirante', front: 'IMG_2779_element_07.png', back: 'IMG_2775_element_10.webp' },
  { name: 'Viúvo', front: 'IMG_2779_element_01.png', back: 'IMG_2775_element_11.webp' },
  { name: 'Ciúme', front: 'IMG_2779_element_02.png', back: 'IMG_2775_element_12.webp' },
  { name: 'Quarto', front: 'IMG_2776_element_03.png', back: 'IMG_2775_element_13.webp' },
  { name: 'Suspiros', front: 'IMG_2776_element_04.png', back: 'IMG_2775_element_15.webp' },
  { name: 'Amor', front: 'IMG_2778_element_01.png', back: 'IMG_2775_element_14.webp' },
  { name: 'Fortuna', front: 'IMG_2778_element_05.png', back: 'IMG_2775_element_07.webp' },
  { name: 'O Inimigo', front: 'IMG_2778_element_04.png', back: 'IMG_2775_element_07-2.webp' },
  { name: 'Morte', front: 'IMG_2779_element_03.png', back: 'IMG_2775_element_10-2.webp' },
  { name: 'Surpresa agradável', front: 'IMG_2776_element_06.png', back: 'IMG_2775_element_14-2.webp' }
];


const grid = document.getElementById('cards');
const viewer = document.getElementById('viewer');
const prayerImage = document.getElementById('prayer-image');
const closeButton = document.getElementById('close-viewer');
const imageCache = new Map();
let phase = 'idle';
let selected = null;
let originalBack = null;
function loadFront(filename) {
  if (imageCache.has(filename)) return imageCache.get(filename);
  const pending = new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = async () => {
      if (image.decode) {
        try { await image.decode(); } catch { /* A imagem já carregada continua disponível. */ }
      }
      resolve(image.src);
    };
    image.onerror = () => reject(new Error('Image unavailable'));
    image.src = './assets/frentes/' + filename;
  });
  imageCache.set(filename, pending);
  pending.catch(() => imageCache.delete(filename));
  return pending;
}


async function animate(element, frames, duration) {
  const animation = element.animate(frames, {
    duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : duration,
    easing:'cubic-bezier(.4,0,.2,1)', fill:'both'
  });
  await animation.finished;
  Object.assign(element.style, frames.at(-1));
  animation.cancel();
}
function rectStyles(x, y, width, height) {
  return {left:x+'px', top:y+'px', width:width+'px', height:height+'px'};
}
function centeredSize(image) {
  const ratio = image.naturalWidth/image.naturalHeight;
  const height = Math.min(innerHeight-128, (innerWidth-48)/ratio, 760);
  const width = height*ratio;
  return rectStyles((innerWidth-width)/2,(innerHeight-height)/2,width,height);
}
async function openCard(card, button) {
  if (phase !== 'idle') return;
  phase = 'exiting';
  selected = button;
  originalBack = button.firstElementChild;
  const start = button.getBoundingClientRect();
  const positions = [...grid.children].filter(el=>el!==button).map(el=>({el,r:el.getBoundingClientRect()}));
  // The original button stays in its original DOM parent for every stage.
  Object.assign(button.style,rectStyles(start.left,start.top,start.width,start.height));
  button.classList.add('selected');
  document.body.classList.add('active');
  try {
    const frontReady = loadFront(card.front);
    const cx=start.left+start.width/2, cy=start.top+start.height/2;
    const routes=positions.map(({el,r})=>({el,r,dx:r.left+r.width/2-cx,dy:r.top+r.height/2-cy}));
    const factor=Math.max(...routes.map(({r,dx,dy})=>Math.min(
      dx>0?(innerWidth-r.left+30)/dx:dx<0?(-r.right-30)/dx:Infinity,
      dy>0?(innerHeight-r.top+30)/dy:dy<0?(-r.bottom-30)/dy:Infinity
    )));
    await Promise.all(routes.map(async ({el,r,dx,dy})=>{
      // Freeze the layout before the selected button leaves grid flow.
      Object.assign(el.style,rectStyles(r.left,r.top,r.width,r.height),{position:'fixed'});
      await animate(el,[{transform:'none'},{transform:`translate(${dx*factor}px,${dy*factor}px)`}],1000);
      el.style.visibility='hidden';
    }));
    phase='centering';
    const center=rectStyles((innerWidth-start.width)/2,(innerHeight-start.height)/2,start.width,start.height);
    await animate(button,[rectStyles(start.left,start.top,start.width,start.height),center],650);
    const front = new Image();
    front.src=await frontReady;
    await front.decode();
    front.className='front';
    front.alt='Carta de tarô: '+card.name;
    phase='flipping';
    await animate(button,[{transform:'perspective(1000px) rotateY(0deg)'},{transform:'perspective(1000px) rotateY(90deg)'}],350);
    button.replaceChildren(front);
    await animate(button,[{transform:'perspective(1000px) rotateY(-90deg)'},{transform:'none'}],350);
    phase='zooming';
    await animate(button,[center,centeredSize(front)],850);
    viewer.hidden=false;
    phase='card';
  } catch (error) {
    reset();
    console.error(error);
  }
}
async function showPrayer() {
  if (phase !== 'card') return;
  phase='prayer-entering';
  try {
    await renderPrayer(prayerImage);
    const r=selected.getBoundingClientRect();
    const gap=Math.min(64,innerWidth*.04), margin=24;
    const available=innerWidth-2*margin-gap;
    const ratio=selected.firstElementChild.naturalWidth/selected.firstElementChild.naturalHeight;
    const cw=Math.min(available*.28,(innerHeight-128)*ratio);
    const ch=cw/ratio;
    const pw=available-cw;
    const ph=Math.min(pw*prayerImage.height/prayerImage.width,innerHeight-128);
    const actualPW=ph*prayerImage.width/prayerImage.height;
    const left=(innerWidth-cw-gap-actualPW)/2;
    Object.assign(prayerImage.style,rectStyles(left+cw+gap,(innerHeight-ph)/2,actualPW,ph));
    prayerImage.hidden=false;
    await Promise.all([
      animate(selected,[rectStyles(r.left,r.top,r.width,r.height),rectStyles(left,(innerHeight-ch)/2,cw,ch)],800),
      animate(prayerImage,[{transform:`translateX(${innerWidth-left-cw-gap+32}px)`},{transform:'none'}],800)
    ]);
    phase='prayer';
  } catch(error) { phase='card'; console.error(error); }
}
function reset() {
  viewer.hidden=true;
  prayerImage.hidden=true;
  document.body.classList.remove('active');
  for(const el of grid.children) {
    el.getAnimations().forEach(a=>a.cancel());
    el.removeAttribute('style');
    el.classList.remove('selected');
  }
  if(selected && originalBack) selected.replaceChildren(originalBack);
  selected?.focus({preventScroll:true});
  selected=null;
  phase='idle';
}
cards.forEach((card,index)=>{
  const button=document.createElement('button');
  button.type='button';
  button.className='card';
  button.setAttribute('aria-label','Revelar carta '+(index+1));
  const image=new Image();
  image.className='card-image';
  image.src='./assets/versos/' + card.back;
  image.alt='';
  image.draggable=false;
  button.append(image);
  button.addEventListener('click',()=>openCard(card,button));
  grid.append(button);
});
document.addEventListener('click',event=>{
  if(event.target.closest('#close-viewer')) { reset(); return; }
  showPrayer();
});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape' && ['card','prayer'].includes(phase)) reset();
});
