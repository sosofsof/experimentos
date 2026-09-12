CREATE TABLE artworks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  recipe TEXT NOT NULL,
  delete_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX artworks_public_order ON artworks(deleted_at, created_at DESC, id DESC);
CREATE TABLE publication_limits (
  bucket TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX publication_limits_expiry ON publication_limits(expires_at);
