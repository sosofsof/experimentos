import { downloadJpg } from './src/jpg';
import { createEditorState } from './src/editor-state';
import { initializeEditorGestures } from './src/editor-gestures';
import {
  MIN_SCALE,
  MAX_SCALE,
  clamp,
  radians,
  dimensions as pieceDimensions,
  keep as keepPiece,
  localPoint as pieceLocalPoint,
  compositionRecipe,
} from './src/editor-geometry';
(() => {
  'use strict';
  const assets = window.ARTWORK_ASSETS;
  const catalog = document.getElementById('catalog'),
    canvas = document.getElementById('canvas'),
    workspace = document.getElementById('workspace');
  const ctx = canvas.getContext('2d'),
    ghost = document.getElementById('ghost'),
    empty = document.getElementById('empty');
  const download = document.getElementById('download'),
    sidebar = document.querySelector('aside'),
    status = document.getElementById('status');
  const selection = document.getElementById('selection');
  const duplicate = document.getElementById('duplicate-handle');
  const state = createEditorState(),
    images = new Map(),
    masks = new Map();
  let category = 'retalho';

  const backgroundSelect = document.getElementById('background');
  let background = backgroundSelect.value;
  const backgroundImages = new Map();
  function ensureBackground(id) {
    if (backgroundImages.has(id)) return;
    const src = window.ARTWORK_BACKGROUNDS[id];
    if (!src) return;
    const image = new Image();
    image.decoding = 'async';
    image.onload = draw;
    backgroundImages.set(id, image);
    image.src = src;
  }
  ensureBackground(background);
  backgroundSelect.addEventListener('change', () => {
    background = backgroundSelect.value;
    ensureBackground(background);
    draw();
  });
  for (const a of assets)
    masks.set(
      a.id,
      Uint8Array.from(atob(a.mask), (c) => c.charCodeAt(0)),
    );
  function ensureImage(a) {
    if (images.has(a.id)) return;
    const im = new Image();
    images.set(a.id, im);
    im.onload = () => draw();
    im.onerror = () => {
      images.delete(a.id);
      status.textContent = 'Não foi possível carregar esta peça. Tente adicioná-la novamente.';
    };
    im.src = a.src;
  }
  function size(a) {
    const long = Math.max(a.width, a.height);
    const old = a.kind === 'caco' ? 70 + Math.sqrt(long) * 2.6 : 48 + Math.sqrt(long) * 3.2;
    const vw = window.innerWidth,
      margin = vw < 600 ? 12 : 24,
      cols = Math.max(2, Math.floor((vw - margin * 2) / (vw < 600 ? 106 : 142))),
      cell = (vw - margin * 2) / cols;
    const length = Math.min(
      0.9 * Math.min(old * Math.min(1, cell / 155), cell - 24, cell * 1.02 - 24),
      state.width * 0.8,
      state.height * 0.8,
    );
    return { w: (length * a.width) / long, h: (length * a.height) / long };
  }
  const dimensions = (p) => pieceDimensions(p, state.width, state.height);
  const angle = radians;
  const keep = (p, x, y) => keepPiece(p, x, y, state.width, state.height);
  function syncControls() {
    duplicate.disabled = !state.selected || state.exporting || !!state.drag || !!state.pinch;
    selection.hidden = !state.selected || state.exporting;
    canvas.classList.toggle('has-selection', !!state.selected);
    canvas.classList.toggle('is-dragging', !!state.drag || !!state.pinch);
    if (!state.selected) return;
    const dimensionsInCanvas = dimensions(state.selected);
    const w = Math.max(36, dimensionsInCanvas.w),
      h = Math.max(36, dimensionsInCanvas.h);
    selection.style.width = w + 'px';
    selection.style.height = h + 'px';
    selection.style.left = state.selected.x * state.width - w / 2 + 'px';
    selection.style.top = state.selected.y * state.height - h / 2 + 'px';
    selection.style.transform = `rotate(${state.selected.rotation}deg)`;
    const area = workspace.getBoundingClientRect(),
      art = canvas.getBoundingClientRect(),
      r = angle(state.selected);
    function positionHandle(id, x, y, rightSpace = 0) {
      const worldX = state.selected.x * state.width + x * Math.cos(r) - y * Math.sin(r);
      const worldY = state.selected.y * state.height + x * Math.sin(r) + y * Math.cos(r);
      const visibleX = clamp(
        worldX,
        area.left - art.left + 24,
        area.right - art.left - 24 - rightSpace,
      );
      const visibleY = clamp(worldY, Math.max(-34, area.top - art.top + 24), state.height + 22);
      const local = localPoint(state.selected, visibleX, visibleY),
        handle = document.getElementById(id);
      handle.style.left = local.x + w / 2 - 22 + 'px';
      handle.style.top = local.y + h / 2 - 22 + 'px';
      handle.style.right = 'auto';
      handle.style.bottom = 'auto';
      return { x: visibleX, y: visibleY };
    }
    positionHandle('resize-handle', w / 2, h / 2);
    const rotatePosition = positionHandle('rotate-handle', 0, -h / 2 - 30, 52);
    const duplicatePosition = localPoint(state.selected, rotatePosition.x + 52, rotatePosition.y);
    positionHandle('duplicate-handle', duplicatePosition.x, duplicatePosition.y);
    duplicate.style.transform = `rotate(${-state.selected.rotation}deg)`;
  }
  const localPoint = (p, x, y) => pieceLocalPoint(p, x, y, state.width, state.height);
  function recipe() {
    return compositionRecipe(state.placed, background);
  }
  window.artworkEditor = { snapshot: recipe };
  function render(target, width, height) {
    window.ArtworkRendering.renderRecipe(target, width, height, recipe(), images, backgroundImages);
  }
  function paint() {
    ctx.setTransform(canvas.width / state.width, 0, 0, canvas.height / state.height, 0, 0);
    render(ctx, state.width, state.height);
    empty.hidden = state.placed.length > 0;
    empty.style.color = background === 'preto' ? '#fff' : '#000';
    backgroundSelect.disabled = state.exporting;
    download.disabled = !state.placed.length || state.exporting;
    document.getElementById('publish').disabled = !state.placed.length || state.exporting;
    syncControls();
  }
  let pendingDraw = false;
  function draw() {
    if (pendingDraw) return;
    pendingDraw = true;
    requestAnimationFrame(() => {
      pendingDraw = false;
      paint();
    });
  }
  function resize() {
    if (state.drag || state.pinch) gestures.cancelGesture();
    const r = workspace.getBoundingClientRect();
    state.width = Math.max(1, Math.min(r.width - 56, Math.max(90, r.height - 140) * 1.5));
    state.height = state.width / 1.5;
    canvas.style.width = state.width + 'px';
    canvas.style.height = state.height + 'px';
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(state.width * dpr);
    canvas.height = Math.round(state.height * dpr);
    state.placed.forEach((p) => keep(p, p.x * state.width, p.y * state.height));
    draw();
  }
  function refresh() {
    catalog.replaceChildren();
    for (const a of assets.filter((a) => a.kind === category)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'asset';
      b.setAttribute(
        'aria-label',
        `${a.label} — toque ou arraste para adicionar quantas vezes quiser`,
      );
      const im = document.createElement('img');
      im.loading = 'lazy';
      im.decoding = 'async';
      im.src = a.src;
      im.alt = '';
      im.draggable = false;
      b.append(im);
      b.addEventListener('pointerdown', (e) => gestures.startCatalog(e, a, b));
      b.addEventListener('click', (e) => {
        if (e.detail === 0) add(a, state.width / 2, state.height / 2);
      });
      catalog.append(b);
    }
  }
  function add(a, x, y) {
    if (state.exporting) return;
    ensureImage(a);
    const s = size(a);
    const p = {
      asset: a,
      x: 0.5,
      y: 0.5,
      rotation: 0,
      relative: clamp(
        Math.max(s.w, s.h) / Math.min(state.width, state.height),
        MIN_SCALE,
        MAX_SCALE,
      ),
    };
    state.placed.push(p);
    state.selected = p;
    keep(p, x, y);
    draw();
    status.textContent = `${a.label} adicionada. Você pode usar este elemento novamente pela barra lateral.`;
  }
  function discard() {
    if (!state.selected || state.exporting) return;
    const label = state.selected.asset.label;
    state.placed.splice(state.placed.indexOf(state.selected), 1);
    state.selected = null;
    refresh();
    draw();
    status.textContent = `${label} devolvida à barra lateral.`;
  }

  function duplicateSelected() {
    if (!state.selected || state.exporting || state.drag || state.pinch) return;
    const copy = { ...state.selected },
      offset = 24;
    keep(
      copy,
      copy.x * state.width + (copy.x > 0.5 ? -offset : offset),
      copy.y * state.height + (copy.y > 0.5 ? -offset : offset),
    );
    state.placed.push(copy);
    state.selected = copy;
    draw();
    canvas.focus();
    status.textContent = `${copy.asset.label} duplicada com o mesmo tamanho e rotação. A cópia está selecionada.`;
  }
  duplicate.addEventListener('click', duplicateSelected);

  document.querySelectorAll('.tab').forEach((b) =>
    b.addEventListener('click', () => {
      category = b.dataset.kind;
      document.querySelectorAll('.tab').forEach((t) => {
        t.classList.toggle('active', t === b);
        t.setAttribute('aria-pressed', String(t === b));
      });
      catalog.scrollTop = 0;
      refresh();
    }),
  );
  download.addEventListener('click', async () => {
    if (state.exporting || !state.placed.length) return;
    state.exporting = true;
    download.textContent = 'Preparando…';
    draw();
    try {
      await Promise.all([
        ...state.placed.map((p) => images.get(p.asset.id).decode()),
        ...(backgroundImages.has(background) ? [backgroundImages.get(background).decode()] : []),
      ]);
      const out = document.createElement('canvas'),
        factor = 3000 / Math.max(state.width, state.height);
      out.width = Math.round(state.width * factor);
      out.height = Math.round(state.height * factor);
      render(out.getContext('2d'), out.width, out.height);
      await downloadJpg(out, 'minha-obra.jpg');
      status.textContent = 'JPG preparado para download.';
    } catch (error) {
      status.textContent = 'Não foi possível baixar. Tente novamente.';
      alert('Não foi possível baixar o JPG. Tente novamente.');
    } finally {
      state.exporting = false;
      download.textContent = 'salvar JPG';
      draw();
    }
  });
  const gestures = initializeEditorGestures(
    state,
    {
      canvas,
      selection,
      sidebar,
      ghost,
      resizeHandle: document.getElementById('resize-handle'),
      rotateHandle: document.getElementById('rotate-handle'),
    },
    { draw, size, add, discard, duplicateSelected },
    masks,
  );
  new ResizeObserver(resize).observe(workspace);
  refresh();
  resize();
  const mc = document.modelContext;
  if (mc?.registerTool) {
    try {
      Promise.resolve(
        mc.registerTool({
          name: 'read_composition',
          description: 'Read the pieces placed in the artwork.',
          inputSchema: { type: 'object', properties: {}, additionalProperties: false },
          annotations: { readOnlyHint: true },
          execute: () => ({
            pieces: state.placed.map((p) => ({
              id: p.asset.id,
              x: p.x,
              y: p.y,
              relative: p.relative,
              rotation: p.rotation,
            })),
            width: state.width,
            height: state.height,
            background,
          }),
        }),
      ).catch(() => {});
    } catch (_) {}
  }
})();
