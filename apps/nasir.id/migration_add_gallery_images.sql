-- Adds a shared gallery_images table on an existing database, so any image
-- uploaded via /api/upload (Gallery, Articles editor, or Portfolio editor)
-- is automatically recorded and shows up in the Gallery admin page --
-- instead of the old behavior where Gallery only knew about images
-- uploaded through Gallery itself, tracked per-browser in localStorage.
-- Run this on production via the VPS, same as the other migrations.

CREATE TABLE IF NOT EXISTS gallery_images (
  id SERIAL PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  name VARCHAR(500),
  size BIGINT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gallery_images_uploaded_at ON gallery_images(uploaded_at);
