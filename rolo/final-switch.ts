/** Enter the approved room in-place. The room is the final stage of this visit. */
type RoomController = { dispose: () => void; reveal: () => Promise<void> };
type RoomModule = { createRoom: () => Promise<RoomController> };

declare global {
  interface Window {
    ExperimentRoom?: RoomModule;
  }
}

let roomModule: Promise<RoomModule> | undefined;
function loadRoomModule(): Promise<RoomModule> {
  if (window.ExperimentRoom) return Promise.resolve(window.ExperimentRoom);
  return (roomModule ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = new URL('./room.js', window.location.href).href;
    script.onload = () => {
      if (window.ExperimentRoom) resolve(window.ExperimentRoom);
      else {
        script.remove();
        roomModule = undefined;
        reject(new Error('O quarto não foi carregado.'));
      }
    };
    script.onerror = () => {
      script.remove();
      roomModule = undefined;
      reject(new Error('O quarto não foi carregado.'));
    };
    document.head.append(script);
  }));
}

export function initializeFinalSwitch(journey: HTMLElement) {
  const artwork = journey.querySelector<HTMLImageElement>('.lace-art');
  const scene = artwork?.closest<HTMLElement>('.scene-lace');
  if (!artwork || !scene) return;
  const originalScene = scene;
  const sceneLabel = scene.getAttribute('aria-label');
  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  const originalThemeColor = themeColor?.content ?? null;
  const originalMinHeight = scene.style.minHeight;
  const originalInert = journey.inert;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'final-switch';
  button.setAttribute('aria-label', 'Apagar a luz');
  button.setAttribute('aria-pressed', 'false');
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

  let active = false;
  let destroyed = false;
  let sequence = 0;
  let room: RoomController | undefined;
  let preparedRoom: Promise<RoomController> | undefined;
  let loading: HTMLDivElement | undefined;
  let animation: Animation | undefined;
  let originalButtonStyle: string | null = null;
  let originalScrollTop = 0;
  const error = document.createElement('p');
  error.className = 'room-error';
  error.setAttribute('role', 'status');
  error.hidden = true;
  scene.append(error);

  function prepareRoom() {
    return (preparedRoom ??= loadRoomModule().then((module) => module.createRoom()));
  }

  function blackout(enabled: boolean) {
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute(
      'aria-label',
      enabled ? 'Entrando no quarto' : 'Apagar a luz e entrar no quarto',
    );
    button.classList.toggle('is-off', enabled);
    for (const element of [journey, document.documentElement, document.body]) {
      element.classList.toggle('final-blackout-active', enabled);
    }
    if (themeColor) themeColor.content = enabled ? '#000000' : (originalThemeColor ?? '');
  }

  function restoreAfterFailure() {
    if (!active) return;
    active = false;
    sequence++;
    animation?.cancel();
    animation = undefined;
    room?.dispose();
    room = undefined;
    preparedRoom = undefined;
    loading?.remove();
    loading = undefined;
    button.classList.remove('switch-pinned', 'switch-in-room');
    if (originalButtonStyle === null) button.removeAttribute('style');
    else button.setAttribute('style', originalButtonStyle);
    originalScene.style.minHeight = originalMinHeight;
    journey.inert = originalInert;
    button.disabled = false;
    document.body.classList.remove('room-active');
    blackout(false);
    journey.scrollTop = originalScrollTop;
    button.focus({ preventScroll: true });
  }

  async function enterRoom() {
    if (active || destroyed) return;
    active = true;
    const currentSequence = ++sequence;
    const bounds = button.getBoundingClientRect();
    originalScrollTop = journey.scrollTop;
    originalButtonStyle = button.getAttribute('style');
    error.hidden = true;
    originalScene.style.minHeight = `${button.offsetHeight}px`;
    button.classList.add('switch-pinned');
    Object.assign(button.style, {
      left: `${bounds.left}px`,
      top: `${bounds.top}px`,
      width: `${bounds.width}px`,
      height: `${bounds.height}px`,
    });
    button.disabled = true;
    blackout(true);
    const started = performance.now();
    document.body.classList.add('room-active');
    journey.inert = true;
    loading = document.createElement('div');
    loading.className = 'room-loading';
    loading.innerHTML = '<p role="status" class="visually-hidden">Preparando o quarto…</p>';
    loading.tabIndex = -1;
    document.body.append(loading);
    loading.focus({ preventScroll: true });
    try {
      const prepared = await prepareRoom();
      if (!active || sequence !== currentSequence || destroyed) {
        prepared.dispose();
        return;
      }
      room = prepared;
      const remaining = Math.max(0, 350 - (performance.now() - started));
      if (remaining > 0)
        await new Promise<void>((resolve) => window.setTimeout(resolve, remaining));
      if (!active || sequence !== currentSequence) return;
      const height = (window.innerHeight * 0.215) / (2 * 0.447 * Math.tan((38 * Math.PI) / 180));
      const width = (height * 760) / 1020;
      const destination = {
        left: `${(window.innerWidth - width) / 2}px`,
        top: `${(window.innerHeight - height) / 2}px`,
        width: `${width}px`,
        height: `${height}px`,
      };
      animation = button.animate(
        [
          {
            left: `${bounds.left}px`,
            top: `${bounds.top}px`,
            width: `${bounds.width}px`,
            height: `${bounds.height}px`,
          },
          destination,
        ],
        {
          duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 650,
          easing: 'ease-in-out',
          fill: 'forwards',
        },
      );
      await animation.finished;
      if (!active || sequence !== currentSequence) return;
      Object.assign(button.style, destination);
      animation.cancel();
      animation = undefined;
      button.classList.add('switch-in-room');
      loading?.remove();
      loading = undefined;
      await prepared.reveal();
    } catch {
      if (!active || sequence !== currentSequence) return;
      restoreAfterFailure();
      error.textContent =
        'Não foi possível abrir o quarto. Confira a conexão e tente de novo em um navegador com 3D ativado.';
      error.hidden = false;
    }
  }

  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      prepareRoom()
        .then((prepared) => {
          if (destroyed) prepared.dispose();
        })
        .catch(() => {
          preparedRoom = undefined;
        });
      observer.disconnect();
    },
    { root: journey, rootMargin: '100% 0px' },
  );
  observer.observe(button);
  button.addEventListener('click', enterRoom);

  return () => {
    destroyed = true;
    observer.disconnect();
    if (!active) preparedRoom?.then((prepared) => prepared.dispose()).catch(() => {});
    restoreAfterFailure();
    error.remove();
    button.removeEventListener('click', enterRoom);
    blackout(false);
    if (themeColor && originalThemeColor !== null) themeColor.content = originalThemeColor;
    button.replaceWith(artwork);
    originalScene.classList.replace('scene-switch', 'scene-lace');
    if (sceneLabel !== null) originalScene.setAttribute('aria-label', sceneLabel);
  };
}
