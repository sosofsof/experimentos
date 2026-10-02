import type { CatalogAsset } from './artwork.types';
import type { EditorState, Point } from './editor-state';
import {
  MIN_SCALE,
  MAX_SCALE,
  clamp,
  normalizeRotation,
  dimensions as pieceDimensions,
  keep as keepPiece,
  localPoint as pieceLocalPoint,
  hitTest,
  type PlacedPiece,
} from './editor-geometry';
interface Elements {
  canvas: HTMLCanvasElement;
  selection: HTMLElement;
  sidebar: HTMLElement;
  ghost: HTMLElement;
  resizeHandle: HTMLElement;
  rotateHandle: HTMLElement;
}
interface Actions {
  draw(): void;
  size(asset: CatalogAsset): { w: number; h: number };
  add(asset: CatalogAsset, x: number, y: number): void;
  discard(): void;
  duplicateSelected(): void;
}
export function initializeEditorGestures(
  state: EditorState,
  elements: Elements,
  actions: Actions,
  masks: Map<string, Uint8Array>,
) {
  const { canvas, selection, sidebar, ghost, resizeHandle, rotateHandle } = elements;
  const { draw, size, add, discard, duplicateSelected } = actions;
  const dimensions = (piece: PlacedPiece) => pieceDimensions(piece, state.width, state.height);
  const keep = (piece: PlacedPiece, x: number, y: number) =>
    keepPiece(piece, x, y, state.width, state.height);
  const localPoint = (piece: PlacedPiece, x: number, y: number) =>
    pieceLocalPoint(piece, x, y, state.width, state.height);
  function setScale(p: PlacedPiece, relative: number) {
    if (!p || state.exporting) return;
    p.relative = clamp(relative, MIN_SCALE, MAX_SCALE);
    keep(p, p.x * state.width, p.y * state.height);
    draw();
  }
  function setRotation(p: PlacedPiece, rotation: number) {
    if (!p || state.exporting) return;
    p.rotation = normalizeRotation(rotation);
    keep(p, p.x * state.width, p.y * state.height);
    draw();
  }
  function snapshot(p: PlacedPiece) {
    return { x: p.x, y: p.y, relative: p.relative, rotation: p.rotation };
  }
  function point(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  function hit(p: PlacedPiece, x: number, y: number) {
    return hitTest(p, x, y, state.width, state.height, masks.get(p.asset.id)!);
  }
  function insideSelection(p: PlacedPiece, x: number, y: number, pad = 0) {
    const { w, h } = dimensions(p),
      q = localPoint(p, x, y);
    return Math.abs(q.x) <= Math.max(36, w) / 2 + pad && Math.abs(q.y) <= Math.max(36, h) / 2 + pad;
  }
  function pinchHit(p: PlacedPiece, x: number, y: number) {
    return insideSelection(p, x, y, 60);
  }
  function findPinchTarget(a: Point, b: Point) {
    const ordered = state.selected
      ? [state.selected, ...[...state.placed].reverse().filter((p) => p !== state.selected)]
      : [...state.placed].reverse();
    return ordered.find((p) => pinchHit(p, a.x, a.y) && pinchHit(p, b.x, b.y)) || null;
  }
  function startCatalog(e: PointerEvent, a: CatalogAsset, b: HTMLButtonElement) {
    if (e.button !== 0 || state.drag || state.exporting) return;
    e.preventDefault();
    const s = size(a);
    ghost.replaceChildren();
    const im = document.createElement('img');
    im.src = a.src;
    im.style.width = s.w + 'px';
    im.style.height = s.h + 'px';
    ghost.append(im);
    ghost.style.display = 'block';
    state.drag = {
      type: 'new',
      asset: a,
      id: e.pointerId,
      owner: b,
      startX: e.clientX,
      startY: e.clientY,
      im,
      s,
      moved: false,
    };
    b.setPointerCapture(e.pointerId);
    update(e);
  }
  function overSidebar(e: PointerEvent) {
    const r = sidebar.getBoundingClientRect();
    return (
      e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
    );
  }
  function update(e: PointerEvent) {
    if (state.touchPoints.has(e.pointerId)) {
      const q = point(e);
      state.touchPoints.set(e.pointerId, q);
      if (state.pinch && state.pinch.ids.every((id) => state.touchPoints.has(id))) {
        const a = state.touchPoints.get(state.pinch.ids[0])!,
          b = state.touchPoints.get(state.pinch.ids[1])!;
        const distance = Math.max(8, Math.hypot(b.x - a.x, b.y - a.y));
        const midX = (a.x + b.x) / 2,
          midY = (a.y + b.y) / 2;
        state.pinch.p.relative = clamp(
          state.pinch.startRelative * (distance / state.pinch.startDistance),
          MIN_SCALE,
          MAX_SCALE,
        );
        state.pinch.p.rotation = normalizeRotation(
          state.pinch.original.rotation +
            ((Math.atan2(b.y - a.y, b.x - a.x) - state.pinch.startAngle) * 180) / Math.PI,
        );
        keep(
          state.pinch.p,
          state.pinch.startCenterX + (midX - state.pinch.startMidX),
          state.pinch.startCenterY + (midY - state.pinch.startMidY),
        );
        e.preventDefault();
        draw();
        return;
      }
    }
    if (!state.drag || e.pointerId !== state.drag.id) return;
    if (state.drag.type === 'new') {
      state.drag.im.style.left = e.clientX - state.drag.s.w / 2 + 'px';
      state.drag.im.style.top = e.clientY - state.drag.s.h / 2 + 'px';
      if (Math.hypot(e.clientX - state.drag.startX, e.clientY - state.drag.startY) > 6)
        state.drag.moved = true;
    } else if (state.drag.type === 'move') {
      const q = point(e);
      keep(state.drag.p, q.x - state.drag.dx, q.y - state.drag.dy);
      sidebar.classList.toggle('drop-ready', overSidebar(e));
      draw();
    } else {
      const q = point(e),
        dx = q.x - state.drag.centerX,
        dy = q.y - state.drag.centerY;
      if (state.drag.type === 'resize') {
        const distance = Math.max(1, Math.hypot(dx, dy));
        setScale(
          state.drag.p,
          (state.drag.original.relative * distance) / state.drag.startDistance,
        );
      } else {
        let rotation =
          state.drag.original.rotation +
          ((Math.atan2(dy, dx) - state.drag.startAngle) * 180) / Math.PI;
        if (e.shiftKey) rotation = Math.round(rotation / 15) * 15;
        setRotation(state.drag.p, rotation);
      }
    }
  }
  canvas.addEventListener('pointerdown', (e) => {
    if (state.exporting || (e.pointerType !== 'touch' && e.button !== 0)) return;
    const q = point(e);
    if (e.pointerType === 'touch') {
      state.touchPoints.set(e.pointerId, q);
      canvas.setPointerCapture(e.pointerId);
      if (state.touchPoints.size === 2) {
        const entries = [...state.touchPoints.entries()].slice(0, 2),
          a = entries[0][1],
          b = entries[1][1],
          target = findPinchTarget(a, b),
          distance = Math.hypot(b.x - a.x, b.y - a.y);
        if (target && distance > 8) {
          state.selected = target;
          state.placed.splice(state.placed.indexOf(target), 1);
          state.placed.push(target);
          state.pinch = {
            p: target,
            ids: [entries[0][0], entries[1][0]],
            original: snapshot(target),
            startAngle: Math.atan2(b.y - a.y, b.x - a.x),
            startDistance: distance,
            startRelative: target.relative,
            startCenterX: target.x * state.width,
            startCenterY: target.y * state.height,
            startMidX: (a.x + b.x) / 2,
            startMidY: (a.y + b.y) / 2,
          };
          state.drag = null;
          sidebar.classList.remove('drop-ready');
          e.preventDefault();
          draw();
          return;
        }
      }
    }
    if (state.drag) return;
    state.selected =
      [...state.placed].reverse().find((p) => hit(p, q.x, q.y)) ||
      (state.selected && insideSelection(state.selected, q.x, q.y, 8) ? state.selected : null);
    if (state.selected) {
      e.preventDefault();
      state.placed.splice(state.selected ? state.placed.indexOf(state.selected) : -1, 1);
      state.placed.push(state.selected);
      state.drag = {
        type: 'move',
        id: e.pointerId,
        owner: canvas,
        p: state.selected,
        dx: q.x - state.selected.x * state.width,
        dy: q.y - state.selected.y * state.height,
        original: snapshot(state.selected),
      };
      if (!canvas.hasPointerCapture(e.pointerId)) canvas.setPointerCapture(e.pointerId);
      canvas.focus();
    }
    draw();
  });
  document.addEventListener('pointermove', update);
  function finish(e: PointerEvent | null, cancel = false) {
    if (!state.drag || (e && e.pointerId !== state.drag.id)) return;
    const d = state.drag;
    state.drag = null;
    ghost.style.display = 'none';
    sidebar.classList.remove('drop-ready');
    if (d.owner.hasPointerCapture(d.id)) d.owner.releasePointerCapture(d.id);
    if (cancel) {
      if ('p' in d) Object.assign(d.p, d.original);
    } else if (d.type === 'move' && e && overSidebar(e)) {
      discard();
    } else if (d.type === 'new' && e) {
      const q = point(e);
      if (!d.moved) add(d.asset, state.width / 2, state.height / 2);
      else if (q.x >= 0 && q.y >= 0 && q.x <= state.width && q.y <= state.height)
        add(d.asset, q.x, q.y);
    }
    draw();
  }
  function endPointer(e: PointerEvent, cancel = false) {
    const wasTouch = state.touchPoints.has(e.pointerId);
    if (wasTouch) state.touchPoints.delete(e.pointerId);
    if (state.pinch && state.pinch.ids.includes(e.pointerId)) {
      const gesture = state.pinch;
      state.pinch = null;
      state.drag = null;
      if (cancel) Object.assign(gesture.p, gesture.original);
      const remaining = [...state.touchPoints.entries()].find(([id]) => gesture.ids.includes(id));
      if (remaining && !cancel) {
        const [id, q] = remaining;
        state.drag = {
          type: 'move',
          id,
          owner: canvas,
          p: gesture.p,
          dx: q.x - gesture.p.x * state.width,
          dy: q.y - gesture.p.y * state.height,
          original: snapshot(gesture.p),
        };
      }
      sidebar.classList.remove('drop-ready');
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
      draw();
      return;
    }
    finish(e, cancel);
    if (wasTouch && canvas.hasPointerCapture(e.pointerId))
      canvas.releasePointerCapture(e.pointerId);
  }
  function cancelGesture() {
    if (state.pinch) {
      Object.assign(state.pinch.p, state.pinch.original);
      state.pinch = null;
    }
    finish(null, true);
    for (const id of state.touchPoints.keys())
      if (canvas.hasPointerCapture(id)) canvas.releasePointerCapture(id);
    state.touchPoints.clear();
    draw();
  }
  document.addEventListener('pointerup', (e) => endPointer(e));
  document.addEventListener('pointercancel', (e) => endPointer(e, true));
  window.addEventListener('blur', cancelGesture);
  function startTransform(e: PointerEvent, type: 'resize' | 'rotate') {
    if (!state.selected || state.exporting || state.drag || state.pinch || e.button !== 0) return;
    e.preventDefault();
    const q = point(e),
      centerX = state.selected.x * state.width,
      centerY = state.selected.y * state.height;
    state.drag = {
      type,
      id: e.pointerId,
      owner: e.currentTarget as HTMLElement,
      p: state.selected,
      original: snapshot(state.selected),
      centerX,
      centerY,
      startDistance: Math.max(1, Math.hypot(q.x - centerX, q.y - centerY)),
      startAngle: Math.atan2(q.y - centerY, q.x - centerX),
    };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    canvas.focus();
    draw();
  }
  resizeHandle.addEventListener('pointerdown', (e) => startTransform(e, 'resize'));
  rotateHandle.addEventListener('pointerdown', (e) => startTransform(e, 'rotate'));
  function keyboardTransform(e: KeyboardEvent) {
    if (state.exporting) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      const active = !!state.drag || !!state.pinch;
      cancelGesture();
      if (!active) state.selected = null;
      draw();
      canvas.focus();
      return;
    }
    if (e.key === 'Enter' && e.target === canvas) {
      e.preventDefault();
      state.selected =
        state.placed[
          ((state.selected ? state.placed.indexOf(state.selected) : -1) + 1) % state.placed.length
        ] || null;
      draw();
      return;
    }
    if (!state.selected || e.target instanceof HTMLInputElement) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
      e.preventDefault();
      duplicateSelected();
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault();
      discard();
      return;
    }
    const dirs: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    if (dirs[e.key]) {
      e.preventDefault();
      const [x, y] = dirs[e.key],
        step = e.shiftKey ? 10 : 1;
      keep(
        state.selected,
        state.selected.x * state.width + x * step,
        state.selected.y * state.height + y * step,
      );
      draw();
    } else if (e.key === '+' || e.key === '=' || e.key === '-') {
      e.preventDefault();
      setScale(state.selected, state.selected.relative * (e.key === '-' ? 1 / 1.12 : 1.12));
    } else if (e.key === '[' || e.key === ']') {
      e.preventDefault();
      setRotation(
        state.selected,
        state.selected.rotation + (e.key === '[' ? -1 : 1) * (e.shiftKey ? 15 : 1),
      );
    }
  }
  canvas.addEventListener('keydown', keyboardTransform);
  selection.addEventListener('keydown', keyboardTransform);

  return { startCatalog, cancelGesture };
}
