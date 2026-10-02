(() => {
  const flowers = [...document.querySelectorAll('.flower')];
  const tools = [...document.querySelectorAll('.drag-tool')];
  const status = document.getElementById('status');

  const stateOf = (flower) => {
    if (flower.classList.contains('is-ashes')) return 'ashes';
    if (flower.classList.contains('is-dead')) return 'dead';
    return 'alive';
  };

  const flowerLabel = (flower, state) => {
    const name = flower.dataset.name;
    if (state === 'ashes') return `${name} em cinzas`;
    if (flower.dataset.flower === 'cravo') {
      return state === 'dead' ? 'Cravo morto' : 'Cravo vivo';
    }
    return `${name} ${state === 'dead' ? 'morta' : 'viva'}`;
  };

  const setFlowerState = (flower, state) => {
    flower.classList.toggle('is-dead', state === 'dead');
    flower.classList.toggle('is-ashes', state === 'ashes');
    flower.dataset.sunHits = '0';

    const label = flowerLabel(flower, state);
    flower.setAttribute('aria-label', label);
    status.textContent = `${label}.`;
  };

  const useSun = (flower) => {
    const state = stateOf(flower);

    if (state === 'dead') {
      setFlowerState(flower, 'alive');
      return;
    }

    if (state !== 'alive') return;

    const hits = Number(flower.dataset.sunHits || 0) + 1;
    flower.dataset.sunHits = String(hits);

    if (hits >= 3) {
      setFlowerState(flower, 'dead');
    } else {
      status.textContent = `Sol usado ${hits} de 3 vezes sobre ${flower.dataset.name}.`;
    }
  };

  const useMatch = (flower) => {
    const state = stateOf(flower);

    if (state === 'alive') {
      setFlowerState(flower, 'dead');
      return;
    }

    if (state === 'dead') {
      setFlowerState(flower, 'ashes');
    }
  };

  const applyTool = (tool, flower) => {
    if (tool.dataset.action === 'sun') useSun(flower);
    if (tool.dataset.action === 'match') useMatch(flower);
  };

  const overlapArea = (a, b) => {
    const width = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
    const height = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    return width * height;
  };

  const flowerUnderTool = (tool) => {
    const toolRect = tool.getBoundingClientRect();
    let bestFlower = null;
    let bestOverlap = 0;

    for (const flower of flowers) {
      const overlap = overlapArea(toolRect, flower.getBoundingClientRect());
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestFlower = flower;
      }
    }

    return bestFlower;
  };

  const makeDraggable = (tool) => {
    let pointerId = null;
    let startX = 0;
    let startY = 0;

    const resetTool = () => {
      tool.classList.remove('is-dragging');
      tool.style.transform = 'translate3d(0, 0, 0)';
    };

    tool.addEventListener('pointerdown', (event) => {
      if (pointerId !== null) return;

      pointerId = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      tool.classList.add('is-dragging');
      tool.setPointerCapture(pointerId);
      event.preventDefault();
    });

    tool.addEventListener('pointermove', (event) => {
      if (event.pointerId !== pointerId) return;

      tool.style.transform = `translate3d(${event.clientX - startX}px, ${event.clientY - startY}px, 0)`;
      event.preventDefault();
    });

    const finishDrag = (event) => {
      if (event.pointerId !== pointerId) return;

      const flower = flowerUnderTool(tool);
      if (flower) applyTool(tool, flower);

      try {
        tool.releasePointerCapture(pointerId);
      } catch {}
      pointerId = null;
      resetTool();
      event.preventDefault();
    };

    tool.addEventListener('pointerup', finishDrag);
    tool.addEventListener('pointercancel', finishDrag);
  };

  flowers.forEach((flower) => {
    flower.dataset.sunHits = '0';
    flower.setAttribute('aria-label', flowerLabel(flower, stateOf(flower)));
  });

  tools.forEach(makeDraggable);
})();
