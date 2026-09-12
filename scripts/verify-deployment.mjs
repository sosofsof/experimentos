import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';

const origin = 'https://experimentos-pecas-livres.experimentos.workers.dev';
const root = path.resolve(import.meta.dirname, '..', 'dist');
const pages = [
  ['/', 'index.html'], ['/pecas/', 'pecas/index.html'],
  ['/pecas/galeria.html', 'pecas/galeria.html'],
  ['/rolo/', 'rolo/index.html'], ['/flores/', 'flores/index.html'], ['/cartas/', 'cartas/index.html'],
  ...['render', 'publication', 'gallery'].map(name => [`/pecas/generated/${name}.js`, `pecas/generated/${name}.js`]),
  ...['assets/navigation.js', 'assets/navigation.css', 'rolo/scroll-journey.js', 'rolo/scroll-journey.css']
    .map(file => [`/${file}`, file]),
];
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

async function verify(urlPath, check) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const url = new URL(urlPath, origin);
      url.searchParams.set('verificacao', `${Date.now()}-${attempt}`);
      const response = await fetch(url, {
        signal: AbortSignal.timeout(15000), headers: { 'Cache-Control': 'no-cache' },
      });
      if (response.ok && new URL(response.url).origin === origin && await check(response)) {
        console.log(`PASS: ${urlPath}`);
        return;
      }
    } catch { /* Report only the public path, never response bodies or headers. */ }
    if (attempt < 3) await setTimeout(5000);
  }
  throw new Error(`FAIL: publicação não confirmada em ${urlPath}. Não repetir o deploy sem verificar seu estado.`);
}

for (const [urlPath, file] of pages) {
  const expected = digest(await readFile(path.join(root, file)));
  await verify(urlPath, async response => digest(Buffer.from(await response.arrayBuffer())) === expected);
}
await verify('/api/health', async response => (await response.json()).ready === true);
console.log('PASS: páginas e bundles correspondem ao build; API respondeu pronta. Nenhuma peça foi criada ou retirada.');
