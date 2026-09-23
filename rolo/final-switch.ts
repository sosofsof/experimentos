const SWITCH_FILTER_ID = 'switch-deep-red';

function ensureSwitchFilter() {
  if (document.getElementById(SWITCH_FILTER_ID)) return;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'fixed';
  svg.style.pointerEvents = 'none';
  svg.innerHTML = `
    <filter id="${SWITCH_FILTER_ID}" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
      <feComponentTransfer>
        <feFuncA type="gamma" amplitude="1" exponent=".32" offset="0"/>
      </feComponentTransfer>
      <feColorMatrix type="matrix" values="
        0 0 0 0 .435
        0 0 0 0 .075
        0 0 0 0 .125
        0 0 0 1 0"/>
    </filter>`;
  document.body.append(svg);
}

/** Finish the textile journey in a separate document with no scrollable past. */
export function initializeFinalSwitch(journey: HTMLElement) {
  const artwork = journey.querySelector<HTMLImageElement>('.lace-art');
  const scene = artwork?.closest<HTMLElement>('.scene-lace');
  if (!artwork || !scene) return;
  const sceneLabel = scene.getAttribute('aria-label');
  ensureSwitchFilter();
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'final-switch';
  button.setAttribute('aria-label', 'Apagar a luz e entrar na tela preta');
  for (const [className, filename] of [['switch-frame', 'interruptor-moldura'], ['switch-key', 'interruptor-tecla']]) {
    const image = document.createElement('img');
    image.className = className;
    image.src = new URL(`./assets/${filename}.svg`, window.location.href).href;
    image.width = 1290;
    image.height = 1650;
    image.alt = '';
    image.draggable = false;
    button.append(image);
  }
  scene.classList.replace('scene-lace', 'scene-switch');
  scene.setAttribute('aria-label', 'Interruptor no fim do cordão de miçangas');
  artwork.replaceWith(button);
  let timer: number | undefined;
  function reset() {
    window.clearTimeout(timer);
    button!.disabled = false;
    button!.classList.remove('is-off');
  }
  function switchOff() {
    const bounds = button!.getBoundingClientRect();
    const viewportWidth = Math.max(1, document.documentElement.clientWidth);
    const viewportHeight = Math.max(1, document.documentElement.clientHeight);
    const target = new URL('./preto.html', window.location.href);
    target.searchParams.set('x', ((bounds.left + bounds.width / 2) / viewportWidth).toFixed(6));
    target.searchParams.set('y', ((bounds.top + bounds.height / 2) / viewportHeight).toFixed(6));

    button!.disabled = true;
    button!.classList.add('is-off');
    const delay = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260;
    timer = window.setTimeout(() => window.location.assign(target), delay);
  }
  button.addEventListener('click', switchOff);
  window.addEventListener('pageshow', reset);
  return () => {
    window.clearTimeout(timer);
    button.removeEventListener('click', switchOff);
    window.removeEventListener('pageshow', reset);
    button.replaceWith(artwork);
    scene.classList.replace('scene-switch', 'scene-lace');
    if (sceneLabel !== null) scene.setAttribute('aria-label', sceneLabel);
  };
}
