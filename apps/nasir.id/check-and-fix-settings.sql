-- Check current settings and fix S3 URLs
-- Run this to see and fix the current state

-- 1. Check current settings
SELECT 
    'CURRENT SETTINGS' as status,
    key, 
    value,
    CASE 
        WHEN value LIKE '%amazonaws.com%' THEN '❌ S3 URL'
        WHEN value LIKE 'https://assets.nasir.id/%' THEN '✅ Assets URL'
        ELSE '❓ Other'
    END as url_type
FROM settings 
WHERE key IN ('about_image', 'hero_image', 'profile_image')
ORDER BY key;

-- 2. Fix any S3 URLs found
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
AND value LIKE '%amazonaws.com%';

-- 3. Check results after update
SELECT 
    'AFTER UPDATE' as status,
    key, 
    value,
    CASE 
        WHEN value LIKE '%amazonaws.com%' THEN '❌ Still S3 URL'
        WHEN value LIKE 'https://assets.nasir.id/%' THEN '✅ Assets URL'
        ELSE '❓ Other'
    END as url_type
FROM settings 
WHERE key IN ('about_image', 'hero_image', 'profile_image')
ORDER BY key;

-- 4. Show the exact URLs for verification
SELECT 
    'FINAL URLS' as info,
    key,
    value
FROM settings 
WHERE key IN ('about_image', 'hero_image', 'profile_image')
AND value IS NOT NULL
ORDER BY key;