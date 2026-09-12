import { build } from 'esbuild';
import { cp, mkdir, readFile, writeFile, readdir, lstat, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { isPrivatePath, isPublicFile } from './file-policy.mjs';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
for (const directory of ['dist', 'dist-worker', 'pecas', 'pecas/generated']) {
  const info = await lstat(path.join(root, directory)).catch(error => {
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
  const existing = await lstat(output).catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (existing && (!existing.isFile() || existing.isSymbolicLink())) throw new Error('Saída gerada inválida.');
  await build({
    entryPoints: [path.join(root, `pecas/src/${entry}.ts`)],
    outfile: output,
    bundle: true, format: 'iife', target: 'es2022',
    ...(entry === 'render' ? { globalName: 'ArtworkRendering' } : {}),
  });
}
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const folder of ['assets', 'pecas', 'cartas', 'flores', 'rolo']) {
  await cp(path.join(root, folder), path.join(dist, folder), {
    recursive: true,
    filter: async file => {
      const relative = path.relative(root, file);
      const info = await lstat(file);
      if (info.isSymbolicLink()) throw new Error('Link simbólico não permitido na publicação.');
      if (isPrivatePath(relative) || relative.split(path.sep).some(part => part.startsWith('.') || part === 'src')) return false;
      if (info.isDirectory()) return true;
      return isPublicFile(relative)
        && !['rolo', 'flores'].some(name => file === path.join(root, name, 'index.html'));
    },
  });
}
await cp(path.join(root, 'index.html'), path.join(dist, 'index.html'));
await cp(path.join(root, 'scripts/static-headers'), path.join(dist, '_headers'));
// The original Rolo page exceeds the hosting file limit. Extract its embedded
// images only in the deployment output; its source and behavior stay intact.
for (const folder of ['rolo', 'flores']) {
  const file = path.join(dist, folder, 'index.html');
  let html = await readFile(path.join(root, folder, 'index.html'), 'utf8');
  const imageDir = path.join(dist, folder, 'embedded');
  await mkdir(imageDir, { recursive: true });
  if (folder === 'rolo') {
    const embedded = html.match(/<script[^>]*id=["']fabric-assets["'][^>]*>([\s\S]*?)<\/script>/);
    if (!embedded) throw new Error('Catálogo original do Rolo não encontrado.');
    const urls = {};
    for (const [assetPath, [type, encoded]] of Object.entries(JSON.parse(embedded[1]))) {
      const bytes = Buffer.from(encoded, 'base64');
      const extension = type === 'image/svg+xml' ? 'svg' : type.split('/')[1];
      const name = createHash('sha256').update(bytes).digest('hex').slice(0, 20) + '.' + extension;
      await writeFile(path.join(imageDir, name), bytes);
      urls[assetPath] = './embedded/' + name;
    }
    html = html.replace(embedded[0], '');
    const bootstrap = /<script>\s*const embeddedNode = document\.getElementById\('fabric-assets'\);[\s\S]*?<\/script>/;
    if (!bootstrap.test(html)) throw new Error('Carregador original do Rolo não encontrado.');
    html = html.replace(bootstrap, '<script>window.__FABRIC_ASSETS__ = ' + JSON.stringify(urls) + ';</script>');
  }
  const matches = [...html.matchAll(/data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)/g)];
  for (const match of matches) {
    const bytes = Buffer.from(match[2], 'base64');
    const name = createHash('sha256').update(bytes).digest('hex').slice(0, 20) + '.' + match[1];
    await writeFile(path.join(imageDir, name), bytes);
    html = html.replaceAll(match[0], './embedded/' + name);
  }
  await writeFile(file, html);
}
async function checkSizes(dir) {
  for (const name of await readdir(dir)) {
    const file = path.join(dir, name), info = await lstat(file);
    const relative = path.relative(dist, file);
    if (info.isSymbolicLink() || isPrivatePath(relative)) throw new Error('Arquivo privado ou link simbólico no build.');
    if (info.isDirectory()) await checkSizes(file);
    else {
      if (relative !== '_headers' && !isPublicFile(relative)) throw new Error(`Tipo de arquivo não permitido no site: ${relative}`);
      if (info.size > 25 * 1024 * 1024) throw new Error(`Arquivo excede 25 MiB: ${relative}`);
    }
  }
}
await checkSizes(dist);
console.log('Build concluído. Catálogo v1 preservado; todos os arquivos abaixo de 25 MiB.');
