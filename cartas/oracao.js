'use strict';
// A foto original é incorporada para que a transparência funcione também ao abrir index.html diretamente.
const prayerOriginalSource = './assets/oracao-original.jpg';

let prayerRendering = null;

// Remove apenas o branco externo conectado às bordas da foto.
// O interior do algodão e todos os símbolos ficam fora da área de recorte.
function clearPrayerMargin(frame) {
  const { data, width, height } = frame;
  const count = width * height;
  const exterior = new Uint8Array(count);
  const queue = new Uint32Array(count);
  const left = Math.ceil(width * 0.035);
  const right = width - left;
  const top = Math.ceil(height * 0.08);
  const bottom = height - top;
  let head = 0;
  let tail = 0;

  function isInterior(x, y) {
    return x >= left && x < right && y >= top && y < bottom;
  }

  function visit(pixel) {
    if (exterior[pixel]) return;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (isInterior(x, y)) return;
    const offset = pixel * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const darkest = Math.min(r, g, b);
    const lightest = Math.max(r, g, b);
    if (darkest < 242 || lightest - darkest > 14) return;
    exterior[pixel] = 1;
    queue[tail++] = pixel;
  }

  for (let x = 0; x < width; x++) {
    visit(x);
    visit((height - 1) * width + x);
  }
  for (let y = 0; y < height; y++) {
    visit(y * width);
    visit(y * width + width - 1);
  }
  while (head < tail) {
    const pixel = queue[head++];
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x > 0) visit(pixel - 1);
    if (x + 1 < width) visit(pixel + 1);
    if (y > 0) visit(pixel - width);
    if (y + 1 < height) visit(pixel + width);
  }

  for (let pixel = 0; pixel < count; pixel++) {
    const offset = pixel * 4;
    if (exterior[pixel]) {
      data[offset + 3] = 0;
      continue;
    }
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (isInterior(x, y)) continue;
    const touchesBackground =
      (x > 0 && exterior[pixel - 1]) ||
      (x + 1 < width && exterior[pixel + 1]) ||
      (y > 0 && exterior[pixel - width]) ||
      (y + 1 < height && exterior[pixel + width]);
    if (!touchesBackground) continue;
    const darkest = Math.min(data[offset], data[offset + 1], data[offset + 2]);
    if (darkest <= 222) continue;
    // Conserva as franjas e suaviza o encontro com a área transparente.
    const opacity = Math.min(1, (255 - darkest) / 33);
    data[offset + 3] = Math.round(255 * opacity);
    for (let channel = 0; channel < 3; channel++) {
      data[offset + channel] = Math.round(
        Math.max(0, Math.min(255, (data[offset + channel] - 255 * (1 - opacity)) / opacity)),
      );
    }
  }
  return frame;
}

function renderPrayer(canvas) {
  if (prayerRendering) return prayerRendering;
  prayerRendering = new Promise((resolve, reject) => {
    const original = new Image();
    original.onload = () => {
      try {
        canvas.width = original.naturalWidth;
        canvas.height = original.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(original, 0, 0);
        const frame = context.getImageData(0, 0, canvas.width, canvas.height);
        context.putImageData(clearPrayerMargin(frame), 0, 0);
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    original.onerror = () => reject(new Error('Não foi possível carregar o bordado.'));
    original.src = prayerOriginalSource;
  });
  prayerRendering.catch(() => {
    prayerRendering = null;
  });
  return prayerRendering;
}
