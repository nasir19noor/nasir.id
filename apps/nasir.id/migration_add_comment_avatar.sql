-- Adds a chosen-avatar option to comments on an existing database.
-- Run this on your existing database to enable the avatar picker.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'comments' AND column_name = 'avatar') THEN
        ALTER TABLE comments
            ADD COLUMN avatar VARCHAR(10) DEFAULT '😀';
        RAISE NOTICE '✅ Added avatar column to comments table';
    ELSE
        RAISE NOTICE 'ℹ️  avatar column already exists on comments table';
    END IF;
END $$;
