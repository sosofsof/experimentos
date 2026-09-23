import { initializeFinalSwitch } from './final-switch';
import { initializeCordReveal } from './cord-reveal';

type JourneyElements = {
  journey: HTMLElement;
  track: HTMLElement;
  onComplete: () => void;
};

type DragPosition = {
  pointerId: number;
  x: number;
  y: number;
  axis: 'x' | 'y' | null;
  scrollTop: number;
};

const END_TOLERANCE = 1;

const EMBROIDERY_CAPTIONS = new Map([
  ['2', 'Tinha alguma coisa dentro de mim.'],
  ['6', 'Eu sonhava acordada em arrancar aquilo com minhas mãos.'],
  ['5', 'Eu respirava com a ideia do sangue caindo no chão,'],
  ['4', 'de não ter mais nada crescendo na minha barriga.'],
  ['7', 'De noite, eram sempre pesadelos — eu via, escutava, sentia.'],
  ['8', 'De manhã, os pesadelos voltavam para a minha barriga, silenciosos e escondidos.'],
  ['1', 'Mas eu ainda os sentia, apertando meu estômago, meu coração, meu intestino, cada cantinho.'],
]);

const VERTICAL_TEXT = {
  first: [
    'Então eu tentei trazê-los à vida. Eu tento. Talvez, se eu criar meus próprios pesadelos de dia, os que moram na minha barriga precisem descansar de noite.',
    'Talvez, se eu criar minhas próprias orações, eles vão embora para sempre.',
    'Mas não há muito que eu possa fazer pelos pesadelos que vivem no mundo.',
    'Então eu crio também os pesadelos que eu queria que fossem reais.',
  ],
  second: [
    'Talvez meu corpo precise ser meu antes que eu possa controlar todos os parasitas.',
    'Eu não sei se essa parte é possível. Será que meu corpo pode ser meu só porque eu quero que seja?',
    'Eu não sei se foi isso que Deus planejou quando criou o homem e a mulher.',
  ],
  afterLace: [
    'Se Deus medisse o desejo, meu corpo já seria meu, e de noite eu só veria preto, e de dia eu andaria com calma.',
  ],
} as const;

function makeTextBlock(className: string, paragraphs: readonly string[]) {
  const block = document.createElement('div');
  block.className = `vertical-text-block ${className}`;
  for (const text of paragraphs) {
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    block.append(paragraph);
  }
  return block;
}

function renderVerticalTexts(journey: HTMLElement) {
  const vertical = journey.querySelector<HTMLElement>('.vertical-installation');
  const firstScene = vertical?.querySelector<HTMLElement>('.scene-left');
  const secondScene = vertical?.querySelector<HTMLElement>('.scene-right');
  const lace = vertical?.querySelector<HTMLElement>('.final-switch');
  if (!vertical || !firstScene || !secondScene || !lace) return;

  vertical.querySelectorAll('.vertical-text-block').forEach((node) => node.remove());
  const first = makeTextBlock('vertical-text-first', VERTICAL_TEXT.first);
  const second = makeTextBlock('vertical-text-second', VERTICAL_TEXT.second);
  const afterLace = makeTextBlock('vertical-text-after-lace', VERTICAL_TEXT.afterLace);

  // Each scene owns its text coordinates, just as it owns its textile.
  firstScene.append(first);
  secondScene.append(second);
  // Normal flow reserves real scroll space after the final artwork.
  vertical.append(afterLace);

  function fitScenes() {
    firstScene!.style.setProperty('--narrative-height', `${first.scrollHeight + 64}px`);
    secondScene!.style.setProperty('--narrative-height', `${second.scrollHeight + 64}px`);
  }

  function fitFinalTail() {
    const journeyBounds = journey.getBoundingClientRect();
    const switchBounds = lace.getBoundingClientRect();
    const switchCenter = switchBounds.top - journeyBounds.top + journey.scrollTop + switchBounds.height / 2;
    const currentPadding = Number.parseFloat(getComputedStyle(afterLace).paddingBottom) || 0;
    const currentTail = journey.scrollHeight - switchCenter;
    const desiredTail = journey.clientHeight / 2;
    const nextPadding = Math.max(64, currentPadding + desiredTail - currentTail);
    if (Math.abs(nextPadding - currentPadding) > 1) {
      afterLace.style.setProperty('--final-bottom-space', `${nextPadding}px`);
    }
  }

  const resizeObserver = new ResizeObserver(() => {
    fitScenes();
    fitFinalTail();
  });
  resizeObserver.observe(first);
  resizeObserver.observe(second);
  resizeObserver.observe(lace);
  resizeObserver.observe(afterLace);
  resizeObserver.observe(journey);
  fitScenes();
  fitFinalTail();

  return () => {
    resizeObserver.disconnect();
    firstScene.style.removeProperty('--narrative-height');
    secondScene.style.removeProperty('--narrative-height');
    afterLace.style.removeProperty('--final-bottom-space');
    first.remove();
    second.remove();
    afterLace.remove();
  };
}

