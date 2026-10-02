import type { Env } from './types';
import { json } from './response';
import { ID_PATTERN, RequestError } from './validation';
import { listArtworks, publishArtwork, getArtwork, withdrawArtwork } from './artworks';
function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get('Origin');
  if (!origin) return null;
  const url = new URL(request.url);
  if (origin === url.origin) return origin;
  // Live Server support is only enabled when the API itself is local.
  if (['localhost', '127.0.0.1'].includes(url.hostname)) {
    try {
      if (['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) return origin;
    } catch {
      /* Invalid origin. */
    }
  }
  throw new RequestError('Origem não permitida.', 403);
}
async function api(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url),
    path = url.pathname;
  if (path === '/api/health' && request.method === 'GET') {
    await env.DB.prepare('SELECT id FROM artworks LIMIT 1').first();
    return json({ ready: true });
  }
  if (path === '/api/artworks' && request.method === 'GET') return listArtworks(url, env);
  if (path === '/api/artworks' && request.method === 'POST') return publishArtwork(request, env);
  const match = path.match(/^\/api\/artworks\/([^/]+)$/);
  if (match && ID_PATTERN.test(match[1])) {
    if (request.method === 'GET') return getArtwork(match[1], env);
    if (request.method === 'DELETE') return withdrawArtwork(request, match[1], env);
  }
  throw new RequestError('Endereço não encontrado.', 404);
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!new URL(request.url).pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    let origin: string | null = null;
    let response: Response;
    try {
      origin = allowedOrigin(request);
      response =
        request.method === 'OPTIONS'
          ? new Response(null, { status: 204 })
          : await api(request, env);
    } catch (error) {
      response =
        error instanceof RequestError
          ? json({ error: error.message }, error.status)
          : json(
              {
                error:
                  'A galeria está temporariamente indisponível. Sua composição continua no editor; tente novamente em instantes.',
              },
              503,
            );
    }
    if (origin) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.headers.set('Vary', 'Origin');
    }
    return response;
  },
} satisfies ExportedHandler<Env>;
