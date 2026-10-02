import type { CatalogAsset, Recipe } from './artwork.types';
export interface PlacedPiece {
  asset: CatalogAsset;
  x: number;
  y: number;
  relative: number;
  rotation: number;
}
export const MIN_SCALE = 0.035;
export const MAX_SCALE = 0.9;
export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));
export function normalizeRotation(value: number): number {
  return ((((value + 180) % 360) + 360) % 360) - 180;
}
export function radians(piece: PlacedPiece): number {
  return ((piece.rotation || 0) * Math.PI) / 180;
}
export function dimensions(
  piece: PlacedPiece,
  width: number,
  height: number,
): { w: number; h: number } {
  const long = piece.relative * Math.min(width, height);
  const original = Math.max(piece.asset.width, piece.asset.height);
  return { w: (long * piece.asset.width) / original, h: (long * piece.asset.height) / original };
}
export function keep(
  piece: PlacedPiece,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const { w, h } = dimensions(piece, width, height),
    r = radians(piece);
  const bw = Math.abs(w * Math.cos(r)) + Math.abs(h * Math.sin(r));
  const bh = Math.abs(w * Math.sin(r)) + Math.abs(h * Math.cos(r));
  const overlap = Math.min(8, bw / 2, bh / 2);
  piece.x = clamp(x, -bw / 2 + overlap, width + bw / 2 - overlap) / width;
  piece.y = clamp(y, -bh / 2 + overlap, height + bh / 2 - overlap) / height;
}
export function localPoint(
  piece: PlacedPiece,
  x: number,
  y: number,
  width: number,
  height: number,
): { x: number; y: number } {
  const dx = x - piece.x * width,
    dy = y - piece.y * height,
    r = radians(piece);
  return { x: dx * Math.cos(r) + dy * Math.sin(r), y: -dx * Math.sin(r) + dy * Math.cos(r) };
}
export function hitTest(
  piece: PlacedPiece,
  x: number,
  y: number,
  width: number,
  height: number,
  mask: Uint8Array,
): boolean {
  const asset = piece.asset,
    { w, h } = dimensions(piece, width, height),
    q = localPoint(piece, x, y, width, height);
  const mx = Math.floor(((q.x + w / 2) / w) * asset.maskWidth),
    my = Math.floor(((q.y + h / 2) / h) * asset.maskHeight);
  if (mx < 0 || my < 0 || mx >= asset.maskWidth || my >= asset.maskHeight) return false;
  const bit = my * asset.maskWidth + mx;
  return !!(mask[bit >> 3] & (1 << (bit & 7)));
}
export function compositionRecipe(placed: PlacedPiece[], background: string): Recipe {
  return {
    version: 1,
    background,
    pieces: placed.map((piece) => ({
      id: piece.asset.id,
      x: piece.x,
      y: piece.y,
      relative: piece.relative,
      rotation: piece.rotation || 0,
    })),
  };
}
