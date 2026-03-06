-- Migration script to convert S3 URLs to assets domain URLs
-- Run this script to update existing image URLs in the database

-- Update image_url column in articles table
UPDATE articles 
SET image_url = REPLACE(
    REPLACE(
        REPLACE(
            image_url,
            'https://s3.ap-southeast-1.amazonaws.com/www.nasir.id/',
            'https://assets.nasir.id/'
        ),
        'https://www.nasir.id.s3.ap-southeast-1.amazonaws.com/',
        'https://assets.nasir.id/'
    ),
    'https://www.nasir.id.s3.amazonaws.com/',
    'https://assets.nasir.id/'
)
WHERE image_url IS NOT NULL 
AND (
    image_url LIKE 'https://s3.%amazonaws.com/www.nasir.id/%' OR
    image_url LIKE 'https://www.nasir.id.s3.%amazonaws.com/%'
);

-- Update images array in articles table
-- Note: This is a more complex update for JSON arrays
-- You may need to run this manually for each record if there are many variations

-- For PostgreSQL with JSON array support:
UPDATE articles 
SET images = (
    SELECT json_agg(
        REPLACE(
            REPLACE(
                REPLACE(
                    image_url_item::text,
                    'https://s3.ap-southeast-1.amazonaws.com/www.nasir.id/',
                    'https://assets.nasir.id/'
                ),
                'https://www.nasir.id.s3.ap-southeast-1.amazonaws.com/',
                'https://assets.nasir.id/'
            ),
            'https://www.nasir.id.s3.amazonaws.com/',
            'https://assets.nasir.id/'
        )
    )
    FROM json_array_elements_text(images::json) AS image_url_item
)
WHERE images IS NOT NULL 
AND images::text LIKE '%amazonaws.com%';

-- Update settings table for profile images
UPDATE settings 
SET value = REPLACE(
    REPLACE(
        REPLACE(
            value,
            'https://s3.ap-southeast-1.amazonaws.com/www.nasir.id/',
            'https://assets.nasir.id/'
        ),
        'https://www.nasir.id.s3.ap-southeast-1.amazonaws.com/',
        'https://assets.nasir.id/'
    ),
    'https://www.nasir.id.s3.amazonaws.com/',
    'https://assets.nasir.id/'
)
WHERE key IN ('profile_image', 'hero_image')
AND value IS NOT NULL 
AND (
    value LIKE 'https://s3.%amazonaws.com/www.nasir.id/%' OR
    value LIKE 'https://www.nasir.id.s3.%amazonaws.com/%'
);

-- Verify the changes
SELECT 'Articles with image_url' as table_info, COUNT(*) as count 
FROM articles 
WHERE image_url LIKE 'https://assets.nasir.id/%'

UNION ALL

SELECT 'Articles with images array' as table_info, COUNT(*) as count 
FROM articles 
WHERE images::text LIKE '%https://assets.nasir.id/%'

UNION ALL

SELECT 'Settings with assets URLs' as table_info, COUNT(*) as count 
FROM settings 
WHERE key IN ('profile_image', 'hero_image')
AND value LIKE 'https://assets.nasir.id/%';