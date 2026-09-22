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

// A única revelação disponível ainda é a imagem de teste “Aberta”.
// O campo fica ligado a cada carta para poder receber textos próprios depois.
for (const card of cards) card.revelation = 'Aberta';

const grid = document.getElementById('cards');
const viewer = document.getElementById('viewer');
const reading = document.getElementById('reading');
const slots = [...document.querySelectorAll('.reading-card-slot')];
const prayerImage = document.getElementById('prayer-image');
const closeButton = document.getElementById('close-viewer');
const selectionStatus = document.getElementById('selection-status');
const imageCache = new Map();
const buttons = [];
const backs = new WeakMap();
let phase = 'selecting';
let selected = [];
let runId = 0;

function loadFront(filename) {
  if (imageCache.has(filename)) return imageCache.get(filename);
  const pending = new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = async () => {
      if (image.decode) {
        try { await image.decode(); } catch { /* A imagem carregada continua disponível. */ }
      }
      resolve(image);
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
    easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both'
  });
  try { await animation.finished; } catch { return; }
  Object.assign(element.style, frames.at(-1));
  animation.cancel();
}

function rectStyles(rect) {
  return { left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px' };
}

function createRevelationCopy(card) {
  const canvas = document.createElement('canvas');
  canvas.className = 'reading-revelation';
  canvas.width = prayerImage.width;
  canvas.height = prayerImage.height;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `Revelação da carta ${card.name}: ${card.revelation}`);
  const context = canvas.getContext('2d');
  if (context) context.drawImage(prayerImage, 0, 0);
  return canvas;
}

async function openReading() {
  const token = ++runId;
  phase = 'opening';
  document.body.classList.add('active');
  const entries = [...selected];
  try {
    const fronts = await Promise.all(entries.map(({ card }) => loadFront(card.front)));
    await renderPrayer(prayerImage);
    if (token !== runId) return;

    entries.forEach(({ card }, index) => {
      const item = slots[index].parentElement;
      item.querySelector('.reading-label').textContent = card.revelation;
      item.querySelector('.reading-name').textContent = card.name;
      item.insertBefore(createRevelationCopy(card), item.querySelector('.reading-label'));
    });
    viewer.hidden = false;
    await new Promise(resolve => requestAnimationFrame(resolve));
    if (token !== runId) return;

    const starts = buttons.map(button => button.getBoundingClientRect());
    const ends = slots.map(slot => slot.getBoundingClientRect());
    const selectedStarts = entries.map(({ button }) => starts[buttons.indexOf(button)]);
    const centerHeight = Math.min(...selectedStarts.map(rect => rect.height), innerHeight - 180);
    const centerWidth = centerHeight * 2 / 3;
    const centerGap = Math.min(14, innerWidth * .025);
    const centerLeft = (innerWidth - centerWidth * 3 - centerGap * 2) / 2;
    const centers = entries.map((_, index) => ({
      left: centerLeft + index * (centerWidth + centerGap),
      top: (innerHeight - centerHeight) / 2,
      width: centerWidth,
      height: centerHeight
    }));
    buttons.forEach((button, index) => {
      Object.assign(button.style, rectStyles(starts[index]), { position: 'fixed', zIndex: selected.some(item => item.button === button) ? '20' : '11' });
      button.classList.remove('picked');
    });

    const chosen = new Set(entries.map(item => item.button));
    const centerX = innerWidth / 2;
    const centerY = innerHeight / 2;
    const routes = buttons.filter(button => !chosen.has(button)).map(button => {
      const rect = button.getBoundingClientRect();
      const dx = rect.left + rect.width / 2 - centerX;
      const dy = rect.top + rect.height / 2 - centerY;
      return { button, rect, dx, dy };
    });
    const factor = Math.max(1, ...routes.map(({ rect, dx, dy }) => Math.min(
      dx > 0 ? (innerWidth - rect.left + 30) / dx : dx < 0 ? (-rect.right - 30) / dx : Infinity,
      dy > 0 ? (innerHeight - rect.top + 30) / dy : dy < 0 ? (-rect.bottom - 30) / dy : Infinity
    )));

    await Promise.all([
      ...routes.map(async ({ button, dx, dy }) => {
        await animate(button, [{ transform: 'none' }, { transform: `translate(${dx * factor}px,${dy * factor}px)` }], 850);
        if (token === runId) button.style.visibility = 'hidden';
      }),
      ...entries.map(({ button }, index) => animate(button, [rectStyles(selectedStarts[index]), rectStyles(centers[index])], 700))
    ]);
    if (token !== runId) return;

    await Promise.all(entries.map(async ({ card, button }, index) => {
      const front = fronts[index].cloneNode(false);
      front.className = 'front';
      front.alt = `Carta de tarô: ${card.name}`;
      await animate(button, [{ transform: 'perspective(1000px) rotateY(0deg)' }, { transform: 'perspective(1000px) rotateY(90deg)' }], 350);
      if (token !== runId) return;
      button.replaceChildren(front);
      await animate(button, [{ transform: 'perspective(1000px) rotateY(-90deg)' }, { transform: 'none' }], 350);
    }));
    if (token !== runId) return;

    await Promise.all(entries.map(({ button }, index) => animate(button, [rectStyles(centers[index]), rectStyles(ends[index])], 700)));
    if (token !== runId) return;

    entries.forEach(({ button }, index) => {
      slots[index].append(button);
      button.classList.remove('selected', 'picked');
      button.classList.add('reading-card');
      button.removeAttribute('style');
    });
    reading.classList.add('is-ready');
    phase = 'reading';
    selectionStatus.textContent = 'Leitura completa';
    closeButton.focus({ preventScroll: true });
  } catch (error) {
    if (token === runId) {
      reset();
      console.error(error);
    }
  }
}

