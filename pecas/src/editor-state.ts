import type { CatalogAsset } from './artwork.types';
import type { PlacedPiece } from './editor-geometry';
export interface Point {
  x: number;
  y: number;
}
type Snapshot = Pick<PlacedPiece, 'x' | 'y' | 'relative' | 'rotation'>;
interface Owner {
  id: number;
  owner: HTMLElement;
}
type Drag =
  | (Owner & {
      type: 'new';
      asset: CatalogAsset;
      startX: number;
      startY: number;
      im: HTMLImageElement;
      s: { w: number; h: number };
      moved: boolean;
    })
  | (Owner & { type: 'move'; p: PlacedPiece; dx: number; dy: number; original: Snapshot })
  | (Owner & {
      type: 'resize' | 'rotate';
      p: PlacedPiece;
      original: Snapshot;
      centerX: number;
      centerY: number;
      startDistance: number;
      startAngle: number;
    });
interface Pinch {
  p: PlacedPiece;
  ids: number[];
  original: Snapshot;
  startAngle: number;
  startDistance: number;
  startRelative: number;
  startCenterX: number;
  startCenterY: number;
  startMidX: number;
  startMidY: number;
}
export interface EditorState {
  width: number;
  height: number;
  placed: PlacedPiece[];
  selected: PlacedPiece | null;
  drag: Drag | null;
  pinch: Pinch | null;
  touchPoints: Map<number, Point>;
  exporting: boolean;
}
export function createEditorState(): EditorState {
  return {
    width: 1,
    height: 1,
    placed: [],
    selected: null,
    drag: null,
    pinch: null,
    touchPoints: new Map(),
    exporting: false,
  };
}
