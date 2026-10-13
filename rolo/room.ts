import {
  WebGLRenderer,
  Scene,
  Color,
  PerspectiveCamera,
  Vector3,
  Group,
  Mesh,
  Box3,
  MeshStandardMaterial,
  MeshBasicMaterial,
  LineBasicMaterial,
  HemisphereLight,
  DirectionalLight,
  TextureLoader,
  Texture,
  PlaneGeometry,
  BoxGeometry,
  EdgesGeometry,
  BufferGeometry,
  Float32BufferAttribute,
  LineSegments,
  Line,
  CanvasTexture,
  MathUtils,
  DoubleSide,
  SRGBColorSpace,
  ACESFilmicToneMapping,
  PCFShadowMap,
  type Material,
  type Object3D,
} from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
type PaintShader = Parameters<MeshStandardMaterial['onBeforeCompile']>[0];
const MODEL_URLS = [
  './assets/room/escrivaninha.glb?v=04aa2ac550df9c2b',
  './assets/room/mesa-de-cabeceira.glb?v=efa9548427cbf720',
  './assets/room/cama-vermelha.glb?v=75b3684cfc9d51ec',
  './assets/room/cadeira-branca.glb?v=24a282baf53e58fb',
];
function assetUrl(e: string) {
  return new URL(e, window.location.href).href;
}
export async function createRoom() {
  const roomView = document.createElement('section');
  ((roomView.className = 'room-view'),
    roomView.setAttribute('role', 'dialog'),
    roomView.setAttribute('aria-modal', 'true'),
    roomView.setAttribute(
      'aria-label',
      'Quarto. Arraste para os lados ou use as setas esquerda e direita para olhar ao redor em 360 graus.',
    ),
    (roomView.innerHTML =
      '<canvas class="room-canvas" tabindex="0" aria-label="Olhar ao redor do quarto. Use as setas esquerda e direita ou arraste para os lados."></canvas><button class="room-window-action" type="button" aria-label="Abrir janela" aria-pressed="false" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3h18v18H3zM12 3v18M3 12h18"/></svg></button><p class="room-announcement visually-hidden" aria-live="polite"></p>'),
    document.body.append(roomView));
  const canvas = roomView.querySelector<HTMLCanvasElement>('canvas')!,
    windowButton = roomView.querySelector<HTMLButtonElement>('.room-window-action')!,
    announcement = roomView.querySelector<HTMLParagraphElement>('.room-announcement')!;
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas: canvas, antialias: !0, alpha: !1 });
  } catch (z) {
    throw (roomView.remove(), z);
  }
  const smallScreen = window.matchMedia('(max-width: 700px)').matches;
  (renderer.setPixelRatio(Math.min(window.devicePixelRatio, smallScreen ? 1.4 : 1.7)),
    (renderer.outputColorSpace = SRGBColorSpace),
    (renderer.toneMapping = ACESFilmicToneMapping),
    (renderer.toneMappingExposure = 1.3),
    (renderer.shadowMap.enabled = !1),
    (renderer.shadowMap.type = PCFShadowMap),
    (renderer.shadowMap.autoUpdate = !1));
  const scene = new Scene(),
    background = new Color('#000000');
  scene.background = background;
  const camera = new PerspectiveCamera(76, 1, 0.025, 30),
    finalCameraPosition = new Vector3(0, 1.48, 0.45),
    switchPosition = new Vector3(0.82, 1.48, 2.487),
    initialCameraPosition = switchPosition.clone();
  ((initialCameraPosition.z -= 0.447), camera.position.copy(initialCameraPosition));
  const textures = new Set<Texture>(),
    textureLoader = new TextureLoader(),
    modelLoader = new GLTFLoader(),
    events = new AbortController();
  let finishReveal: (() => void) | undefined;
  let pointerDrag: { id: number; x: number; yaw: number } | null = null;
  let disposed = !1,
    visible = !1,
    transitioning = !0,
    animationFrame = 0,
    lastFrame = performance.now(),
    yaw = Math.PI,
    pitch = 0,
    targetYaw = Math.atan2(
      switchPosition.x - finalCameraPosition.x,
      finalCameraPosition.z - switchPosition.z,
    ),
    targetPitch = -0.09,
    fade = 0,
    windowOpen = !1,
    windowAmount = 0;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    loadedAssets = await Promise.allSettled([
      textureLoader.loadAsync(assetUrl('./assets/interruptor-desenho.webp?v=efb4512a397f7393')),
      ...MODEL_URLS.map((z) => modelLoader.loadAsync(assetUrl(z))),
    ]);
  if (loadedAssets.some((z) => z.status === 'rejected')) {
    for (const z of loadedAssets)
      z.status === 'fulfilled' &&
        (z.value instanceof Texture
          ? z.value.dispose()
          : z.value.scene.traverse((U) => {
              if (U instanceof Mesh) {
                U.geometry.dispose();
                for (const F of Array.isArray(U.material) ? U.material : [U.material]) F.dispose();
              }
            }));
    throw (
      renderer.dispose(),
      roomView.remove(),
      new Error('N\xE3o foi poss\xEDvel carregar os modelos do quarto.')
    );
  }
  const switchTexture = (loadedAssets[0] as PromiseFulfilledResult<Texture>).value;
  textures.add(switchTexture);
  const whiteMaterial = new MeshStandardMaterial({
      color: '#ffffff',
      side: DoubleSide,
      roughness: 0.92,
      metalness: 0,
    }),
    outlineMaterial = new LineBasicMaterial({ color: '#ff0000', toneMapped: !1 }),
    ambientLight = new HemisphereLight('#ffffff', '#ffffff', 2),
    directionalLight = new DirectionalLight('#ffffff', 0);
  (directionalLight.position.set(-2.2, 4.6, 1.9),
    directionalLight.target.position.set(-0.5, 0.45, -1.6),
    (directionalLight.castShadow = !1),
    directionalLight.shadow.mapSize.setScalar(smallScreen ? 1024 : 2048),
    (directionalLight.shadow.camera.left = -4.5),
    (directionalLight.shadow.camera.right = 4.5),
    (directionalLight.shadow.camera.top = 4.5),
    (directionalLight.shadow.camera.bottom = -4.5),
    (directionalLight.shadow.camera.near = 0.2),
    (directionalLight.shadow.camera.far = 15),
    (directionalLight.shadow.bias = -35e-5),
    (directionalLight.shadow.normalBias = 0.015),
    scene.add(ambientLight, directionalLight, directionalLight.target));
  /* Bright white faces and a narrow soft change near curved edges: no light source. */
  whiteMaterial.onBeforeCompile = (shader: PaintShader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <tonemapping_fragment>',
      `#include <tonemapping_fragment>
    float surfaceFacing=clamp(abs(dot(normal,normalize(vViewPosition))),0.0,1.0);
    float softVolume=mix(0.90,1.0,smoothstep(0.05,0.85,surfaceFacing));
          float edgeShade=mix(0.68,1.0,smoothstep(0.015,0.14,surfaceFacing));
          float shapeLight=softVolume*edgeShade;
    gl_FragColor.rgb=diffuseColor.rgb*shapeLight;`,
    );
  };
  whiteMaterial.customProgramCacheKey = () => 'bright-white-furniture-volume-v3';
  function addOutline(z: readonly number[], U: Object3D = scene) {
    const F: number[] = [],
      ie = new Vector3(),
      ce = new Vector3(),
      se = new Vector3();
    for (let Ee = 0; Ee < z.length; Ee += 6) {
      (ie.fromArray(z, Ee), ce.fromArray(z, Ee + 3));
      const Be = Math.ceil(ie.distanceTo(ce) / 0.5);
      for (let P = 0; P < Be; P++)
        (se.lerpVectors(ie, ce, P / Be).toArray(F, F.length),
          se.lerpVectors(ie, ce, (P + 1) / Be).toArray(F, F.length));
    }
    const ee = new BufferGeometry();
    ee.setAttribute('position', new Float32BufferAttribute(F, 3));
    const ve = new LineSegments(ee, outlineMaterial);
    return (U.add(ve), ve);
  }
  function addWindowOutline(z: number, U: number, F: number, ie?: Object3D) {
    return addOutline(
      [F, -z, -U, F, z, -U, F, z, -U, F, z, U, F, z, U, F, -z, U, F, -z, U, F, -z, -U],
      ie,
    );
  }
  const roomGeometry = new BoxGeometry(4.6, 2.8, 5),
    roomEdges = new EdgesGeometry(roomGeometry),
    roomFrame = addOutline(Array.from(roomEdges.getAttribute('position').array));
  (roomEdges.dispose(),
    roomGeometry.dispose(),
    (roomFrame.position.y = 1.4),
    (roomFrame.name = 'Limites vermelhos do quarto'));
  /* Replace the provisional bed with the complete user-supplied model.
   Keep the head toward the back wall and set the left edge beside the left wall. */
  const bedModel = (loadedAssets[3] as PromiseFulfilledResult<GLTF>).value.scene;
  const bedOriginalBounds = new Box3().setFromObject(bedModel);
  const bedOriginalCenter = bedOriginalBounds.getCenter(new Vector3());
  const bedOriginalSize = bedOriginalBounds.getSize(new Vector3());
  const bedScale = 2.28 / bedOriginalSize.z;
  bedModel.position.set(-bedOriginalCenter.x, -bedOriginalBounds.min.y, -bedOriginalCenter.z);
  const bedGroup = new Group();
  bedGroup.name = 'Cama vermelha — modelo original';
  bedGroup.add(bedModel);
  bedGroup.scale.setScalar(bedScale);
  bedGroup.position.set(-2.3 + (bedOriginalSize.x * bedScale) / 2 + 0.018, 0, -1.28);
  const bedMaterials = new Map<MeshStandardMaterial, Color>();
  bedModel.traverse((mesh) => {
    if (!(mesh instanceof Mesh)) return;
    mesh.castShadow = mesh.receiveShadow = true;
    for (const material of (Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material]) as MeshStandardMaterial[]) {
      if (!bedMaterials.has(material)) {
        bedMaterials.set(material, material.color.clone());
        /* Keep the painting's hue and saturation through lighting and tone mapping.
         Use the rendered light as a bounded brightness multiplier, retaining shadows. */
        material.onBeforeCompile = (shader: PaintShader) => {
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <tonemapping_fragment>',
            `#include <tonemapping_fragment>
          float surfaceFacing=clamp(abs(dot(normal,normalize(vViewPosition))),0.0,1.0);
          float softVolume=mix(0.90,1.0,smoothstep(0.05,0.85,surfaceFacing));
          float edgeShade=mix(0.68,1.0,smoothstep(0.015,0.14,surfaceFacing));
          float shapeLight=softVolume*edgeShade;
          float paintPeak=max(max(diffuseColor.r,diffuseColor.g),diffuseColor.b);
          float paintFloor=min(min(diffuseColor.r,diffuseColor.g),diffuseColor.b);
          float paintMask=smoothstep(0.035,0.22,paintPeak-paintFloor);
          vec3 paintColor=max(vec3(0.0),vec3(paintPeak)-(vec3(paintPeak)-diffuseColor.rgb)*1.45);
          float paintLight=mix(shapeLight,max(shapeLight,0.94),paintMask);
          gl_FragColor.rgb=paintColor*paintLight;`,
          );
        };
        material.customProgramCacheKey = () => 'bright-white-original-paint-volume-v3';
        if (material.map) {
          material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
          material.map.needsUpdate = true;
        }
      }
      for (const property of ['map', 'roughnessMap', 'metalnessMap'] as const) {
        if (material[property]) textures.add(material[property]);
      }
    }
  });
  scene.add(bedGroup);
  /* The painted bedside table shares the bed's existing volume shading and fade.
   Keep a small gap from the actual bed geometry rather than a fixed room coordinate. */
  type FurnitureLayout = {
    height: number;
    width?: number;
    depth?: number;
    x?: number;
    z?: number;
    rightWall?: boolean;
    backWall?: boolean;
    rotation: number;
    name: string;
    modelIndex: number;
    bedGap?: number;
  };
  const furnitureLayouts: FurnitureLayout[] = [
    {
      height: 0.8,
      width: 1.9757630562315984,
      depth: 0.8175398702042806,
      rightWall: true,
      backWall: true,
      rotation: -Math.PI / 2,
      name: 'Escrivaninha — modelo original',
      modelIndex: 1,
    },
    {
      height: 0.81,
      z: -2.15,
      rotation: 0,
      bedGap: 0.06,
      name: 'Mesa de cabeceira — modelo original',
      modelIndex: 2,
    },
    {
      height: 0.9,
      x: 0.95,
      z: -1.4,
      rotation: Math.PI / 6,
      name: 'Cadeira branca — modelo original',
      modelIndex: 4,
    },
  ];
  for (let z = 0; z < furnitureLayouts.length; z++) {
    const F = furnitureLayouts[z],
      U = (loadedAssets[F.modelIndex] as PromiseFulfilledResult<GLTF>).value.scene;
    const ie = new Box3().setFromObject(U),
      ce = ie.getCenter(new Vector3()),
      se = ie.max.y - ie.min.y;
    U.position.set(-ce.x, -ie.min.y, -ce.z);
    const ee = new Group();
    ee.name = F.name;
    ee.add(U);
    if (F.width && F.depth) {
      ee.scale.set(F.width / (ie.max.x - ie.min.x), F.height / se, F.depth / (ie.max.z - ie.min.z));
    } else ee.scale.setScalar(F.height / se);
    ee.rotation.y = F.rotation;
    if (z === 1) {
      const bedBounds = new Box3().setFromObject(bedGroup);
      const tableBounds = new Box3().setFromObject(ee);
      F.x = bedBounds.max.x + (F.bedGap ?? 0.06) + (tableBounds.max.x - tableBounds.min.x) / 2;
    }
    if (F.rightWall) {
      const bounds = new Box3().setFromObject(ee);
      F.x = 2.3 - (bounds.max.x - bounds.min.x) / 2;
    }
    if (F.backWall) {
      const bounds = new Box3().setFromObject(ee);
      F.z = -2.5 + (bounds.max.z - bounds.min.z) / 2;
    }
    ee.position.set(F.x!, 0.016, F.z!);
    U.traverse((mesh) => {
      if (!(mesh instanceof Mesh)) return;
      mesh.castShadow = mesh.receiveShadow = true;
      const materials = (
        Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      ) as MeshStandardMaterial[];
      for (const material of materials) {
        if (!bedMaterials.has(material)) {
          bedMaterials.set(material, material.color.clone());
          const paintedTemplate = bedMaterials.keys().next().value!;
          material.onBeforeCompile = (shader: PaintShader) => {
            paintedTemplate.onBeforeCompile(shader, renderer);
            shader.fragmentShader = shader.fragmentShader.replace(
              'float paintLight=mix(shapeLight,max(shapeLight,0.94),paintMask);',
              `float redInk=max(diffuseColor.r-max(diffuseColor.g,diffuseColor.b),0.0);
             float redMask=pow(smoothstep(0.006,0.18,redInk),0.55);
             paintColor=mix(paintColor,vec3(max(paintPeak,0.90),0.004,0.002),redMask*0.96);
             float paintLight=mix(shapeLight,max(shapeLight,0.98),max(paintMask,redMask));`,
            );
          };
          material.customProgramCacheKey = () => 'strong-painted-furniture-edges-v1';
          material.side = whiteMaterial.side;
          material.roughness = whiteMaterial.roughness;
          material.metalness = 0;
          material.transparent = false;
          material.opacity = 1;
          material.depthWrite = true;
          if (material.map) {
            material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
            material.map.needsUpdate = true;
          }
        }
        for (const property of ['map', 'roughnessMap', 'metalnessMap'] as const) {
          if (material[property]) textures.add(material[property]);
        }
      }
    });
    scene.add(ee);
  }
  const switchCanvas = document.createElement('canvas');
  ((switchCanvas.width = 760), (switchCanvas.height = 1020));
  const switchContext = switchCanvas.getContext('2d')!,
    switchImage = switchTexture.image as HTMLImageElement;
  (switchContext.save(),
    switchContext.translate(-180, -100),
    switchContext.beginPath(),
    switchContext.rect(0, 0, 1239, 1269),
    switchContext.rect(322.14, 215.73000000000002, 507.98999999999995, 774.09),
    switchContext.clip('evenodd'),
    switchContext.drawImage(switchImage, 0, 0),
    switchContext.restore(),
    switchContext.save(),
    switchContext.translate(-180, 978.6499999999999),
    switchContext.scale(1, -1),
    switchContext.beginPath(),
    switchContext.rect(396.48, 279.18, 384.09, 520.29),
    switchContext.clip(),
    switchContext.drawImage(switchImage, 0, 0),
    switchContext.restore());
  const switchMap = new CanvasTexture(switchCanvas);
  ((switchMap.colorSpace = SRGBColorSpace), textures.add(switchMap));
  const switchMaterial = new MeshBasicMaterial({
      map: switchMap,
      transparent: !0,
      depthWrite: !1,
      toneMapped: !1,
    }),
    switchMesh = new Mesh(new PlaneGeometry(0.16, 0.215), switchMaterial);
  (switchMesh.position.copy(switchPosition),
    (switchMesh.rotation.y = Math.PI),
    (switchMesh.name = 'Interruptor apagado'),
    scene.add(switchMesh));
  const roomSurfaceMaterial = new MeshBasicMaterial({
    color: '#ffffff',
    side: DoubleSide,
    toneMapped: false,
  });
  roomSurfaceMaterial.transparent = true;
  roomSurfaceMaterial.opacity = 0;
  roomSurfaceMaterial.depthWrite = false;
  roomSurfaceMaterial.polygonOffset = true;
  roomSurfaceMaterial.polygonOffsetFactor = 1;
  roomSurfaceMaterial.polygonOffsetUnits = 1;
  const roomSurfaces = new Group();
  roomSurfaces.name = 'Superfícies claras do quarto';
  roomSurfaces.visible = false;
  scene.add(roomSurfaces);
  function addRoomSurface(
    width: number,
    height: number,
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    name: string,
  ) {
    const surface = new Mesh(new PlaneGeometry(width, height), roomSurfaceMaterial);
    surface.position.set(x, y, z);
    surface.rotation.set(rx, ry, 0);
    surface.name = name;
    surface.receiveShadow = false;
    surface.castShadow = false;
    surface.renderOrder = 1;
    roomSurfaces.add(surface);
  }
  addRoomSurface(4.6, 5, 0, 0, 0, -Math.PI / 2, 0, 'Chão branco');
  addRoomSurface(4.6, 5, 0, 2.8, 0, Math.PI / 2, 0, 'Teto branco');
  addRoomSurface(4.6, 2.8, 0, 1.4, 2.5, 0, Math.PI, 'Parede da porta');
  addRoomSurface(5, 2.8, 2.3, 1.4, 0, 0, -Math.PI / 2, 'Parede direita');
  addRoomSurface(5, 2.8, -2.3, 1.4, 0, 0, Math.PI / 2, 'Parede esquerda');
  addRoomSurface(4.6, 0.99, 0, 0.495, -2.5, 0, 0, 'Parede sob a janela');
  addRoomSurface(4.6, 0.41, 0, 2.595, -2.5, 0, 0, 'Parede sobre a janela');
  addRoomSurface(1.5, 1.4, -1.55, 1.69, -2.5, 0, 0, 'Parede à esquerda da janela');
  addRoomSurface(1.5, 1.4, 1.55, 1.69, -2.5, 0, 0, 'Parede à direita da janela');
  /* Gentle contact occlusion, without a light position or projected silhouettes. */
  const contactOcclusion = new Group();
  contactOcclusion.name = 'Sombras locais de contato';
  contactOcclusion.visible = false;
  scene.add(contactOcclusion);
  const contactCanvas = document.createElement('canvas');
  contactCanvas.width = contactCanvas.height = 128;
  const contactContext = contactCanvas.getContext('2d')!;
  const contactGradient = contactContext.createRadialGradient(64, 64, 0, 64, 64, 64);
  contactGradient.addColorStop(0, 'rgba(0,0,0,.85)');
  contactGradient.addColorStop(0.28, 'rgba(0,0,0,.5)');
  contactGradient.addColorStop(0.65, 'rgba(0,0,0,.12)');
  contactGradient.addColorStop(1, 'rgba(0,0,0,0)');
  contactContext.fillStyle = contactGradient;
  contactContext.fillRect(0, 0, 128, 128);
  const contactTexture = new CanvasTexture(contactCanvas);
  textures.add(contactTexture);
  const contactMaterials: { material: MeshBasicMaterial; strength: number }[] = [];
  function addContact(
    width: number,
    height: number,
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    strength: number,
    name: string,
    texture: Texture = contactTexture,
  ) {
    const material = new MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      side: DoubleSide,
      opacity: 0,
    });
    contactMaterials.push({ material, strength });
    const shadow = new Mesh(new PlaneGeometry(width, height), material);
    shadow.position.set(x, y, z);
    shadow.rotation.set(rx, ry, 0);
    shadow.name = name;
    shadow.renderOrder = 2;
    contactOcclusion.add(shadow);
    return shadow;
  }
  const contactObjects = [
    bedGroup,
    ...scene.children.filter(
      (object) =>
        object.name === 'Escrivaninha — modelo original' ||
        object.name === 'Mesa de cabeceira — modelo original' ||
        object.name === 'Cadeira branca — modelo original',
    ),
  ];
  for (const object of contactObjects) {
    const box = new Box3().setFromObject(object),
      center = box.getCenter(new Vector3()),
      size = box.getSize(new Vector3());
    addContact(
      size.x + 0.1,
      size.z + 0.1,
      center.x,
      0.002,
      center.z,
      -Math.PI / 2,
      0,
      0.1,
      'Contato sob ' + object.name,
    );
    object.traverse((mesh) => {
      if (!(mesh instanceof Mesh)) return;
      const bounds = new Box3().setFromObject(mesh);
      if (bounds.min.y > 0.05) return;
      const footCenter = bounds.getCenter(new Vector3()),
        footSize = bounds.getSize(new Vector3());
      if (footSize.x > 0.3 || footSize.z > 0.3) return;
      addContact(
        footSize.x + 0.16,
        footSize.z + 0.16,
        footCenter.x,
        0.003,
        footCenter.z,
        -Math.PI / 2,
        0,
        0.24,
        'Contato dos pés',
      );
    });
    if (box.min.x + 2.3 < 0.18)
      addContact(
        size.z + 0.08,
        0.45,
        -2.297,
        0.27,
        center.z,
        0,
        Math.PI / 2,
        0.12,
        'Contato próximo à parede esquerda',
      );
    if (2.3 - box.max.x < 0.18)
      addContact(
        size.z + 0.08,
        0.4,
        2.297,
        0.24,
        center.z,
        0,
        -Math.PI / 2,
        0.12,
        'Contato próximo à parede direita',
      );
    if (box.min.z + 2.5 < 0.18)
      addContact(
        size.x + 0.08,
        0.4,
        center.x,
        0.24,
        -2.497,
        0,
        0,
        0.12,
        'Contato próximo à parede do fundo',
      );
  }
  const cornerCanvas = document.createElement('canvas');
  cornerCanvas.width = 32;
  cornerCanvas.height = 128;
  const cornerContext = cornerCanvas.getContext('2d')!;
  const cornerGradient = cornerContext.createLinearGradient(0, 0, 0, 128);
  cornerGradient.addColorStop(0, 'rgba(0,0,0,0)');
  cornerGradient.addColorStop(0.5, 'rgba(0,0,0,.06)');
  cornerGradient.addColorStop(1, 'rgba(0,0,0,.7)');
  cornerContext.fillStyle = cornerGradient;
  cornerContext.fillRect(0, 0, 32, 128);
  const cornerTexture = new CanvasTexture(cornerCanvas);
  textures.add(cornerTexture);
  addContact(4.6, 0.14, 0, 0.07, -2.497, 0, 0, 0.1, 'Encontro da parede com o chão', cornerTexture);
  addContact(
    4.6,
    0.14,
    0,
    0.07,
    2.497,
    0,
    Math.PI,
    0.1,
    'Encontro da parede com o chão',
    cornerTexture,
  );
  addContact(
    5,
    0.14,
    -2.297,
    0.07,
    0,
    0,
    Math.PI / 2,
    0.1,
    'Encontro da parede com o chão',
    cornerTexture,
  );
  addContact(
    5,
    0.14,
    2.297,
    0.07,
    0,
    0,
    -Math.PI / 2,
    0.1,
    'Encontro da parede com o chão',
    cornerTexture,
  );
  addContact(
    4.6,
    0.15,
    0,
    0.004,
    -2.425,
    Math.PI / 2,
    0,
    0.08,
    'Sombra curta no canto do chão',
    cornerTexture,
  );
  addContact(
    4.6,
    0.15,
    0,
    0.004,
    2.425,
    -Math.PI / 2,
    0,
    0.08,
    'Sombra curta no canto do chão',
    cornerTexture,
  );
  addContact(
    5,
    0.15,
    -2.225,
    0.004,
    0,
    -Math.PI / 2,
    0,
    0.08,
    'Sombra curta no canto do chão',
    cornerTexture,
  ).rotation.z = -Math.PI / 2;
  addContact(
    5,
    0.15,
    2.225,
    0.004,
    0,
    -Math.PI / 2,
    0,
    0.08,
    'Sombra curta no canto do chão',
    cornerTexture,
  ).rotation.z = Math.PI / 2;
  const windowOffset = 0,
    windowGroup = new Group();
  (windowGroup.position.set(0, 1.69, -2.5),
    (windowGroup.rotation.y = Math.PI / 2),
    (windowGroup.name = 'Janela em contorno vermelho'),
    scene.add(windowGroup),
    addWindowOutline(0.7, 0.8, 0, windowGroup));
  const windowLeaves: Group[] = [];
  for (const z of [-1, 1]) {
    const U = new Group();
    ((U.position.z = z * 0.75), windowGroup.add(U));
    const F = new Group();
    ((F.position.z = -z * 0.375),
      U.add(F),
      addWindowOutline(0.64, 0.375, 0.035, F),
      addOutline([0.035, 0, -0.375, 0.035, 0, 0.375], F),
      windowLeaves.push(U));
  }
  addOutline([
    1.07, 0, 2.5, 1.07, 2.3, 2.5, 1.07, 2.3, 2.5, 2.09, 2.3, 2.5, 2.09, 2.3, 2.5, 2.09, 0, 2.5,
  ]).name = 'Porta em contorno vermelho';
  const lookDirection = new Vector3(),
    windowPosition = new Vector3(0, 1.59, -2.38),
    windowProjection = new Vector3();
  function resize() {
    if (disposed) return;
    const z = roomView.clientWidth || window.innerWidth,
      U = roomView.clientHeight || window.innerHeight;
    (renderer.setSize(z, U, !1),
      (camera.aspect = z / U),
      camera.updateProjectionMatrix(),
      requestRender());
  }
  function requestRender() {
    !animationFrame &&
      !disposed &&
      visible &&
      !document.hidden &&
      (animationFrame = requestAnimationFrame(renderFrame));
  }
  function renderFrame(z: number) {
    if (((animationFrame = 0), disposed || !visible || document.hidden)) return;
    const U = Math.min(0.05, Math.max(0.001, (z - lastFrame) / 1e3));
    lastFrame = z;
    const F = reducedMotion ? 1 : 1 - Math.exp(-16 * U);
    (transitioning || ((yaw += (targetYaw - yaw) * F), (pitch += (targetPitch - pitch) * F)),
      (windowAmount += ((windowOpen ? 1 : 0) - windowAmount) * F));
    const ie = MathUtils.smoothstep(windowAmount, 0.22, 0.82),
      ce = ie > 0.55;
    (background.setRGB(ie, ie, ie),
      (roomSurfaces.visible = ie > 0.0001),
      (roomSurfaceMaterial.opacity = ie),
      (roomSurfaceMaterial.depthWrite = ie > 0.999),
      (contactOcclusion.visible = ie > 0.0001),
      contactMaterials.forEach(({ material, strength }) => (material.opacity = ie * strength)),
      roomView.classList.toggle('is-daylight', ce),
      whiteMaterial.color.setRGB(fade, fade, fade),
      bedMaterials.forEach((color, material) => material.color.copy(color).multiplyScalar(fade)),
      outlineMaterial.color.setRGB(fade, 0, 0),
      (windowLeaves[0].rotation.y = -windowAmount * 1.12),
      (windowLeaves[1].rotation.y = windowAmount * 1.12));
    const se = Math.abs(windowAmount - (windowOpen ? 1 : 0)) > 0.002;
    (lookDirection.set(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch),
    ),
      camera.lookAt(lookDirection.add(camera.position)),
      renderer.render(scene, camera),
      windowProjection.copy(windowPosition).project(camera));
    const ee =
      !transitioning &&
      windowProjection.z < 1 &&
      windowProjection.z > -1 &&
      Math.abs(windowProjection.x) < 0.87 &&
      Math.abs(windowProjection.y) < 0.75;
    ((windowButton.hidden = !ee),
      ee &&
        ((windowButton.style.left =
          MathUtils.clamp(
            ((windowProjection.x + 1) * roomView.clientWidth) / 2,
            96,
            roomView.clientWidth - 96,
          ) + 'px'),
        (windowButton.style.top =
          MathUtils.clamp(
            ((1 - windowProjection.y) * roomView.clientHeight) / 2 + 56,
            100,
            roomView.clientHeight - 100,
          ) + 'px')),
      !transitioning &&
        (Math.abs(targetYaw - yaw) > 2e-4 || Math.abs(targetPitch - pitch) > 2e-4 || se) &&
        requestRender());
  }
  (canvas.addEventListener(
    'pointerdown',
    (z) => {
      transitioning ||
        !z.isPrimary ||
        z.button !== 0 ||
        ((pointerDrag = { id: z.pointerId, x: z.clientX, yaw: targetYaw }),
        canvas.setPointerCapture(z.pointerId),
        canvas.focus({ preventScroll: !0 }),
        canvas.classList.add('is-dragging'));
    },
    { signal: events.signal },
  ),
    canvas.addEventListener(
      'pointermove',
      (z) => {
        !pointerDrag ||
          z.pointerId !== pointerDrag.id ||
          ((targetYaw = pointerDrag.yaw - (z.clientX - pointerDrag.x) * 0.0045), requestRender());
      },
      { signal: events.signal },
    ));
  function releasePointer(z: PointerEvent) {
    !pointerDrag ||
      z.pointerId !== pointerDrag.id ||
      ((pointerDrag = null),
      canvas.hasPointerCapture(z.pointerId) && canvas.releasePointerCapture(z.pointerId),
      canvas.classList.remove('is-dragging'));
  }
  for (const z of ['pointerup', 'pointercancel', 'lostpointercapture'] as const)
    canvas.addEventListener(z, releasePointer, { signal: events.signal });
  (roomView.addEventListener(
    'keydown',
    (z) => {
      if (z.key === 'Tab') {
        const F: HTMLElement[] = [canvas, ...(windowButton.hidden ? [] : [windowButton])],
          ce =
            (F.indexOf(document.activeElement as HTMLElement) + (z.shiftKey ? -1 : 1) + F.length) %
            F.length;
        (z.preventDefault(), (F[ce] as HTMLElement).focus({ preventScroll: !0 }));
        return;
      }
      if (transitioning || z.altKey || z.metaKey || z.ctrlKey) return;
      const U = z.shiftKey ? 0.2 : 0.1;
      if (z.key === 'ArrowLeft') targetYaw -= U;
      else if (z.key === 'ArrowRight') targetYaw += U;
      else if (z.key === 'ArrowUp' || z.key === 'ArrowDown') {
        z.preventDefault();
        return;
      } else return;
      (z.preventDefault(), requestRender());
    },
    { signal: events.signal },
  ),
    windowButton.addEventListener(
      'click',
      () => {
        ((windowOpen = !windowOpen),
          windowButton.setAttribute('aria-label', windowOpen ? 'Fechar janela' : 'Abrir janela'),
          windowButton.setAttribute('aria-pressed', String(windowOpen)),
          (announcement.textContent = windowOpen
            ? 'Janela aberta. O quarto ficou branco.'
            : 'Janela fechada. Voc\xEA est\xE1 no quarto escuro.'),
          requestRender());
      },
      { signal: events.signal },
    ),
    window.addEventListener('resize', resize, { signal: events.signal }),
    document.addEventListener(
      'visibilitychange',
      () => {
        ((lastFrame = performance.now()), requestRender());
      },
      { signal: events.signal },
    ),
    (renderer.shadowMap.needsUpdate = !0),
    resize());
  await renderer.compileAsync(scene, camera);
  for (const texture of textures) renderer.initTexture(texture);
  function dispose() {
    if (disposed) return;
    ((disposed = !0),
      finishReveal?.(),
      (finishReveal = void 0),
      events.abort(),
      cancelAnimationFrame(animationFrame));
    const z = new Set<BufferGeometry>(),
      U = new Set<Material>();
    scene.traverse((F) => {
      if (F instanceof Mesh || F instanceof Line) {
        z.add(F.geometry);
        for (const ie of Array.isArray(F.material) ? F.material : [F.material]) U.add(ie);
      }
    });
    for (const F of z) F.dispose();
    for (const F of U) F.dispose();
    for (const F of textures) F.dispose();
    (directionalLight.shadow.dispose(),
      renderer.dispose(),
      renderer.forceContextLoss(),
      roomView.remove());
  }
  return {
    dispose: dispose,
    async reveal() {
      ((visible = !0), roomView.classList.add('is-visible'), (lastFrame = performance.now()));
      const z = lastFrame,
        U = reducedMotion ? 0 : 2200;
      await new Promise<void>((F) => {
        finishReveal = F;
        function ie(ce: number) {
          if (disposed) {
            F();
            return;
          }
          const se = U === 0 ? 1 : Math.min(1, (ce - z) / U),
            ee = se * se * (3 - 2 * se);
          (camera.position.lerpVectors(initialCameraPosition, finalCameraPosition, ee),
            (yaw = Math.atan2(
              switchPosition.x - camera.position.x,
              camera.position.z - switchPosition.z,
            )),
            (fade = MathUtils.smoothstep(se, 0.06, 0.64)),
            (pitch = -0.09 * ee),
            renderFrame(ce),
            se < 1
              ? (animationFrame = requestAnimationFrame(ie))
              : ((transitioning = !1),
                roomView.classList.add('is-ready'),
                canvas.focus({ preventScroll: !0 }),
                (announcement.textContent =
                  'Voc\xEA est\xE1 no quarto. Arraste para olhar ao redor em 360 graus, sem caminhar.'),
                (finishReveal = void 0),
                F()));
        }
        animationFrame = requestAnimationFrame(ie);
      });
    },
  };
}