/** Native horizontal touch scrolling shares progress with the vertical journey. */
export function initializeScrollJourney({ journey, track, onComplete }: JourneyElements) {
  const sequence = journey.querySelector<HTMLElement>('.horizontal-sequence');
  const experience = journey.querySelector<HTMLElement>('.experience');
  const stage = track.querySelector<HTMLElement>('.stage');
  const cordArtwork = track.querySelector<HTMLElement>('.embroidery[data-order="3"]');
  if (!sequence || !experience || !stage) return;
  const captionStage = stage;

  let distance = 0;
  let measured = false;
  let completed = journey.classList.contains('branch-open');
  let frame = 0;
  let drag: DragPosition | null = null;
  let lastScrollTop = journey.scrollTop;
  let lastTrackLeft = track.scrollLeft;

  function renderCaptions() {
    const cloth = captionStage.querySelector<HTMLElement>('.cloth');
    const artworks = captionStage.querySelectorAll<HTMLElement>('.embroidery[data-order]');
    if (!cloth || !artworks.length) return;
    captionStage.querySelector('.embroidery-caption-layer')?.remove();
    const layer = document.createElement('div');
    layer.className = 'embroidery-caption-layer';
    const stageBounds = captionStage.getBoundingClientRect();
    const clothBounds = cloth.getBoundingClientRect();
    for (const artwork of artworks) {
      const text = EMBROIDERY_CAPTIONS.get(artwork.dataset.order || '');
      if (!text) continue;
      const bounds = artwork.getBoundingClientRect();
      const caption = document.createElement('p');
      caption.className = 'embroidery-caption';
      caption.textContent = text;
      caption.style.left = `${bounds.left - stageBounds.left + bounds.width / 2}px`;
      caption.style.top = `${clothBounds.bottom - stageBounds.top + 18}px`;
      layer.append(caption);
    }
    captionStage.append(layer);
  }

  function update() {
    frame = 0;
    lastScrollTop = journey.scrollTop;
    const position = Math.min(distance, Math.max(0, journey.scrollTop));
    // Avoid resetting native momentum for an already synchronized position.
    if (Math.abs(track.scrollLeft - position) > END_TOLERANCE) {
      track.scrollLeft = position;
    }
    lastTrackLeft = track.scrollLeft;
    const atEnd = position >= distance - END_TOLERANCE;
    journey.classList.toggle('horizontal-complete', atEnd);

    if (atEnd && !completed) {
      completed = true;
      onComplete();
    }
  }

  function onTrackScroll() {
    const position = Math.min(distance, Math.max(0, track.scrollLeft));
    // Ignore scroll events caused by our vertical-to-horizontal writes.
    if (Math.abs(position - lastTrackLeft) <= END_TOLERANCE) return;
    lastTrackLeft = position;
    if (journey.scrollTop > distance + END_TOLERANCE) return;
    journey.scrollTop = position;
    update();
  }

  function scheduleUpdate() {
    // A native horizontal frame may arrive before its scroll event.
    onTrackScroll();
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
      stage.style.width = `${Math.max(track.clientWidth, Math.ceil(connectionX + track.clientWidth / 2))}px`;
      stage.style.minWidth = `${Math.max(track.clientWidth, Math.ceil(connectionX + track.clientWidth / 2))}px`;
    }
    const nextDistance = connectionX !== null
      ? Math.max(0, connectionX - track.clientWidth / 2)
      : Math.max(0, track.scrollWidth - track.clientWidth);
    const height = experience.clientHeight + nextDistance;
    distance = nextDistance;
    sequence.style.height = `${height}px`;
    renderCaptions();

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
    // Horizontal wheel/trackpad input belongs to the native horizontal scroller.
    // Vertical wheel input continues through the outer journey.
    if (event.ctrlKey || event.metaKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? journey.clientHeight : 1;
    event.preventDefault();
    journey.scrollTop += event.deltaY * unit;
    update();
  }

  function onPointerDown(event: PointerEvent) {
    // Touch and pen use browser scrolling, including momentum and pinch zoom.
    if (event.pointerType !== 'mouse') return;
    if (!event.isPrimary || event.button !== 0) {
      drag = null;
      return;
    }
    if (event.target instanceof Element && event.target.closest('button, a')) return;
    drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, axis: journey.scrollTop > distance + END_TOLERANCE ? 'y' : null, scrollTop: journey.scrollTop };
    track.setPointerCapture(event.pointerId);
    if (event.pointerType === 'mouse' && !drag.axis) drag.axis = 'x';
    if (event.pointerType === 'mouse') track.focus({ preventScroll: true });
  }

  function onPointerMove(event: PointerEvent) {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = drag.x - event.clientX;
    const dy = drag.y - event.clientY;
    if (!drag.axis) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return;
      drag.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
    }
    // Lock the gesture once, so diagonal swipes do not fight native scrolling.
    journey.scrollTop = Math.max(0, drag.axis === 'x'
      ? Math.min(distance, drag.scrollTop + dx)
      : drag.scrollTop + dy);
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
  track.addEventListener('scroll', onTrackScroll, { passive: true });
  track.addEventListener('wheel', onWheel, { passive: false });
  track.addEventListener('pointerdown', onPointerDown);
  track.addEventListener('pointermove', onPointerMove);
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);
  track.addEventListener('lostpointercapture', endDrag);

  measure();
  track.removeAttribute('aria-describedby');
  const cleanupFinalSwitch = initializeFinalSwitch(journey);
  const cleanupCord = initializeCordReveal({ journey, track, sequence, experience });
  const cleanupVerticalTexts = renderVerticalTexts(journey);
  track.focus({ preventScroll: true });

  return () => {
    observer.disconnect();
    cleanupCord?.();
    cleanupVerticalTexts?.();
    cleanupFinalSwitch?.();
    captionStage.querySelector('.embroidery-caption-layer')?.remove();
    cancelAnimationFrame(frame);
    journey.removeEventListener('scroll', scheduleUpdate);
    journey.removeEventListener('keydown', onKeyDown);
    track.removeEventListener('scroll', onTrackScroll);
    track.removeEventListener('wheel', onWheel);
    track.removeEventListener('pointerdown', onPointerDown);
    track.removeEventListener('pointermove', onPointerMove);
    track.removeEventListener('pointerup', endDrag);
    track.removeEventListener('pointercancel', endDrag);
    track.removeEventListener('lostpointercapture', endDrag);
    if (drag && track.hasPointerCapture(drag.pointerId)) track.releasePointerCapture(drag.pointerId);
  };
}
