from pathlib import Path
import re, json, base64, urllib.parse

root = Path.cwd()
def read(p): return (root / p).read_text()
def write(p, text):
    file = root / p
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(text)
def image(p, data):
    file = root / p
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_bytes(data)
def extract_styles(folder, filename):
    p = folder + '/index.html' if folder else 'index.html'
    html = read(p)
    styles = re.findall(r'<style[^>]*>(.*?)</style>', html, re.S)
    assert styles
    html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.S)
    html = html.replace('</head>', f'<link rel="stylesheet" href="{filename}" />\n</head>')
    write(p, html)
    return '\n\n'.join(styles)

write('assets/home.css', extract_styles('', './assets/home.css'))
flores = read('flores/index.html')
names = iter(['cinzas','cravo-vivo','cravo-morto','rosa-viva','rosa-morta','rosa-vinho-viva','rosa-vinho-morta','sol','fosforo'])
def flower_image(m):
    name = next(names)
    p = f'flores/assets/{name}.{m[1]}'
    image(p, base64.b64decode(m[2]))
    return './assets/' + name + '.' + m[1]
flores = re.sub(r'data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)', flower_image, flores)
script = re.search(r'<script>(.*?)</script>', flores, re.S)
assert script
write('flores/flores.js', script[1])
write('flores/index.html', flores.replace(script[0], '<script src="./flores.js" defer></script>'))
write('flores/style.css', extract_styles('flores', './style.css'))

css = extract_styles('pecas', './layout.css')
ui_names = iter(['sidebar-border','underline-original','underline-selected','button-frame'])
def svg(m):
    name = next(ui_names)
    image(f'pecas/assets/ui/{name}.svg', urllib.parse.unquote(m[2].split(',',1)[1]).encode())
    return 'url("./assets/ui/' + name + '.svg")'
css = re.sub(r'url\(([\'"])(data:image/svg\+xml,.*?)\1\)', svg, css)
write('pecas/layout.css', css)
prayer = read('cartas/oracao.js')
def prayer_image(m):
    image('cartas/assets/oracao-original.jpg', base64.b64decode(m[1]))
    return './assets/oracao-original.jpg'
write('cartas/oracao.js', re.sub(r'data:image/jpeg;base64,([A-Za-z0-9+/=]+)', prayer_image, prayer))

html = read('rolo/index.html')
embedded = re.search(r'<script[^>]*id="fabric-assets"[^>]*>(.*?)</script>', html, re.S)
assert embedded
urls = {}
for old, (mime, encoded) in json.loads(embedded[1]).items():
    ext = 'svg' if mime == 'image/svg+xml' else mime.split('/')[1]
    p = Path('rolo') / Path(old.lstrip('/')).with_suffix('.' + ext)
    image(str(p), base64.b64decode(encoded))
    urls[old] = './' + str(p.relative_to('rolo'))
bundle = re.search(r'<script type="module">(.*?)</script>', html, re.S)[1]
data = re.search(r',yc=(\[.*?\]);function dh', bundle, re.S)[1]
data = re.sub(r'([,{])([A-Za-z]\w*):', r'\1"\2":', data)
items = json.loads(data)
for item in items: item['file'] = urls['/' + item['file']]
write('rolo/embroideries.json', json.dumps(items, ensure_ascii=False, indent=2) + '\n')
continuation = re.search(r'const ch=`(.*?)`,sh=', bundle, re.S)[1]
for old, url in urls.items(): continuation = continuation.replace(old, url)
nav = re.search(r'<nav class="site-navigation".*?</nav>', html, re.S)[0]
styles = re.findall(r'<style[^>]*>(.*?)</style>', html, re.S)
css = '\n\n'.join(styles[:3] + [read('rolo/scroll-journey.css')] + styles[3:])
css = css.replace('scrollbar-width: none;', 'scrollbar-color: transparent transparent;') if False else css
# Preserve the original cascade, including responsive overrides.
css = re.sub(r'(\.journey\.final-blackout-active\s*\{[^}]*?)scrollbar-width:\s*none;', r'\1scrollbar-color: transparent transparent;', css)
css = re.sub(r'(\.journey\.final-blackout-active::-webkit-scrollbar\s*\{[^}]*?)display:\s*none;', r'\1background: transparent;', css)
css += '\n.is-unlocked .experience, .is-unlocked .cloth, .is-unlocked .selvedge { background-image: url("./assets/linen-texture.png"); }\n'
write('rolo/style.css', css)
write('rolo/index.html', '''<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Rolo de bordados</title><link rel="stylesheet" href="../assets/typography.css"><link rel="stylesheet" href="../assets/navigation.css"><link rel="stylesheet" href="./style.css"><script src="../assets/navigation.js" defer></script><script src="./app.js" defer></script></head><body class="page-rolo">''' + nav + '''
<div id="root"><main class="journey branch-closed"><div class="horizontal-sequence"><div class="experience is-locked"><section class="horizontal-track" tabindex="-1" aria-label="Rolo de tecido com oito bordados. Role para o lado ou use as setas para explorar." aria-describedby="journey-hint"><div class="stage"><div class="cloth" aria-hidden="true"><div class="selvedge selvedge-top"></div><div class="selvedge selvedge-bottom"></div><div class="embroideries"></div></div><button class="roll" type="button" aria-label="Abrir o rolo de tecido"><img class="roll-image" src="./assets/fabric-roll-cylinder-intact.svg" alt="" draggable="false" fetchpriority="high"></button></div></section><p id="journey-hint" class="journey-hint" aria-live="polite">Clique no rolo para começar</p></div></div></main></div>
<template id="vertical-scenes"><section id="vertical-installation" class="vertical-installation">''' + continuation + '''</section></template><noscript>Ative o JavaScript para explorar o rolo.</noscript></body></html>''')
write('rolo/app.ts', read('.refactor/app.ts'))
journey = read('rolo/scroll-journey.ts').replace('React can commit the continuation', 'The continuation can be mounted')
write('rolo/scroll-journey.ts', journey)

