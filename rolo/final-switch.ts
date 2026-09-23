/** Finish the textile journey in-place: the same switch remains mounted while the page blacks out. */
export function initializeFinalSwitch(journey: HTMLElement) {
  const artwork = journey.querySelector<HTMLImageElement>('.lace-art');
  const scene = artwork?.closest<HTMLElement>('.scene-lace');
  if (!artwork || !scene) return;

  const sceneLabel = scene.getAttribute('aria-label');
  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const originalThemeColor = themeColor?.content ?? null;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'final-switch';
  button.setAttribute('aria-label', 'Apagar a luz');

  for (const [className, filename] of [['switch-frame', 'interruptor-moldura'], ['switch-key', 'interruptor-tecla']]) {
    const image = document.createElement('img');
    image.className = className;
    image.src = new URL(`./assets/${filename}.webp`, window.location.href).href;
    image.width = 1235;
    image.height = 1583;
    image.alt = '';
    image.draggable = false;
    button.append(image);
  }

  scene.classList.replace('scene-lace', 'scene-switch');
  scene.setAttribute('aria-label', 'Interruptor no fim do cordão de miçangas');
  artwork.replaceWith(button);

  function switchOff() {
    if (button.disabled) return;

    // Keep this exact DOM node and its current layout position. Only the page state changes.
    button.disabled = true;
    button.classList.add('is-off');
    journey.classList.add('final-blackout-active');
    document.documentElement.classList.add('final-blackout-active');
    document.body.classList.add('final-blackout-active');
    if (themeColor) themeColor.content = '#000000';
  }

  button.addEventListener('click', switchOff);

  return () => {
    button.removeEventListener('click', switchOff);
    journey.classList.remove('final-blackout-active');
    document.documentElement.classList.remove('final-blackout-active');
    document.body.classList.remove('final-blackout-active');
    if (themeColor && originalThemeColor !== null) themeColor.content = originalThemeColor;
    button.replaceWith(artwork);
    scene.classList.replace('scene-switch', 'scene-lace');
    if (sceneLabel !== null) scene.setAttribute('aria-label', sceneLabel);
  };
}
