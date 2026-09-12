export function element<T extends HTMLElement>(id: string, type: { new(): T }): T {
  const found = document.getElementById(id);
  if (!(found instanceof type)) throw new Error(`Elemento ausente: ${id}`);
  return found;
}
export const errorMessage = (error: unknown): string => error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.';
