export interface Piece {
  id: string;
  x: number;
  y: number;
  relative: number;
  rotation: number;
}
export interface Stitch {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
export interface Recipe {
  version: 1;
  background: string;
  pieces: Piece[];
  stitches?: Stitch[];
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
