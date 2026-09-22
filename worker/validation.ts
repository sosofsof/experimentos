import catalog from '../pecas/assets/v2/catalog.json';
import type { Recipe } from '../pecas/src/artwork.types';

const assetIds = new Set(catalog.assets.map(asset => asset.id));
const backgrounds = new Set(['branco', 'preto', ...Object.keys(catalog.backgrounds)]);
export const ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const TOKEN_PATTERN = /^[0-9a-f]{64}$/;
export class RequestError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new RequestError('Dados de publicação inválidos.');
  return value as Record<string, unknown>;
}
function number(value: unknown, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new RequestError('Posição, tamanho ou rotação inválida.');
  return value;
}
export function validatePublication(value: unknown) {
  const data = object(value), recipe = object(data.recipe);
  if (typeof data.id !== 'string' || !ID_PATTERN.test(data.id)) throw new RequestError('Identificador inválido.');
  if (typeof data.deleteToken !== 'string' || !TOKEN_PATTERN.test(data.deleteToken)) throw new RequestError('Chave de exclusão inválida.');
  if (data.publicConsent !== true) throw new RequestError('Confirme que deseja tornar a peça pública.');
  if (recipe.version !== 1 || typeof recipe.background !== 'string' || !backgrounds.has(recipe.background)) throw new RequestError('Catálogo ou fundo inválido.');
  if (!Array.isArray(recipe.pieces) || recipe.pieces.length < 1 || recipe.pieces.length > 200) throw new RequestError('Publique uma composição com 1 a 200 elementos.');
  const normalized: Recipe = {
    version: 1, background: recipe.background,
    pieces: recipe.pieces.map(value => {
      const piece = object(value);
      if (typeof piece.id !== 'string' || !assetIds.has(piece.id)) throw new RequestError('Elemento fora do catálogo.');
      return { id: piece.id, x: number(piece.x, -1, 2), y: number(piece.y, -1, 2), relative: number(piece.relative, .001, .9), rotation: number(piece.rotation, -180, 180) };
    }),
  };
  return { id: data.id, deleteToken: data.deleteToken, recipe: normalized };
}
export async function readBody(request: Request): Promise<unknown> {
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) throw new RequestError('Envie os dados em JSON.', 415);
  if (Number(request.headers.get('Content-Length')) > 65536) throw new RequestError('A composição excede o tamanho permitido.', 413);
  if (!request.body) throw new RequestError('Publicação vazia.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 65536) { await reader.cancel(); throw new RequestError('A composição excede o tamanho permitido.', 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)) as unknown; }
  catch { throw new RequestError('Dados de publicação inválidos.'); }
}
