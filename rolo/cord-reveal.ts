type CordElements = {
  journey: HTMLElement;
  track: HTMLElement;
  sequence: HTMLElement;
  experience: HTMLElement;
};

type CordGeometry = {
  distance: number;
  mainTop: number;
  mainHeight: number;
  tailTop: number;
  tailHeight: number;
};

/** Reveal the original bead image with a mask; never stretch the beads. */
export function initializeCordReveal({ journey, track, sequence, experience }: CordElements) {
  const vertical = journey.querySelector<HTMLElement>('.vertical-installation');
  const source = vertical?.querySelector<HTMLElement>('.beaded-cord:not(.beaded-cord-tail)');
  const last = track.querySelector<HTMLElement>('.embroidery[data-order="3"]');
  const cloth = track.querySelector<HTMLElement>('.cloth');
  const heart = vertical?.querySelector<HTMLElement>('.heart-frame');
  const lace = vertical?.querySelector<HTMLElement>('.final-switch');
  if (!vertical || !source || !last || !cloth || !heart || !lace) return;

  const image = getComputedStyle(source).backgroundImage;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const main = makeCord('cord-clean-main');
  const tail = makeCord('cord-clean-tail');
  let geometry: CordGeometry | null = null;
  let revealedTo = 0;
  let target = 0;
  let frame = 0;
  let lastTime = 0;

  function makeCord(className: string) {
    const wrapper = document.createElement('div');
    wrapper.className = className;
    wrapper.setAttribute('aria-hidden', 'true');
    const beads = document.createElement('div');
    beads.className = 'cord-clean-image';
    beads.style.backgroundImage = image;
    wrapper.append(beads);
    journey.append(wrapper);
    return wrapper;
  }

  function paint() {
    if (!geometry) return;
    main.style.height = `${Math.max(0, Math.min(geometry.mainHeight, revealedTo - geometry.mainTop))}px`;
    tail.style.height = `${Math.max(0, Math.min(geometry.tailHeight, revealedTo - geometry.tailTop))}px`;
  }

  function animate(time: number) {
    frame = 0;
    const elapsed = lastTime ? Math.min(64, time - lastTime) : 16;
    lastTime = time;
    revealedTo += (target - revealedTo) * (1 - Math.exp(-elapsed / 300));
    if (Math.abs(target - revealedTo) < 0.5) revealedTo = target;
    paint();
    if (revealedTo !== target) frame = requestAnimationFrame(animate);
    else lastTime = 0;
  }

  function updateReveal() {
    if (!geometry) return;
    if (journey.scrollTop < geometry.distance - 1) {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      revealedTo = geometry.mainTop;
      paint();
      return;
    }

    // Weave only the part reached by the visitor; the remaining cord stays masked.
    target = Math.max(revealedTo, journey.scrollTop + journey.clientHeight);
    if (reducedMotion.matches) {
      cancelAnimationFrame(frame);
      frame = 0;
      revealedTo = target;
      paint();
    } else if (!frame && target > revealedTo) {
      frame = requestAnimationFrame(animate);
    }
  }

  function measure() {
    if (!vertical || !source || !last || !cloth || !heart || !lace) return;
    const viewport = journey.getBoundingClientRect();
    const artwork = last.getBoundingClientRect();
    const distance = sequence.offsetHeight - experience.offsetHeight;
    // The teardrop is centered in the last artwork's original visible bounds.
    const anchorX = artwork.left - viewport.left + artwork.width / 2 + track.scrollLeft - distance;
    vertical.style.setProperty('--branch-x', `${anchorX}px`);

    const heartBounds = heart.getBoundingClientRect();
    const heartTop = heartBounds.top - viewport.top + journey.scrollTop;
    const mainTop = distance + cloth.getBoundingClientRect().bottom - experience.getBoundingClientRect().top - 16;
    const tailTop = heartTop + heartBounds.width * 389 / 440;
    const tailBottom = lace.getBoundingClientRect().top - viewport.top + journey.scrollTop - (96 / 2.54) * 2.5;
    const width = source.getBoundingClientRect().width;

    revealedTo = geometry ? revealedTo + mainTop - geometry.mainTop : mainTop;
    geometry = {
      distance,
      mainTop,
      mainHeight: Math.max(0, heartTop + Math.max(18, heartBounds.height * 0.07) - mainTop),
      tailTop,
      tailHeight: Math.max(0, tailBottom - tailTop),
    };
    Object.assign(main.style, { left: `${anchorX}px`, top: `${mainTop}px`, width: `${width}px` });
    Object.assign(tail.style, {
      left: `${heartBounds.left - viewport.left + heartBounds.width * 236.5 / 440}px`,
      top: `${tailTop}px`,
      width: `${width}px`,
    });
    paint();
    updateReveal();
  }

  const observer = new ResizeObserver(measure);
  for (const element of [journey, sequence, track, heart, lace]) observer.observe(element);
  journey.addEventListener('scroll', updateReveal, { passive: true });
  vertical.addEventListener('load', measure, true);
  reducedMotion.addEventListener('change', updateReveal);
  measure();

  return () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
    journey.removeEventListener('scroll', updateReveal);
    vertical.removeEventListener('load', measure, true);
    reducedMotion.removeEventListener('change', updateReveal);
    main.remove();
    tail.remove();
  };
}
