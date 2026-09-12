import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';

// Compile the shared interactions into the disposable deployment output.
await Promise.all([
  { name: 'rolo/scroll-journey', globalName: 'RoloJourney' },
  { name: 'assets/navigation' },
].map(({ name, globalName }) => build({
  entryPoints: [fileURLToPath(new URL(`../${name}.ts`, import.meta.url))],
  outfile: fileURLToPath(new URL(`../dist/${name}.js`, import.meta.url)),
  bundle: true,
  format: 'iife',
  globalName,
  target: 'es2022',
  banner: { js: `// Generated from ${name}.ts by node scripts/build-interactions.mjs.` },
})));