# Split the existing backend without changing its SQL, validation or limits.
s = read('worker/worker.ts')
types = s[s.index('interface Env'):s.index('const columns')].replace('interface ', 'export interface ')
write('worker/types.ts', types)
response = s[s.index('const json ='):s.index('async function hash')].replace('const json =', 'export const json =')
write('worker/response.ts', response)
common = s[s.index('const columns'):s.index('function allowedOrigin')]
common = common[:common.index('const json =')] + common[common.index('async function hash'):]
markers = ["  if (path === '/api/artworks' && request.method === 'GET') {", "  if (path === '/api/artworks' && request.method === 'POST') {", '  const match = path.match', "    if (request.method === 'GET') {", "    if (request.method === 'DELETE') {", "\n  throw new RequestError('Endereço não encontrado.'"]
positions = [s.index(m) for m in markers]
def body(start,end,indent):
    block=s[start:end]
    return block.split('{\n',1)[1].rsplit('\n'+indent+'}',1)[0]
handlers = "import type { Env, ArtworkRow, PrivateRow } from './types';\nimport { json } from './response';\nimport { ID_PATTERN, TOKEN_PATTERN, RequestError, readBody, validatePublication } from './validation';\n" + common
for name,args,a,b,indent in [('listArtworks','url: URL, env: Env',0,1,'  '),('publishArtwork','request: Request, env: Env',1,2,'  '),('getArtwork','id: string, env: Env',3,4,'    '),('withdrawArtwork','request: Request, id: string, env: Env',4,5,'    ')]:
    handlers += f'\nexport async function {name}({args}): Promise<Response> {{\n' + body(positions[a],positions[b],indent) + '\n}\n'
write('worker/artworks.ts', handlers)
allowed = s[s.index('function allowedOrigin'):s.index('async function api')]
api = '''async function api(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url), path = url.pathname;
  if (path === '/api/health' && request.method === 'GET') {
    await env.DB.prepare('SELECT id FROM artworks LIMIT 1').first();
    return json({ ready: true });
  }
  if (path === '/api/artworks' && request.method === 'GET') return listArtworks(url, env);
  if (path === '/api/artworks' && request.method === 'POST') return publishArtwork(request, env);
  const match = path.match(/^\\/api\\/artworks\\/([^/]+)$/);
  if (match && ID_PATTERN.test(match[1])) {
    if (request.method === 'GET') return getArtwork(match[1], env);
    if (request.method === 'DELETE') return withdrawArtwork(request, match[1], env);
  }
  throw new RequestError('Endereço não encontrado.', 404);
}
'''
write('worker/worker.ts', "import type { Env } from './types';\nimport { json } from './response';\nimport { ID_PATTERN, RequestError } from './validation';\nimport { listArtworks, publishArtwork, getArtwork, withdrawArtwork } from './artworks';\n" + allowed + api + s[s.index('export default'):])

