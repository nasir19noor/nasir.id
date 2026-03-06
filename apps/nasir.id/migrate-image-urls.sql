-- Migration script to convert S3 URLs to assets domain URLs
-- Run this script to update existing image URLs in the database

-- First, let's see what URLs we currently have
SELECT 'Current URLs in articles.image_url' as info, image_url 
FROM articles 
WHERE image_url IS NOT NULL 
AND image_url LIKE '%amazonaws.com%'
LIMIT 5;

SELECT 'Current URLs in settings' as info, key, value 
FROM settings 
WHERE key IN ('about_image', 'hero_image', 'profile_image')
AND value LIKE '%amazonaws.com%';

-- Update image_url column in articles table
UPDATE articles 
SET image_url = CASE
    WHEN image_url LIKE 'https://s3.ap-southeast-1.amazonaws.com/www.nasir.id/%' THEN
        REPLACE(image_url, 'https://s3.ap-southeast-1.amazonaws.com/www.nasir.id/', 'https://assets.nasir.id/')
    WHEN image_url LIKE 'https://www.nasir.id.s3.ap-southeast-1.amazonaws.com/%' THEN
        REPLACE(image_url, 'https://www.nasir.id.s3.ap-southeast-1.amazonaws.com/', 'https://assets.nasir.id/')
    WHEN image_url LIKE 'https://www.nasir.id.s3.amazonaws.com/%' THEN
        REPLACE(image_url, 'https://www.nasir.id.s3.amazonaws.com/', 'https://assets.nasir.id/')
    ELSE image_url
END
WHERE image_url IS NOT NULL 
AND image_url LIKE '%amazonaws.com%';

-- Update settings table for all image-related settings
UPDATE settings 
SET value = CASE
    WHEN value LIKE 'https://s3.ap-southeast-1.amazonaws.com/www.nasir.id/%' THEN
        REPLACE(value, 'https://s3.ap-southeast-1.amazonaws.com/www.nasir.id/', 'https://assets.nasir.id/')
    WHEN value LIKE 'https://www.nasir.id.s3.ap-southeast-1.amazonaws.com/%' THEN
        REPLACE(value, 'https://www.nasir.id.s3.ap-southeast-1.amazonaws.com/', 'https://assets.nasir.id/')
    WHEN value LIKE 'https://www.nasir.id.s3.amazonaws.com/%' THEN
        REPLACE(value, 'https://www.nasir.id.s3.amazonaws.com/', 'https://assets.nasir.id/')
    ELSE value
END,
updated_at = NOW()
WHERE key IN ('about_image', 'hero_image', 'profile_image')
AND value IS NOT NULL 
AND value LIKE '%amazonaws.com%';

-- Update images array in articles table (PostgreSQL specific)
-- This handles JSON arrays of image URLs
UPDATE articles 
SET images = (
    SELECT json_agg(
        CASE
            WHEN image_url_item::text LIKE '"https://s3.ap-southeast-1.amazonaws.com/www.nasir.id/%"' THEN
                to_json(REPLACE(image_url_item::text, '"https://s3.ap-southeast-1.amazonaws.com/www.nasir.id/', '"https://assets.nasir.id/'))::text
            WHEN image_url_item::text LIKE '"https://www.nasir.id.s3.ap-southeast-1.amazonaws.com/%"' THEN
                to_json(REPLACE(image_url_item::text, '"https://www.nasir.id.s3.ap-southeast-1.amazonaws.com/', '"https://assets.nasir.id/'))::text
            WHEN image_url_item::text LIKE '"https://www.nasir.id.s3.amazonaws.com/%"' THEN
                to_json(REPLACE(image_url_item::text, '"https://www.nasir.id.s3.amazonaws.com/', '"https://assets.nasir.id/'))::text
            ELSE image_url_item::text
        END::json
    )
    FROM json_array_elements(images::json) AS image_url_item
)
WHERE images IS NOT NULL 
AND images::text LIKE '%amazonaws.com%';

-- Verify the changes
SELECT 'AFTER MIGRATION - Articles with assets URLs' as result_type, COUNT(*) as count 
FROM articles 
WHERE image_url LIKE 'https://assets.nasir.id/%'

UNION ALL

SELECT 'AFTER MIGRATION - Settings with assets URLs' as result_type, COUNT(*) as count 
FROM settings 
WHERE key IN ('about_image', 'hero_image', 'profile_image')
AND value LIKE 'https://assets.nasir.id/%'

UNION ALL

SELECT 'REMAINING S3 URLs in articles' as result_type, COUNT(*) as count 
FROM articles 
WHERE image_url LIKE '%amazonaws.com%'

UNION ALL

SELECT 'REMAINING S3 URLs in settings' as result_type, COUNT(*) as count 
FROM settings 
WHERE key IN ('about_image', 'hero_image', 'profile_image')
AND value LIKE '%amazonaws.com%';

-- Show sample converted URLs
SELECT 'Sample converted URLs' as info, image_url 
FROM articles 
WHERE image_url LIKE 'https://assets.nasir.id/%'
LIMIT 3;

SELECT 'Sample converted settings' as info, key, value 
FROM settings 
WHERE key IN ('about_image', 'hero_image', 'profile_image')
AND value LIKE 'https://assets.nasir.id/%';