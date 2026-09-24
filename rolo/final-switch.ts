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
  button.setAttribute('aria-pressed', 'false');

  // Both layers share one download; CSS isolates the frame and the moving key.
  for (const className of ['switch-frame', 'switch-key']) {
    const image = document.createElement('img');
    image.className = className;
    image.src = new URL('./assets/interruptor-desenho.webp', window.location.href).href;
    image.width = 1239;
    image.height = 1269;
    image.alt = '';
    image.draggable = false;
    button.append(image);
  }

  scene.classList.replace('scene-lace', 'scene-switch');
  scene.setAttribute('aria-label', 'Interruptor no fim do cordão de miçangas');
  artwork.replaceWith(button);

  let isOff = false;

  function toggleLight() {
    isOff = !isOff;

    // Keep this exact DOM node and its current layout position. Only the page state changes.
    button.setAttribute('aria-pressed', String(isOff));
    button.setAttribute('aria-label', isOff ? 'Acender a luz' : 'Apagar a luz');
    button.classList.toggle('is-off', isOff);
    journey.classList.toggle('final-blackout-active', isOff);
    document.documentElement.classList.toggle('final-blackout-active', isOff);
    document.body.classList.toggle('final-blackout-active', isOff);
    if (themeColor) themeColor.content = isOff ? '#000000' : (originalThemeColor ?? '');
  }

  button.addEventListener('click', toggleLight);

  return () => {
    button.removeEventListener('click', toggleLight);
    journey.classList.remove('final-blackout-active');
    document.documentElement.classList.remove('final-blackout-active');
    document.body.classList.remove('final-blackout-active');
    if (themeColor && originalThemeColor !== null) themeColor.content = originalThemeColor;
    button.replaceWith(artwork);
    scene.classList.replace('scene-switch', 'scene-lace');
    if (sceneLabel !== null) scene.setAttribute('aria-label', sceneLabel);
  };
}
