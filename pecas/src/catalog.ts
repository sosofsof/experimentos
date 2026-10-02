import type { CatalogAsset } from './artwork.types';
export const assetsById = new Map<string, CatalogAsset>(
  window.ARTWORK_ASSETS.map((asset) => [asset.id, asset]),
);
