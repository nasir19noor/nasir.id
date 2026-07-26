-- Adds tags and an updated_at freshness timestamp to articles on an
-- existing database. Run this on production (via the VPS, same as the
-- comment-replies/avatar migrations) to enable the article tags feature.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'articles' AND column_name = 'tags') THEN
        ALTER TABLE articles ADD COLUMN tags TEXT[] DEFAULT '{}';
        RAISE NOTICE '✅ Added tags column to articles table';
    ELSE
        RAISE NOTICE 'ℹ️  tags column already exists on articles table';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'articles' AND column_name = 'updated_at') THEN
        ALTER TABLE articles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE '✅ Added updated_at column to articles table';
    ELSE
        RAISE NOTICE 'ℹ️  updated_at column already exists on articles table';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_articles_tags ON articles USING GIN(tags);
