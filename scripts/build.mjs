import { build } from 'esbuild';
import { cp, mkdir, readFile, writeFile, readdir, lstat, rm } from 'node:fs/promises';
import { versionAssets } from './version-assets.mjs';
import path from 'node:path';
import { isPrivatePath, isPublicFile } from './file-policy.mjs';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
for (const directory of ['dist', 'dist-worker', 'pecas', 'pecas/generated']) {
  const info = await lstat(path.join(root, directory)).catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (info && (!info.isDirectory() || info.isSymbolicLink())) {
    throw new Error(`Diretório gerado ou sua origem inválida: ${directory}`);
  }
}
await mkdir(path.join(root, 'pecas/generated'), { recursive: true });
for (const entry of ['render', 'publication', 'gallery']) {
  const output = path.join(root, `pecas/generated/${entry}.js`);
  const existing = await lstat(output).catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (existing && (!existing.isFile() || existing.isSymbolicLink()))
    throw new Error('Saída gerada inválida.');
  await build({
    entryPoints: [path.join(root, `pecas/src/${entry}.ts`)],
    outfile: output,
    bundle: true,
    format: 'iife',
    target: 'es2022',
    ...(entry === 'render' ? { globalName: 'ArtworkRendering' } : {}),
  });
}
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const folder of ['assets', 'pecas', 'cartas', 'flores', 'rolo']) {
  await cp(path.join(root, folder), path.join(dist, folder), {
    recursive: true,
    filter: async (file) => {
      const relative = path.relative(root, file);
      const info = await lstat(file);
      if (info.isSymbolicLink()) throw new Error('Link simbólico não permitido na publicação.');
      if (
        isPrivatePath(relative) ||
        relative.split(path.sep).some((part) => part.startsWith('.') || part === 'src')
      )
        return false;
      if (info.isDirectory()) return true;
      return isPublicFile(relative);
    },
  });
}
await cp(path.join(root, 'index.html'), path.join(dist, 'index.html'));
await cp(path.join(root, 'scripts/static-headers'), path.join(dist, '_headers'));
await import('./build-interactions.mjs');
const catalog = JSON.parse(await readFile(path.join(root, 'pecas/assets/v2/catalog.json'), 'utf8'));
await writeFile(
  path.join(dist, 'pecas/assets/v2/catalog.js'),
  'window.ARTWORK_ASSETS=' +
    JSON.stringify(catalog.assets) +
    ';\nwindow.ARTWORK_BACKGROUNDS=' +
    JSON.stringify(catalog.backgrounds) +
    ';\n',
);

await build({
  entryPoints: [path.join(root, 'pecas/editor.js')],
  outfile: path.join(dist, 'pecas/editor.js'),
  bundle: true,
  format: 'iife',
  target: 'es2022',
});
await versionAssets(dist);
async function checkSizes(dir) {
  for (const name of await readdir(dir)) {
    const file = path.join(dir, name),
      info = await lstat(file);
    const relative = path.relative(dist, file);
    if (info.isSymbolicLink() || isPrivatePath(relative))
      throw new Error('Arquivo privado ou link simbólico no build.');
    if (info.isDirectory()) await checkSizes(file);
    else {
      if (relative !== '_headers' && !isPublicFile(relative))
        throw new Error(`Tipo de arquivo não permitido no site: ${relative}`);
      if (info.size > 25 * 1024 * 1024) throw new Error(`Arquivo excede 25 MiB: ${relative}`);
    }
  }
}
await checkSizes(dist);
console.log('Build concluído. Todos os arquivos abaixo de 25 MiB.');
