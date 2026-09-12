import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { repositoryFiles, root } from './check-repository.mjs';

const files = await repositoryFiles();
const temporary = await mkdtemp(path.join(tmpdir(), 'experimentos-scan-'));
try {
  const snapshot = path.join(temporary, 'source');
  await mkdir(snapshot);
  for (const file of files) {
    const destination = path.join(snapshot, file);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(path.join(root, file), destination, { dereference: false });
  }
  const report = path.join(temporary, 'report.json');
  const result = spawnSync(process.env.GITLEAKS_BIN || 'gitleaks', [
    'dir', snapshot, '--redact=100', '--no-banner', '--no-color', '--log-level=error',
    '--ignore-gitleaks-allow', '--gitleaks-ignore-path', '/dev/null',
    '--report-format=json', '--report-path', report,
  ], { cwd: temporary, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
  // Never forward scanner stdout/stderr: even a tool failure may contain source snippets.
  if (result.error || result.status === null || result.status > 1) {
    throw new Error('Scanner indisponível ou com erro. Instale Gitleaks 8.30.1; a verificação não pode ser ignorada.');
  }
  if (result.status !== 0) {
    const findings = JSON.parse(await readFile(report, 'utf8'));
    for (const finding of findings) {
      const file = path.isAbsolute(finding.File) ? path.relative(snapshot, finding.File) : finding.File;
      console.error(`FAIL: ${file}:${finding.StartLine} — ${finding.RuleID}: [REDACTED]`);
    }
    process.exitCode = 1;
  } else {
    console.log('PASS: nenhum segredo reconhecido pelo Gitleaks no conteúdo atual do projeto.');
  }
} finally {
  // Only the temporary copy created by this invocation is removed.
  await rm(temporary, { recursive: true, force: true });
}
