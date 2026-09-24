import { publishArtwork, artworkUrl, ApiError } from './api';
import type { Publication } from './api';
import type { Recipe } from './artwork.types';
import { drawArtwork } from './render';
import { element, errorMessage } from './dom';
import { createToken, rememberOwner, copyText, downloadPrivateLink } from './ownership';

const dialog = element('publish-dialog', HTMLDialogElement);
const form = element('publish-form', HTMLFormElement);
const fields = element('publish-fields', HTMLFieldSetElement);
const preview = element('publish-preview', HTMLCanvasElement);
const feedback = element('publish-feedback', HTMLParagraphElement);
const submit = element('confirm-publish', HTMLButtonElement);
const success = element('publish-success', HTMLDivElement);
const publicLink = element('public-link', HTMLInputElement);
let snapshot: Recipe | null = null;
let pending: Publication | null = null;
let busy = false;
let privateLink = '';

function savePending(value: Publication | null): void {
  try {
    if (value) sessionStorage.setItem('pecas-pending', JSON.stringify(value));
    else sessionStorage.removeItem('pecas-pending');
  } catch { /* In-memory retries still reuse the same publication. */ }
}
function restorePending(): Publication | null {
  try {
    const raw = sessionStorage.getItem('pecas-pending');
    if (!raw) return null;
    const value = JSON.parse(raw) as Publication;
    if (value?.recipe?.version !== 1 || typeof value.deleteToken !== 'string' || typeof value.id !== 'string') return null;
    // Drop attribution from attempts saved by older versions of the editor.
    const publication: Publication = { id: value.id, deleteToken: value.deleteToken, recipe: value.recipe, publicConsent: true };
    savePending(publication);
    return publication;
  } catch { return null; }
}
function setBusy(value: boolean): void {
  busy = value; fields.disabled = value;
  dialog.setAttribute('aria-busy', String(value));
  element('publish-close', HTMLButtonElement).disabled = value;
  submit.textContent = value ? 'publicando…' : 'publicar na galeria';
}
async function showPublication(recipe: Recipe, recovering = false): Promise<void> {
  snapshot = recipe; form.hidden = false; success.hidden = true;
  element('share-feedback', HTMLParagraphElement).textContent = '';
  success.querySelector('details')?.removeAttribute('open');
  feedback.textContent = recovering ? 'Um envio anterior ficou sem confirmação. Confira a prévia e tente novamente; a mesma peça não será duplicada.' : '';
  element('public-consent', HTMLInputElement).checked = false;
  dialog.showModal(); setBusy(true);
  try { await drawArtwork(preview, recipe); }
  catch (error) { feedback.textContent = errorMessage(error); snapshot = null; }
  finally {
    setBusy(false);
    if (recipe.pieces.length > 200) {
      snapshot = null;
      feedback.textContent = 'A galeria aceita até 200 elementos por peça. Reduza a composição ou salve o JPG.';
    }
    submit.disabled = !snapshot;
  }
}
element('publish', HTMLButtonElement).addEventListener('click', () => {
  const previous = restorePending();
  if (previous) {
    pending = previous;
    void showPublication(previous.recipe, true); return;
  }
  pending = null;
  void showPublication(window.artworkEditor.snapshot());
});
element('publish-close', HTMLButtonElement).addEventListener('click', () => dialog.close());
dialog.addEventListener('cancel', event => { if (busy) event.preventDefault(); });
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || !snapshot || !form.reportValidity()) return;
  if (!pending) {
    pending = { id: crypto.randomUUID(), deleteToken: createToken(), recipe: snapshot, publicConsent: true };
    savePending(pending);
  }
  setBusy(true); feedback.textContent = '';
  try {
    const { artwork } = await publishArtwork(pending);
    publicLink.value = artworkUrl(artwork.id);
    privateLink = publicLink.value + '#excluir=' + pending.deleteToken;
    const remembered = rememberOwner(artwork.id, pending.deleteToken);
    element('ownership-note', HTMLParagraphElement).textContent = remembered
      ? 'Você pode retirar a peça neste navegador ou guardar o acesso para outro dispositivo.'
      : 'Guarde o acesso abaixo para poder retirar a peça depois.';
    element('view-published', HTMLAnchorElement).href = new URL('./galeria.html', location.href).href;
    if (!remembered) success.querySelector('details')?.setAttribute('open', '');
    form.hidden = true; success.hidden = false;
    element('success-heading', HTMLHeadingElement).focus();
    pending = null; savePending(null);
  } catch (error) {
    const rejected = error instanceof ApiError && [400, 409, 413, 415].includes(error.status);
    if (rejected) { pending = null; savePending(null); }
    feedback.textContent = errorMessage(error) + (rejected ? '' : ' Você pode repetir o envio com segurança.');
  } finally { setBusy(false); }
});
element('copy-public-link', HTMLButtonElement).addEventListener('click', async () => {
  const copied = await copyText(publicLink.value);
  element('share-feedback', HTMLParagraphElement).textContent = copied ? 'Link público copiado.' : 'Selecione o link acima e copie manualmente.';
  if (!copied) { publicLink.focus(); publicLink.select(); }
});
element('save-private-link', HTMLButtonElement).addEventListener('click', () => downloadPrivateLink(privateLink));
