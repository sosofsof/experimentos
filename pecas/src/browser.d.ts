import type { CatalogAsset, EditorBridge } from './artwork.types';
declare global {
  interface Window {
    ARTWORK_ASSETS: CatalogAsset[];
    ARTWORK_BACKGROUNDS: Record<string, string>;
    artworkEditor: EditorBridge;
    ArtworkRendering: {
      renderRecipe: typeof import('./render').renderRecipe;
    };
  }
}
