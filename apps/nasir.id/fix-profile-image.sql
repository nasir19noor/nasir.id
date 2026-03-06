-- Quick fix for profile image URL
-- This script specifically targets the about_image setting

-- Check current profile image URL
SELECT 'Current about_image URL:' as info, value 
FROM settings 
WHERE key = 'about_image';

-- Update the about_image URL if it's still pointing to S3
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
WHERE key = 'about_image'
AND value LIKE '%amazonaws.com%';

-- Verify the update
SELECT 'Updated about_image URL:' as info, value 
FROM settings 
WHERE key = 'about_image';

-- If you want to manually set it (replace with your actual image path):
-- UPDATE settings 
-- SET value = 'https://assets.nasir.id/uploads/2024/03/06/your-profile-image.jpg',
--     updated_at = NOW()
-- WHERE key = 'about_image';