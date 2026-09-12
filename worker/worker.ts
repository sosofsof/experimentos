import { ID_PATTERN, TOKEN_PATTERN, RequestError, readBody, validatePublication } from './validation';

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  PUBLICATION_LIMIT: RateLimit;
}
interface ArtworkRow {
  id: string;
  recipe: string;
  created_at: number;
}
interface PrivateRow extends ArtworkRow {
  delete_hash: string;
  deleted_at: number | null;
}
const columns = 'id, recipe, created_at';
const privateColumns = `${columns}, delete_hash, deleted_at`;
const json = (data: unknown, status = 200) => Response.json(data, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' },
});
async function hash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
function publicArtwork(row: ArtworkRow) {
  return { id: row.id, recipe: JSON.parse(row.recipe) as unknown, createdAt: row.created_at };
}
function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get('Origin');
  if (!origin) return null;
  const url = new URL(request.url);
  if (origin === url.origin) return origin;
  // Live Server support is only enabled when the API itself is local.
  if (['localhost', '127.0.0.1'].includes(url.hostname)) {
    try { if (['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) return origin; } catch { /* Invalid origin. */ }
  }
  throw new RequestError('Origem não permitida.', 403);
}
async function api(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url), path = url.pathname;
  if (path === '/api/health' && request.method === 'GET') {
    await env.DB.prepare('SELECT id FROM artworks LIMIT 1').first();
    return json({ ready: true });
  }
  if (path === '/api/artworks' && request.method === 'GET') {
    const cursor = url.searchParams.get('cursor');
    let timestamp = 0, id = '';
    if (cursor) {
      const parts = cursor.split('_');
      timestamp = Number(parts[0]); id = parts[1] || '';
      if (parts.length !== 2 || !Number.isSafeInteger(timestamp) || timestamp < 1 || !ID_PATTERN.test(id)) throw new RequestError('Página inválida.');
    }
    const query = cursor
      ? env.DB.prepare(`SELECT ${columns} FROM artworks WHERE deleted_at IS NULL AND (created_at < ? OR (created_at = ? AND id < ?)) ORDER BY created_at DESC, id DESC LIMIT 13`).bind(timestamp, timestamp, id)
      : env.DB.prepare(`SELECT ${columns} FROM artworks WHERE deleted_at IS NULL ORDER BY created_at DESC, id DESC LIMIT 13`);
    const { results } = await query.all<ArtworkRow>();
    const page = results.slice(0, 12), last = page.at(-1);
    return json({ artworks: page.map(publicArtwork), nextCursor: results.length > 12 && last ? `${last.created_at}_${last.id}` : null });
  }
  if (path === '/api/artworks' && request.method === 'POST') {
    const publication = validatePublication(await readBody(request));
    const deleteHash = await hash(publication.deleteToken), recipe = JSON.stringify(publication.recipe);
    const existing = await env.DB.prepare(`SELECT ${privateColumns} FROM artworks WHERE id = ?`).bind(publication.id).first<PrivateRow>();
    function matches(row: PrivateRow): boolean {
      return row.deleted_at === null && row.delete_hash === deleteHash && row.recipe === recipe;
    }
    if (existing) {
      if (!matches(existing)) throw new RequestError('Esta publicação já foi usada. Feche a janela e tente novamente.', 409);
      return json({ artwork: publicArtwork(existing) });
    }
    const ip = request.headers.get('CF-Connecting-IP') || 'local';
    if (!(await env.PUBLICATION_LIMIT.limit({ key: ip })).success) throw new RequestError('Muitos envios. Aguarde um minuto para tentar novamente.', 429);
    const now = Date.now(), day = Math.floor(now / 86400000);
    const bucket = await hash(`${day}:${ip}`);
    // Atomic daily cap; only a daily IP hash is stored, never the raw address.
    await env.DB.prepare('DELETE FROM publication_limits WHERE expires_at < ?').bind(now).run();
    const allowance = await env.DB.prepare(`INSERT INTO publication_limits(bucket, count, expires_at) VALUES (?, 1, ?)
      ON CONFLICT(bucket) DO UPDATE SET count = count + 1 WHERE count < 20 RETURNING count`).bind(bucket, (day + 2) * 86400000).first();
    if (!allowance) throw new RequestError('Limite diário de publicações atingido. Tente amanhã.', 429);
    // Keep legacy columns empty for schema compatibility; never accept attribution.
    await env.DB.prepare(`INSERT INTO artworks (id, title, author, recipe, delete_hash, created_at)
      SELECT ?, '', '', ?, ?, ? WHERE (SELECT COUNT(*) FROM artworks) < 10000 ON CONFLICT(id) DO NOTHING`)
      .bind(publication.id, recipe, deleteHash, now).run();
    const stored = await env.DB.prepare(`SELECT ${privateColumns} FROM artworks WHERE id = ?`).bind(publication.id).first<PrivateRow>();
    if (!stored) throw new RequestError('A galeria atingiu sua capacidade. Você ainda pode salvar o JPG.', 503);
    if (!matches(stored)) throw new RequestError('Identificador já utilizado. Feche a janela e tente novamente.', 409);
    return json({ artwork: publicArtwork(stored) }, 201);
  }
  const match = path.match(/^\/api\/artworks\/([^/]+)$/);
  if (match && ID_PATTERN.test(match[1])) {
    const id = match[1];
    if (request.method === 'GET') {
      const row = await env.DB.prepare(`SELECT ${columns} FROM artworks WHERE id = ? AND deleted_at IS NULL`).bind(id).first<ArtworkRow>();
      if (!row) throw new RequestError('Esta peça não foi encontrada ou foi retirada da galeria.', 404);
      return json({ artwork: publicArtwork(row) });
    }
    if (request.method === 'DELETE') {
      const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') || '';
      if (!TOKEN_PATTERN.test(token)) throw new RequestError('Use o link privado recebido ao publicar.', 403);
      const result = await env.DB.prepare('UPDATE artworks SET deleted_at = COALESCE(deleted_at, ?) WHERE id = ? AND delete_hash = ? RETURNING id')
        .bind(Date.now(), id, await hash(token)).first();
      if (!result) throw new RequestError('Link de exclusão inválido.', 403);
      return json({ deleted: true });
    }
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
      response = request.method === 'OPTIONS' ? new Response(null, { status: 204 }) : await api(request, env);
    } catch (error) {
      response = error instanceof RequestError ? json({ error: error.message }, error.status)
        : json({ error: 'A galeria está temporariamente indisponível. Sua composição continua no editor; tente novamente em instantes.' }, 503);
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
