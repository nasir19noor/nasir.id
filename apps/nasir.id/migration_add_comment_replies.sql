-- Adds nested/threaded comment support to an existing database.
-- Run this on your existing database to enable comment replies.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'comments' AND column_name = 'parent_id') THEN
        ALTER TABLE comments
            ADD COLUMN parent_id INTEGER REFERENCES comments(id) ON DELETE CASCADE;
        RAISE NOTICE '✅ Added parent_id column to comments table';
    ELSE
        RAISE NOTICE 'ℹ️  parent_id column already exists on comments table';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
