import { initializeCordReveal } from './cord-reveal';

type JourneyElements = {
  journey: HTMLElement;
  track: HTMLElement;
  onComplete: () => void;
};

type DragPosition = {
  pointerId: number;
  x: number;
  scrollTop: number;
};

const END_TOLERANCE = 1;

/** One native vertical scroll position drives both parts of the exhibition. */
export function initializeScrollJourney({ journey, track, onComplete }: JourneyElements) {
  const sequence = journey.querySelector<HTMLElement>('.horizontal-sequence');
  const experience = journey.querySelector<HTMLElement>('.experience');
  const stage = track.querySelector<HTMLElement>('.stage');
  const cordArtwork = track.querySelector<HTMLElement>('.embroidery[data-order="3"]');
  const hint = journey.querySelector<HTMLElement>('.journey-hint');
  if (!sequence || !experience || !stage || !hint) return;

  let distance = 0;
  let measured = false;
  let completed = journey.classList.contains('branch-open');
  let frame = 0;
  let drag: DragPosition | null = null;
  let lastScrollTop = journey.scrollTop;

  function update() {
    frame = 0;
    lastScrollTop = journey.scrollTop;
    const position = Math.min(distance, Math.max(0, journey.scrollTop));
    track.scrollLeft = position;
    const atEnd = position >= distance - END_TOLERANCE;
    journey.classList.toggle('horizontal-complete', atEnd);

    if (hint) {
      const message = atEnd
        ? 'Continue rolando ↓'
        : 'Deslize para o lado ou role para baixo →';
      if (hint.textContent !== message) hint.textContent = message;
    }

    if (atEnd && !completed) {
      completed = true;
      onComplete();
    }
  }

  function scheduleUpdate() {
    if (!frame) frame = requestAnimationFrame(update);
  }

  function measure() {
    if (!sequence || !experience || !stage) return;
    const previousDistance = distance;
    const previousTop = lastScrollTop;
    // Finish with the existing connection point centered, without moving it on the cloth.
    const artworkBounds = cordArtwork?.getBoundingClientRect();
    const connectionX = artworkBounds
      ? artworkBounds.left - track.getBoundingClientRect().left + track.scrollLeft + artworkBounds.width / 2
      : null;
    if (connectionX !== null) {
      stage.style.minWidth = `${Math.max(track.clientWidth, Math.ceil(connectionX + track.clientWidth / 2))}px`;
    }
    const nextDistance = connectionX !== null
      ? Math.max(0, connectionX - track.clientWidth / 2)
      : Math.max(0, track.scrollWidth - track.clientWidth);
    const height = experience.clientHeight + nextDistance;
    distance = nextDistance;
    sequence.style.height = `${height}px`;

    // Resizing preserves the current artwork, or the offset into the vertical section.
    if (measured && previousDistance > 0 && previousDistance !== distance) {
      journey.scrollTop = previousTop >= previousDistance - END_TOLERANCE
        ? distance + Math.max(0, previousTop - previousDistance)
        : (previousTop / previousDistance) * distance;
    }
    measured = true;
    update();
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const target = event.target;
    if (target instanceof Element && target.closest('button, a, input, textarea, select, [contenteditable="true"]')) return;

    const page = journey.clientHeight * 0.85;
    const steps: Record<string, number> = {
      ArrowDown: 80,
      ArrowUp: -80,
      ArrowRight: 180,
      ArrowLeft: -180,
      PageDown: page,
      PageUp: -page,
      ' ': page,
    };
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      journey.scrollTop = event.key === 'Home' ? 0 : journey.scrollHeight;
    } else if (Object.hasOwn(steps, event.key)) {
      event.preventDefault();
      journey.scrollTop += steps[event.key];
    }
    // React can commit the continuation before the next gesture reaches the boundary.
    update();
  }

  function onWheel(event: WheelEvent) {
    if (event.ctrlKey || event.metaKey || Math.abs(event.deltaY) >= Math.abs(event.deltaX)) return;
    if (journey.scrollTop > distance + END_TOLERANCE) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? journey.clientHeight : 1;
    event.preventDefault();
    journey.scrollTop += event.deltaX * unit;
    update();
  }

  function onPointerDown(event: PointerEvent) {
    if (!event.isPrimary || event.button !== 0 || journey.scrollTop > distance) return;
    if (event.target instanceof Element && event.target.closest('button, a')) return;
    drag = { pointerId: event.pointerId, x: event.clientX, scrollTop: journey.scrollTop };
    track.setPointerCapture(event.pointerId);
    if (event.pointerType === 'mouse') track.focus({ preventScroll: true });
  }

  function onPointerMove(event: PointerEvent) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    journey.scrollTop = Math.min(distance, Math.max(0, drag.scrollTop + drag.x - event.clientX));
    update();
  }

  function endDrag(event: PointerEvent) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag = null;
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
  }

  const observer = new ResizeObserver(measure);
  observer.observe(track);
  observer.observe(stage);
  observer.observe(experience);
  journey.addEventListener('scroll', scheduleUpdate, { passive: true });
  journey.addEventListener('keydown', onKeyDown);
  track.addEventListener('wheel', onWheel, { passive: false });
  track.addEventListener('pointerdown', onPointerDown);
  track.addEventListener('pointermove', onPointerMove);
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.addEventListener('lostpointercapture', endDrag);

  measure();
  const cleanupCord = initializeCordReveal({ journey, track, sequence, experience });
  track.focus({ preventScroll: true });

  return () => {
    observer.disconnect();
    cleanupCord?.();
    cancelAnimationFrame(frame);
    journey.removeEventListener('scroll', scheduleUpdate);
    journey.removeEventListener('keydown', onKeyDown);
    track.removeEventListener('wheel', onWheel);
    track.removeEventListener('pointerdown', onPointerDown);
    track.removeEventListener('pointermove', onPointerMove);
    track.removeEventListener('pointerup', endDrag);
    track.removeEventListener('pointercancel', endDrag);
    track.removeEventListener('lostpointercapture', endDrag);
    if (drag && track.hasPointerCapture(drag.pointerId)) track.releasePointerCapture(drag.pointerId);
  };
}
