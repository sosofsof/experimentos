import type { Recipe } from './artwork.types';

// Coordinates and frame match the original editor. Keep v1 stable for published work.
export function renderRecipe(
  target: CanvasRenderingContext2D,
  width: number,
  height: number,
  recipe: Recipe,
  images: Map<string, HTMLImageElement>,
  backgrounds: Map<string, HTMLImageElement>,
): void {
  target.fillStyle = recipe.background === 'preto' ? '#000' : '#fff';
  target.fillRect(0, 0, width, height);
  const bg = backgrounds.get(recipe.background);
  if (bg?.complete && bg.naturalWidth) {
    const factor = Math.max(width / bg.naturalWidth, height / bg.naturalHeight);
    const bw = bg.naturalWidth * factor, bh = bg.naturalHeight * factor;
    target.drawImage(bg, (width - bw) / 2, (height - bh) / 2, bw, bh);
  }
  for (const piece of recipe.pieces) {
    const asset = window.ARTWORK_ASSETS.find(item => item.id === piece.id);
    const im = images.get(piece.id);
    if (!asset || !im?.complete || !im.naturalWidth) continue;
    const long = piece.relative * Math.min(width, height);
    const w = long * asset.width / Math.max(asset.width, asset.height);
    const h = long * asset.height / Math.max(asset.width, asset.height);
    target.save();
    target.translate(piece.x * width, piece.y * height);
    target.rotate(piece.rotation * Math.PI / 180);
    target.drawImage(im, -w / 2, -h / 2, w, h);
    target.restore();
  }
  frame(target, width, height);
}

function frame(target: CanvasRenderingContext2D, width: number, height: number): void {
  target.save();
  target.scale(width / 1000, height / (2000 / 3));
  target.strokeStyle = '#000';
  target.lineCap = 'round';
  target.lineJoin = 'round';
  function edge(x1: number, y1: number, x2: number, y2: number, seed: number): void {
    const dx = x2 - x1, dy = y2 - y1, length = Math.hypot(dx, dy);
    const nx = -dy / length, ny = dx / length, steps = Math.ceil(length / 4);
    let previous: [number, number] | null = null;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, d = t * length;
      const wobble = 1.05 * Math.sin(d * .025 + seed) + .4 * Math.sin(d * .071 + seed * 2) + .12 * Math.sin(d * .14 + seed);
      const x = x1 + dx * t + nx * wobble, y = y1 + dy * t + ny * wobble;
      if (previous) {
        target.lineWidth = 1.35 + .22 * Math.sin(d * .019 + seed) + .08 * Math.sin(d * .083);
        target.beginPath(); target.moveTo(previous[0], previous[1]); target.lineTo(x, y); target.stroke();
      }
      previous = [x, y];
    }
  }
  edge(5, 7, 995, 7, 1); edge(993, 4, 993, 661, 3);
  edge(997, 659, 4, 659, 5); edge(7, 663, 7, 3, 7);
  target.restore();
}

const imagePromises = new Map<string, Promise<HTMLImageElement>>();
function loadImage(src: string): Promise<HTMLImageElement> {
  let promise = imagePromises.get(src);
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => { imagePromises.delete(src); reject(new Error('Não foi possível carregar uma imagem da peça.')); };
      image.src = src;
    });
    imagePromises.set(src, promise);
  }
  return promise;
}
export async function drawArtwork(canvas: HTMLCanvasElement, recipe: Recipe): Promise<void> {
  if (recipe.version !== 1) throw new Error('Esta versão de peça ainda não pode ser exibida.');
  const images = new Map<string, HTMLImageElement>();
  const backgrounds = new Map<string, HTMLImageElement>();
  await Promise.all([...new Set(recipe.pieces.map(piece => piece.id))].map(async id => {
    const asset = window.ARTWORK_ASSETS.find(item => item.id === id);
    if (!asset) throw new Error('Um elemento desta peça não está disponível.');
    images.set(id, await loadImage(asset.src));
  }));
  const src = window.ARTWORK_BACKGROUNDS[recipe.background];
  if (src) backgrounds.set(recipe.background, await loadImage(src));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Seu navegador não conseguiu exibir a peça.');
  renderRecipe(context, canvas.width, canvas.height, recipe, images, backgrounds);
}
