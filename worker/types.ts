export interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  PUBLICATION_LIMIT: RateLimit;
}
export interface ArtworkRow {
  id: string;
  recipe: string;
  created_at: number;
}
export interface PrivateRow extends ArtworkRow {
  delete_hash: string;
  deleted_at: number | null;
}
