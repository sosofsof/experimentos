import { drawFrame } from './frame';
import { assetsById } from './catalog';
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
    const bw = bg.naturalWidth * factor,
      bh = bg.naturalHeight * factor;
    target.drawImage(bg, (width - bw) / 2, (height - bh) / 2, bw, bh);
  }
  for (const piece of recipe.pieces) {
    const asset = assetsById.get(piece.id);
    const im = images.get(piece.id);
    if (!asset || !im?.complete || !im.naturalWidth) continue;
    const long = piece.relative * Math.min(width, height);
    const w = (long * asset.width) / Math.max(asset.width, asset.height);
    const h = (long * asset.height) / Math.max(asset.width, asset.height);
    target.save();
    target.translate(piece.x * width, piece.y * height);
    target.rotate((piece.rotation * Math.PI) / 180);
    target.drawImage(im, -w / 2, -h / 2, w, h);
    target.restore();
  }
  drawFrame(target, width, height);
}

const imagePromises = new Map<string, Promise<HTMLImageElement>>();
function loadImage(src: string): Promise<HTMLImageElement> {
  let promise = imagePromises.get(src);
  if (!promise) {
    promise = new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => {
        imagePromises.delete(src);
        reject(new Error('Não foi possível carregar uma imagem da peça.'));
      };
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
  await Promise.all(
    [...new Set(recipe.pieces.map((piece) => piece.id))].map(async (id) => {
      const asset = assetsById.get(id);
      if (!asset) throw new Error('Um elemento desta peça não está disponível.');
      images.set(id, await loadImage(asset.src));
    }),
  );
  const src = window.ARTWORK_BACKGROUNDS[recipe.background];
  if (src) backgrounds.set(recipe.background, await loadImage(src));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Seu navegador não conseguiu exibir a peça.');
  renderRecipe(context, canvas.width, canvas.height, recipe, images, backgrounds);
}
