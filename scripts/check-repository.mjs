import { execFileSync } from 'node:child_process';
import { lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isPrivatePath } from './file-policy.mjs';

export const root = path.resolve(import.meta.dirname, '..');

// Inspect names and metadata before any scanner reads file contents.
export async function repositoryFiles() {
  const names = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {
    cwd: root, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024,
  }).split('\0').filter(Boolean);
  const files = [];
  for (const file of new Set(names)) {
    if (isPrivatePath(file) || /^(?:node_modules|dist|dist-worker|\.wrangler|pecas\/generated)(?:\/|$)/.test(file)) {
      throw new Error('Arquivo privado ou gerado incluído no Git: [REDACTED]. Revise os nomes sem abrir seu conteúdo.');
    }
    const segments = file.split('/');
    let missing = false;
    for (let end = 1; end <= segments.length; end++) {
      const info = await lstat(path.join(root, ...segments.slice(0, end))).catch(error => {
        if (error.code === 'ENOENT') return null;
        throw error;
      });
      if (!info) { missing = true; break; }
      if (info.isSymbolicLink()) throw new Error('Links simbólicos não são permitidos nos arquivos do projeto.');
    }
    if (!missing) files.push(file);
  }
  return files;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const files = await repositoryFiles();
  console.log(`PASS: ${files.length} caminhos verificados, sem arquivos privados ou gerados incluídos no Git.`);
}
