/** Finish the textile journey in a separate document with no scrollable past. */
export function initializeFinalSwitch(journey: HTMLElement) {
  const artwork = journey.querySelector<HTMLImageElement>('.lace-art');
  const scene = artwork?.closest<HTMLElement>('.scene-lace');
  if (!artwork || !scene) return;
  const sceneLabel = scene.getAttribute('aria-label');
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
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    try {
      sessionStorage.setItem('rolo-final-switch-position', JSON.stringify({
        x: (bounds.left + bounds.width / 2) / viewportWidth,
        y: (bounds.top + bounds.height / 2) / viewportHeight,
      }));
    } catch {
      // The black page falls back to the viewport center when storage is unavailable.
    }
    button!.disabled = true;
    button!.classList.add('is-off');
    const delay = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260;
    timer = window.setTimeout(() => window.location.assign(new URL('./preto.html', window.location.href)), delay);
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
