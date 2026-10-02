import embroideries from './embroideries.json';
import { initializeScrollJourney } from './scroll-journey';

const journey = document.querySelector<HTMLElement>('.journey')!;
const track = document.querySelector<HTMLElement>('.horizontal-track')!;
const stage = document.querySelector<HTMLElement>('.stage')!;
const cloth = document.querySelector<HTMLElement>('.cloth')!;
const container = document.querySelector<HTMLElement>('.embroideries')!;
const roll = document.querySelector<HTMLButtonElement>('.roll')!;
const experience = document.querySelector<HTMLElement>('.experience')!;
const template = document.querySelector<HTMLTemplateElement>('#vertical-scenes')!;
let opened = false;
let continuation = false;
let cleanupScroll: (() => void) | undefined;

const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const image = entry.target as HTMLImageElement;
    image.src = image.dataset.src!;
    observer.unobserve(image);
  }
}, { root: track, rootMargin: '0px 100%' });

const elements = embroideries.map(item => {
  const wrapper = document.createElement('div');
  wrapper.className = 'embroidery';
  wrapper.dataset.order = String(item.id);
  const art = document.createElement('div');
  art.className = 'embroidery-art';
  const image = document.createElement('img');
  image.dataset.src = item.file;
  image.alt = item.alt;
  image.draggable = false;
  image.decoding = 'async';
  art.append(image); wrapper.append(art); container.append(wrapper);
  return { item, wrapper, art, image };
});

function layout(): void {
  const height = cloth.getBoundingClientRect().height;
  const displayHeight = height * 0.9;
  const gap = height * 0.12;
  const startPadding = height * 0.16;
  const endPadding = Math.min(Math.max(180, height * 0.42), window.innerWidth * 0.16);
  let totalWidth = 0;
  for (const { item, wrapper, art, image } of elements) {
    const rotated = Math.abs(item.rotation) % 180 === 90;
    const width = rotated ? item.bounds.height : item.bounds.width;
    const visibleHeight = rotated ? item.bounds.width : item.bounds.height;
    const scale = displayHeight / visibleHeight;
    totalWidth += width * scale;
    wrapper.style.width = `${width * scale}px`;
    wrapper.style.height = `${displayHeight}px`;
    art.style.width = `${item.bounds.width * scale}px`;
    art.style.height = `${item.bounds.height * scale}px`;
    art.style.transform = `translate(-50%, -50%) rotate(${item.rotation}deg)`;
    image.style.width = `${item.width * scale}px`;
    image.style.height = `${item.height * scale}px`;
    image.style.left = `${-item.bounds.x * scale}px`;
    image.style.top = `${-item.bounds.y * scale}px`;
  }
  const length = Math.max(1920, Math.ceil(totalWidth + gap * (elements.length - 1) + startPadding + endPadding));
  stage.style.setProperty('--fabric-length', `${length}px`);
  container.style.gap = `${gap}px`;
  container.style.paddingLeft = `${startPadding}px`;
  container.style.paddingRight = `${endPadding}px`;
}

function connectScroll(): void {
  cleanupScroll?.();
  cleanupScroll = initializeScrollJourney({ journey, track, onComplete: revealContinuation });
}

function revealContinuation(): void {
  if (continuation) return;
  continuation = true;
  journey.append(template.content.cloneNode(true));
  journey.querySelector<HTMLElement>('.vertical-installation')!.style.setProperty('--cord-image', 'url("./assets/installation/image-01.webp")');
  journey.classList.remove('branch-closed');
  journey.classList.add('branch-open');
  queueMicrotask(connectScroll);
}

roll.addEventListener('click', () => {
  if (opened) return;
  opened = true;
  roll.disabled = true;
  journey.classList.add('journey-started');
  experience.classList.replace('is-locked', 'is-unlocked');
  cloth.setAttribute('aria-hidden', 'false');
  track.tabIndex = 0;
  document.querySelector('#journey-hint')!.textContent = 'Role para baixo para percorrer os bordados →';
  for (const { image } of elements) observer.observe(image);
  connectScroll();
});

new ResizeObserver(layout).observe(cloth);
window.addEventListener('resize', layout);
layout();
