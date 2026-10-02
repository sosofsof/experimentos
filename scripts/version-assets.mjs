import { readFile, writeFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { transform } from 'esbuild';

export async function versionAssets(root) {
  const files = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(file);
      else files.push(file);
    }
  }
  await walk(root);
  const publicFiles = new Set(files);
  const hashes = new Map();
  async function reference(url, owner) {
    if (/^(?:[a-z]+:|\/\/|#)/i.test(url)) return url;
    const [clean] = url.split(/[?#]/);
    const file = path.resolve(path.dirname(owner), clean);
    if (!publicFiles.has(file)) return url;
    let hash = hashes.get(file);
    if (!hash) {
      hash = createHash('sha256')
        .update(await readFile(file))
        .digest('hex')
        .slice(0, 16);
      hashes.set(file, hash);
    }
    return `${clean}?v=${hash}`;
  }
  async function replace(text, expression, callback) {
    for (const match of [...text.matchAll(expression)].reverse()) {
      text =
        text.slice(0, match.index) +
        (await callback(match)) +
        text.slice(match.index + match[0].length);
    }
    return text;
  }
  for (const file of files.filter((value) => value.endsWith('.css'))) {
    let text = await readFile(file, 'utf8');
    text = await replace(
      text,
      /url\(\s*(["']?)([^)"']+)\1\s*\)/g,
      async (match) => `url("${await reference(match[2], file)}")`,
    );
    await writeFile(file, (await transform(text, { loader: 'css', minify: true })).code);
    hashes.delete(file);
  }
  for (const file of files.filter((value) => value.endsWith('.js'))) {
    let text = await readFile(file, 'utf8');
    const owner = file.startsWith(path.join(root, 'pecas') + path.sep)
      ? path.join(root, 'pecas/index.html')
      : file;
    text = await replace(
      text,
      /(["'])(\.\.?\/[^"'\s]+\.(?:webp|png|jpe?g|svg)(?:\?[^"'\s]*)?)\1/g,
      async (match) => match[1] + (await reference(match[2], owner)) + match[1],
    );
    await writeFile(
      file,
      (await transform(text, { loader: 'js', minify: true, target: 'es2022' })).code,
    );
    hashes.delete(file);
  }
  for (const file of files.filter((value) => value.endsWith('.html'))) {
    let text = await readFile(file, 'utf8');
    text = await replace(
      text,
      /\b(src|href)=(["'])([^"']+\.(?:js|css|webp|png|jpe?g|svg)(?:\?[^"']*)?)\2/g,
      async (match) => `${match[1]}=${match[2]}${await reference(match[3], file)}${match[2]}`,
    );
    await writeFile(file, text);
  }
}
