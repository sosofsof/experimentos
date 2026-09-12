import { spawnSync } from 'node:child_process';
import { repositoryFiles, root } from './check-repository.mjs';

const files = (await repositoryFiles()).filter(file => /\.(?:mjs|js)$/.test(file));
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Sintaxe inválida em ${file}. Revise o código sem copiar dados privados.`);
}
console.log(`PASS: sintaxe de ${files.length} arquivos JavaScript verificada.`);