write('pecas/src/jpg.ts', '''export async function downloadJpg(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('JPG indisponível')), 'image/jpeg', 0.95));
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
''')
editor = read('pecas/editor.js')
editor = "import { downloadJpg } from './src/jpg';\n" + editor
start=editor.index('for(const [id,src] of Object.entries(window.ARTWORK_BACKGROUNDS))')
end=editor.index('const clamp=',start)
editor=editor[:start]+'''function ensureBackground(id) {
  if (backgroundImages.has(id)) return;
  const src = window.ARTWORK_BACKGROUNDS[id];
  if (!src) return;
  const image = new Image(); image.decoding = 'async'; image.onload = draw;
  backgroundImages.set(id, image); image.src = src;
}
ensureBackground(background);
backgroundSelect.addEventListener('change', () => { background = backgroundSelect.value; ensureBackground(background); draw(); });
'''+editor[end:]
editor=editor.replace('function draw(){','function paint(){')
editor=editor.replace('function resize(){', '''let pendingDraw = false;
function draw() {
  if (pendingDraw) return;
  pendingDraw = true;
  requestAnimationFrame(() => { pendingDraw = false; paint(); });
}
function resize(){''')
start=editor.index('const blob=await new Promise(')
end=editor.index("status.textContent='JPG",start)
editor=editor[:start]+"await downloadJpg(out,'minha-obra.jpg');"+editor[end:]
write('pecas/editor.js',editor)
gallery=read('pecas/src/gallery.ts')
start=gallery.index('    const blob =')
end=gallery.index("feedback.textContent = 'JPG preparado",start)
write('pecas/src/gallery.ts',"import { downloadJpg } from './jpg';\n"+gallery[:start]+"    await downloadJpg(output, 'peca-livre.jpg');\n    "+gallery[end:])
write('pecas/src/catalog.ts', "import type { CatalogAsset } from './artwork.types';\nexport const assetsById = new Map<string, CatalogAsset>(window.ARTWORK_ASSETS.map(asset => [asset.id, asset]));\n")
render=read('pecas/src/render.ts')
render=render.replace('window.ARTWORK_ASSETS.find(item => item.id === piece.id)', 'assetsById.get(piece.id)').replace('window.ARTWORK_ASSETS.find(item => item.id === id)', 'assetsById.get(id)')
write('pecas/src/render.ts',"import { assetsById } from './catalog';\n"+render)

build=read('scripts/build.mjs').replace("import { createHash } from 'node:crypto';", "import { versionAssets } from './version-assets.mjs';")
build=build.replace("\n        && !['rolo', 'flores'].some(name => file === path.join(root, name, 'index.html'))", '')
start=build.index('// The original Rolo page')
end=build.index('async function checkSizes',start)
build=build[:start]+'''await build({ entryPoints: [path.join(root, 'pecas/editor.js')], outfile: path.join(dist, 'pecas/editor.js'), bundle: true, format: 'iife', target: 'es2022' });
await versionAssets(dist);
'''+build[end:]
write('scripts/build.mjs',build)
write('scripts/build-interactions.mjs',read('scripts/build-interactions.mjs').replace("{ name: 'rolo/scroll-journey', globalName: 'RoloJourney' }", "{ name: 'rolo/app' }"))
write('scripts/version-assets.mjs',read('.refactor/version-assets.mjs'))
write('scripts/verify-deployment.mjs',read('scripts/verify-deployment.mjs').replace('rolo/scroll-journey.js','rolo/app.js').replace('rolo/scroll-journey.css','rolo/style.css'))
write('.gitignore', read('.gitignore') + '\n/rolo/app.js\n')

# Formatting applies only to current source; immutable catalog v1 is excluded.
write('.prettierrc.json', json.dumps({'singleQuote':True,'printWidth':100,'trailingComma':'all'},indent=2)+'\n')
write('.prettierignore','node_modules/\ndist/\ndist-worker/\npecas/generated/\n.wrangler/\n.github/\n.refactor/\npecas/assets/v1/\nAGENTS.md\nREADME.md\nPUBLICACAO.md\ndocs/DEPLOY.md\ndocs/VALIDACAO.md\n')
package=json.loads(read('package.json'))
package['scripts']['format']='prettier --write "**/*.{html,css,js,mjs,ts,json,jsonc,md}"'
package['scripts']['check:format']='prettier --check "**/*.{html,css,js,mjs,ts,json,jsonc,md}"'
package['scripts']['check']=package['scripts']['check'].replace('npm run typecheck', 'npm run check:format && npm run typecheck')
write('package.json',json.dumps(package,indent=2)+'\n')
write('docs/ARQUITETURA.md',read('.refactor/architecture.md'))
write('README.md',read('README.md').replace('Não há React nem etapa de lint configurada.', 'O Rolo usa módulos TypeScript sem React. O Prettier verifica a formatação; o esbuild prepara e reduz os arquivos publicados.\n\nA organização está descrita em [docs/ARQUITETURA.md](docs/ARQUITETURA.md).'))
print('PASS: fontes separadas; imagens extraídas sem reamostragem; rotas e SQL preservados.')
