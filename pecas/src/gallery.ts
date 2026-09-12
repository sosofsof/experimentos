import type { Artwork } from './artwork.types';
import { artworkUrl, listArtworks, getArtwork, deleteArtwork } from './api';
import { drawArtwork } from './render';
import { element, errorMessage } from './dom';
import { rememberOwner, ownerToken, forgetOwner, copyText } from './ownership';

const status = element('gallery-status', HTMLParagraphElement);
const grid = element('gallery-grid', HTMLDivElement);
const more = element('load-more', HTMLButtonElement);
const retry = element('retry-gallery', HTMLButtonElement);
const detail = element('artwork-detail', HTMLElement);
const canvas = element('detail-canvas', HTMLCanvasElement);
const feedback = element('detail-feedback', HTMLParagraphElement);
const remove = element('remove-piece', HTMLButtonElement);
const deletion = element('delete-dialog', HTMLDialogElement);
const confirmDelete = element('confirm-delete', HTMLButtonElement);
const cancelDelete = element('cancel-delete', HTMLButtonElement);
const id = new URLSearchParams(location.search).get('peca');
let cursor: string | null = null;
let loading = false;
let current: Artwork | null = null;
let capability: string | null = id ? ownerToken(id) : null;
let deleting = false;

// Fragments never reach the server; remove the private capability from the
// address bar before any sharing action. The public URL always omits it.
if (id && location.hash.startsWith('#excluir=')) {
  const token = location.hash.slice('#excluir='.length);
  if (/^[0-9a-f]{64}$/.test(token)) { capability = token; rememberOwner(id, token); }
  history.replaceState(null, '', location.pathname + location.search);
}
function makeCard(artwork: Artwork): HTMLAnchorElement {
  const card = document.createElement('a');
  card.className = 'artwork-card'; card.href = artworkUrl(artwork.id);
  const preview = document.createElement('canvas');
  preview.width = 600; preview.height = 400;
  preview.setAttribute('role', 'img'); preview.setAttribute('aria-label', 'Peça publicada anonimamente');
  card.setAttribute('aria-label', 'Abrir peça publicada em ' + new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(artwork.createdAt));
  card.append(preview);
  // Load only artwork cards close to the viewport.
  observer.observe(card);
  recipes.set(card, artwork);
  return card;
}
const recipes = new WeakMap<Element, Artwork>();
const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    observer.unobserve(entry.target);
    const artwork = recipes.get(entry.target), preview = entry.target.querySelector('canvas');
    if (!artwork || !preview) continue;
    void drawArtwork(preview, artwork.recipe).catch(() => {
      const message = document.createElement('p'); message.className = 'image-error';
      message.textContent = 'Prévia indisponível. Abra a peça para tentar novamente.';
      entry.target.append(message);
    });
  }
}, { rootMargin: '200px' });
async function loadGallery(): Promise<void> {
  if (loading) return;
  loading = true; retry.hidden = true; more.disabled = true;
  status.textContent = 'Carregando as peças…';
  try {
    const page = await listArtworks(cursor);
    grid.append(...page.artworks.map(makeCard));
    cursor = page.nextCursor; more.hidden = !cursor;
    status.textContent = grid.children.length ? '' : 'A galeria está esperando a primeira peça. Que tal começar?';
  } catch (error) { status.textContent = errorMessage(error); retry.hidden = false; }
  finally { loading = false; more.disabled = false; }
}
async function loadDetail(): Promise<void> {
  if (!id || loading) return;
  loading = true; retry.hidden = true;
  element('gallery-intro', HTMLElement).hidden = true;
  status.textContent = 'Carregando a peça…';
  try {
    const { artwork } = await getArtwork(id);
    await drawArtwork(canvas, artwork.recipe);
    current = artwork;
    document.title = 'Peça publicada · Peças livres';
    element('detail-date', HTMLParagraphElement).textContent = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(artwork.createdAt);
    canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', 'Peça publicada anonimamente');
    detail.hidden = false; status.textContent = '';
    remove.hidden = !capability; element('owner-hint', HTMLParagraphElement).hidden = !capability;
  } catch (error) { detail.hidden = true; status.textContent = errorMessage(error); retry.hidden = false; }
  finally { loading = false; }
}
more.addEventListener('click', () => void loadGallery());
retry.addEventListener('click', () => void (id ? loadDetail() : loadGallery()));
element('share-piece', HTMLButtonElement).addEventListener('click', async () => {
  if (!current) return;
  const url = artworkUrl(current.id);
  if (await copyText(url)) feedback.textContent = 'Link público copiado.';
  else {
    element('share-fallback', HTMLLabelElement).hidden = false;
    const input = element('share-url', HTMLInputElement); input.value = url; input.focus(); input.select();
    feedback.textContent = 'Copie o link abaixo para compartilhar.';
  }
});
element('download-piece', HTMLButtonElement).addEventListener('click', async () => {
  if (!current) return;
  const button = element('download-piece', HTMLButtonElement);
  button.disabled = true; feedback.textContent = 'Preparando JPG…';
  try {
    const output = document.createElement('canvas'); output.width = 3000; output.height = 2000;
    await drawArtwork(output, current.recipe);
    const blob = await new Promise<Blob>((resolve, reject) => output.toBlob(value => value ? resolve(value) : reject(new Error('Não foi possível gerar o JPG.')), 'image/jpeg', .95));
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'peca-livre.jpg'; document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000); feedback.textContent = 'JPG preparado para download.';
  } catch (error) { feedback.textContent = errorMessage(error); }
  finally { button.disabled = false; }
});
remove.addEventListener('click', () => deletion.showModal());
cancelDelete.addEventListener('click', () => deletion.close());
deletion.addEventListener('cancel', event => { if (deleting) event.preventDefault(); });
confirmDelete.addEventListener('click', async () => {
  if (!current || !capability || deleting) return;
  deleting = true; confirmDelete.disabled = true; cancelDelete.disabled = true;
  const message = element('delete-feedback', HTMLParagraphElement); message.textContent = 'Retirando a peça…';
  try {
    await deleteArtwork(current.id, capability);
    forgetOwner(current.id); capability = null; current = null;
    deletion.close(); detail.hidden = true;
    status.textContent = 'Sua peça foi retirada da galeria.';
    const back = document.createElement('a'); back.href = './galeria.html'; back.className = 'outlined'; back.textContent = 'voltar à galeria';
    status.after(back); back.focus();
  } catch (error) { message.textContent = errorMessage(error); }
  finally { deleting = false; confirmDelete.disabled = false; cancelDelete.disabled = false; }
});
void (id ? loadDetail() : loadGallery());