function choose(card, button) {
  if (phase !== 'selecting') return;
  const existing = selected.findIndex(item => item.button === button);
  if (existing !== -1) {
    selected.splice(existing, 1);
    button.classList.remove('picked');
    button.setAttribute('aria-pressed', 'false');
    selectionStatus.textContent = `${selected.length} de 3 cartas selecionadas`;
    return;
  }
  selected.push({ card, button });
  button.classList.add('picked');
  button.setAttribute('aria-pressed', 'true');
  selectionStatus.textContent = `${selected.length} de 3 cartas selecionadas`;
  if (selected.length === 3) void openReading();
}

function reset() {
  runId++;
  const returnFocus = selected.at(-1)?.button;
  viewer.hidden = true;
  reading.classList.remove('is-ready');
  document.body.classList.remove('active');
  for (const item of slots) {
    item.replaceChildren();
    item.parentElement.querySelector('.reading-label').textContent = '';
    item.parentElement.querySelector('.reading-name').textContent = '';
  }
  for (const button of buttons) {
    button.getAnimations().forEach(animation => animation.cancel());
    button.classList.remove('selected', 'picked', 'reading-card');
    button.removeAttribute('style');
    button.setAttribute('aria-pressed', 'false');
    button.replaceChildren(backs.get(button));
    grid.append(button);
  }
  selected = [];
  phase = 'selecting';
  selectionStatus.textContent = '0 de 3 cartas selecionadas';
  returnFocus?.focus({ preventScroll: true });
}

cards.forEach((card, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'card';
  button.setAttribute('aria-label', 'Selecionar carta ' + (index + 1));
  button.setAttribute('aria-pressed', 'false');
  const image = new Image();
  image.className = 'card-image';
  image.src = './assets/versos/' + card.back;
  image.alt = '';
  image.draggable = false;
  button.append(image);
  backs.set(button, image);
  button.addEventListener('click', () => choose(card, button));
  buttons.push(button);
  grid.append(button);
});

closeButton.addEventListener('click', reset);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && (phase !== 'selecting' || selected.length)) reset();
});
