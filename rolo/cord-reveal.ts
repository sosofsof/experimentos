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
  heartTop: number;
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
  const lace = vertical?.querySelector<HTMLImageElement>('.lace-art');
  if (!vertical || !source || !last || !cloth || !heart || !lace) return;

  const image = getComputedStyle(source).backgroundImage;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const originalHeartTransform = heart.style.transform;
  const originalHeartTransformOrigin = heart.style.transformOrigin;
  const main = makeCord('cord-clean-main');
  const tail = makeCord('cord-clean-tail');
  let geometry: CordGeometry | null = null;
  let revealedTo = 0;
  let target = 0;
  let frame = 0;
  let lastTime = 0;
  let swayFrame = 0;
  let swayLastTime = 0;
  let swayAngle = 0;
  let swayVelocity = 0;
  let swayTarget = 0;
  let previousPointer: { x: number; y: number; time: number } | null = null;

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

  function paintSway() {
    if (!geometry) return;
    const angle = swayAngle;
    const heartOffset = Math.sin(angle) * (geometry.heartTop - geometry.mainTop);
    const tailOffset = Math.sin(angle) * (geometry.tailTop - geometry.mainTop);
    main.style.transformOrigin = '50% 0px';
    tail.style.transformOrigin = '50% 0px';
    main.style.transform = `translateX(-50%) rotate(${angle}rad)`;
    tail.style.transform = `translateX(calc(-50% + ${tailOffset}px)) rotate(${angle}rad)`;
    heart!.style.transformOrigin = '50% 0px';
    heart!.style.transform = `translate(calc(-47.840909% + ${heartOffset}px), -50%) rotate(${angle}rad)`;
  }

  function animateSway(time: number) {
    swayFrame = 0;
    const elapsed = swayLastTime ? Math.min(50, time - swayLastTime) / 1000 : 0.016;
    swayLastTime = time;
    swayVelocity += (swayTarget - swayAngle) * 34 * elapsed - swayVelocity * 8 * elapsed;
    swayAngle = Math.max(-0.075, Math.min(0.075, swayAngle + swayVelocity * elapsed));
    paintSway();
    if (Math.abs(swayTarget - swayAngle) > 0.0005 || Math.abs(swayVelocity) > 0.002) {
      swayFrame = requestAnimationFrame(animateSway);
    } else {
      swayAngle = swayTarget;
      swayVelocity = 0;
      swayLastTime = 0;
      paintSway();
    }
  }

  function startSway() {
    if (!reducedMotion.matches && !swayFrame) swayFrame = requestAnimationFrame(animateSway);
  }

  function onPointerMove(event: PointerEvent) {
    if (!geometry || !event.isPrimary || reducedMotion.matches) return;
    const viewport = journey.getBoundingClientRect();
    const x = event.clientX - viewport.left;
    const y = event.clientY - viewport.top + journey.scrollTop;
    const visibleEnd = Math.min(geometry.tailTop + geometry.tailHeight, revealedTo);
    if (y < geometry.mainTop || y > visibleEnd) {
      swayTarget = 0;
      previousPointer = null;
      startSway();
      return;
    }
    const offsetY = y - geometry.mainTop;
    const cordX = Number.parseFloat(main.style.left || '0') + Math.sin(swayAngle) * offsetY;
    const distance = Math.abs(x - cordX);
    if (distance <= 76) {
      if (previousPointer) {
        const deltaTime = Math.max(8, Math.min(120, event.timeStamp - previousPointer.time));
        const speedX = Math.max(-1.2, Math.min(1.2, (x - previousPointer.x) / deltaTime));
        const speedY = Math.max(-1.2, Math.min(1.2, (y - previousPointer.y) / deltaTime));
        swayVelocity = Math.max(-2.5, Math.min(2.5, swayVelocity + speedX * 2.1 - speedY * 1.1));
      }
      swayTarget = Math.max(-0.045, Math.min(0.045, (x - cordX) * 0.0006));
    } else {
      swayTarget = 0;
    }
    previousPointer = { x, y, time: event.timeStamp };
    startSway();
  }

  function onPointerDown(event: PointerEvent) {
    if (!geometry || !event.isPrimary || reducedMotion.matches) return;
    const viewport = journey.getBoundingClientRect();
    const x = event.clientX - viewport.left;
    const y = event.clientY - viewport.top + journey.scrollTop;
    const end = Math.min(geometry.tailTop + geometry.tailHeight, revealedTo);
    const offsetY = y - geometry.mainTop;
    const cordX = Number.parseFloat(main.style.left || '0') + Math.sin(swayAngle) * offsetY;
    if (y >= geometry.mainTop && y <= end && Math.abs(x - cordX) < 76) {
      swayVelocity = Math.max(-2.5, Math.min(2.5, swayVelocity + (x - cordX || 1) * 0.018));
      swayTarget = Math.max(-0.045, Math.min(0.045, (x - cordX) * 0.0006));
      previousPointer = { x, y, time: event.timeStamp };
      startSway();
    }
  }

  function onPointerEnd(event: PointerEvent) {
    if (!event.isPrimary) return;
    previousPointer = null;
    swayTarget = 0;
    startSway();
  }

  function onPointerLeave() {
    previousPointer = null;
    swayTarget = 0;
    startSway();
  }

  function onMotionChange() {
    updateReveal();
    if (reducedMotion.matches) {
      cancelAnimationFrame(swayFrame);
      swayFrame = 0;
      swayAngle = 0;
      swayVelocity = 0;
      swayTarget = 0;
      paintSway();
    }
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

    const swayTransform = heart.style.transform;
    const swayTransformOrigin = heart.style.transformOrigin;
    heart.style.transform = originalHeartTransform;
    heart.style.transformOrigin = originalHeartTransformOrigin;
    const heartBounds = heart.getBoundingClientRect();
    heart.style.transform = swayTransform;
    heart.style.transformOrigin = swayTransformOrigin;
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
      heartTop,
      tailTop,
      tailHeight: Math.max(0, tailBottom - tailTop),
    };
    Object.assign(main.style, { left: `${anchorX}px`, top: `${mainTop}px`, width: `${width}px` });
    Object.assign(tail.style, {
      left: `${heartBounds.left - viewport.left + heartBounds.width * 236.5 / 440}px`,
      top: `${tailTop}px`,
      width: `${width}px`,
    });
    paintSway();
    paint();
    updateReveal();
  }

  const observer = new ResizeObserver(measure);
  for (const element of [journey, sequence, track, heart, lace]) observer.observe(element);
  journey.addEventListener('scroll', updateReveal, { passive: true });
  journey.addEventListener('pointerdown', onPointerDown, { passive: true });
  journey.addEventListener('pointermove', onPointerMove, { passive: true });
  journey.addEventListener('pointerleave', onPointerLeave);
  journey.addEventListener('pointerup', onPointerEnd, { passive: true });
  journey.addEventListener('pointercancel', onPointerEnd, { passive: true });
  vertical.addEventListener('load', measure, true);
  reducedMotion.addEventListener('change', onMotionChange);
  measure();

  return () => {
    observer.disconnect();
    cancelAnimationFrame(frame);
    cancelAnimationFrame(swayFrame);
    journey.removeEventListener('scroll', updateReveal);
    journey.removeEventListener('pointerdown', onPointerDown);
    journey.removeEventListener('pointermove', onPointerMove);
    journey.removeEventListener('pointerleave', onPointerLeave);
    journey.removeEventListener('pointerup', onPointerEnd);
    journey.removeEventListener('pointercancel', onPointerEnd);
    vertical.removeEventListener('load', measure, true);
    reducedMotion.removeEventListener('change', onMotionChange);
    heart.style.transform = originalHeartTransform;
    heart.style.transformOrigin = originalHeartTransformOrigin;
    main.remove();
    tail.remove();
  };
}
