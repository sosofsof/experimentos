import type { Artwork, Recipe } from './artwork.types';

const local = ['localhost', '127.0.0.1'].includes(location.hostname);
const base = local && location.port !== '8787' ? 'http://127.0.0.1:8787' : '';
export interface Publication {
  id: string;
  deleteToken: string;
  recipe: Recipe;
  publicConsent: true;
}
export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(base + path, { ...init, signal: AbortSignal.timeout(20000) }); }
  catch { throw new Error('Não conseguimos falar com a galeria. Confira sua conexão e tente novamente.'); }
  let data: unknown;
  try { data = await response.json(); }
  catch { throw new Error('A galeria está indisponível neste endereço. Você ainda pode salvar o JPG.'); }
  if (!response.ok) {
    const message = data && typeof data === 'object' && 'error' in data && typeof data.error === 'string' ? data.error : 'Não foi possível concluir. Tente novamente.';
    throw new ApiError(message, response.status);
  }
  return data as T;
}
export const publishArtwork = (publication: Publication) => request<{ artwork: Artwork }>('/api/artworks', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(publication),
});
export const listArtworks = (cursor: string | null) => request<{ artworks: Artwork[]; nextCursor: string | null }>('/api/artworks' + (cursor ? '?cursor=' + encodeURIComponent(cursor) : ''));
export const getArtwork = (id: string) => request<{ artwork: Artwork }>('/api/artworks/' + encodeURIComponent(id));
export const deleteArtwork = (id: string, token: string) => request<{ deleted: boolean }>('/api/artworks/' + encodeURIComponent(id), {
  method: 'DELETE', headers: { Authorization: 'Bearer ' + token },
});
export function artworkUrl(id: string): string {
  const url = new URL('./galeria.html', location.href);
  url.search = '?peca=' + encodeURIComponent(id); url.hash = '';
  return url.href;
}
