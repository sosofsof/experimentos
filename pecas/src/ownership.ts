// Only the hash of this capability is stored by the API. Never include it in
// public links, analytics, error messages or server query parameters.
const prefix = 'pecas-owner:';
export function rememberOwner(id: string, token: string): boolean {
  try { localStorage.setItem(prefix + id, token); return true; }
  catch { return false; }
}
export function ownerToken(id: string): string | null {
  try { return localStorage.getItem(prefix + id); }
  catch { return null; }
}
export function forgetOwner(id: string): void {
  try { localStorage.removeItem(prefix + id); } catch { /* Storage may be unavailable. */ }
}
export function createToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2, '0')).join('');
}
export async function copyText(value: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(value); return true; }
  catch { return false; }
}
export function downloadPrivateLink(url: string): void {
  const blob = new Blob(['Guarde este link em particular. Ele permite retirar sua peça da galeria.\n\n' + url + '\n'], { type: 'text/plain;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = objectUrl; link.download = 'acesso-privado-da-peca.txt';
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
