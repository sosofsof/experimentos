export interface Piece {
  id: string;
  x: number;
  y: number;
  relative: number;
  rotation: number;
}
export interface Recipe {
  version: 1;
  background: string;
  pieces: Piece[];
}
export interface Artwork {
  id: string;
  recipe: Recipe;
  createdAt: number;
}
export interface CatalogAsset {
  id: string;
  width: number;
  height: number;
  src: string;
}
export interface EditorBridge {
  snapshot(): Recipe;
}
