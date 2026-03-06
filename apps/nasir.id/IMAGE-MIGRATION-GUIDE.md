# Image URL Migration Guide

This guide explains the changes made to serve images from `https://assets.nasir.id/` instead of direct S3 bucket URLs.

## What Changed

### 1. **Image Upload Process**
- All new image uploads now return URLs with `https://assets.nasir.id/` domain
- Images are still uploaded to S3 bucket but URLs are converted to assets domain
- Multiple image sizes are still generated (original, large, medium, thumbnail)

### 2. **Image URL Processing**
- Added utility functions in `lib/image-utils.ts` to handle URL conversion
- All API endpoints now process image URLs to use assets domain
- Components automatically convert old S3 URLs to new assets URLs

### 3. **Files Modified**
- `lib/s3.ts` - Updated to return assets domain URLs
- `lib/image-utils.ts` - New utility functions for URL conversion
- `app/api/*/route.ts` - All APIs now process image URLs
- `components/*.tsx` - Updated to use new image utilities
- `app/[slug]/page.tsx` - Updated for featured images

## Migration Steps

### 1. **Database Migration**
Run the migration script to update existing URLs:
```sql
-- Run the migrate-image-urls.sql script
psql -d nasir -f migrate-image-urls.sql
```

### 2. **CDN/Proxy Setup**
Configure your web server or CDN to serve `https://assets.nasir.id/` from your S3 bucket:

#### Nginx Example:
```nginx
server {
    listen 443 ssl;
    server_name assets.nasir.id;
    
    # SSL configuration
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;
    
    location / {
        proxy_pass https://s3.ap-southeast-1.amazonaws.com/www.nasir.id/;
        proxy_set_header Host s3.ap-southeast-1.amazonaws.com;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # Cache static assets
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### CloudFlare/CDN Example:
1. Create a CNAME record: `assets.nasir.id` → `www.nasir.id.s3.ap-southeast-1.amazonaws.com`
2. Enable SSL/TLS encryption
3. Configure caching rules for static assets

### 3. **S3 Bucket Configuration**
Ensure your S3 bucket allows public read access for the assets subdomain:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::www.nasir.id/*"
        }
    ]
}
```

## Benefits

### 1. **Better Branding**
- Images served from your own domain (`assets.nasir.id`)
- Consistent URL structure across all assets

### 2. **CDN Integration**
- Easy to add CDN caching and optimization
- Better performance with geographic distribution

### 3. **URL Control**
- Can change storage backend without breaking URLs
- Better SEO with consistent domain usage

### 4. **Security**
- Can add additional security headers
- Better control over access policies

## Backward Compatibility

The system maintains backward compatibility:
- Old S3 URLs are automatically converted to assets URLs
- No existing functionality is broken
- Migration can be done gradually

## Verification

After migration, verify that:
1. New uploads return `https://assets.nasir.id/` URLs
2. Existing images display correctly
3. All image sizes (thumbnail, medium, large) work
4. Admin dashboard shows correct image previews
5. Public pages display images properly

## Troubleshooting

### Images Not Loading
1. Check DNS configuration for `assets.nasir.id`
2. Verify SSL certificate is valid
3. Ensure S3 bucket permissions allow public access
4. Check CDN/proxy configuration

### Mixed Content Warnings
- Ensure `assets.nasir.id` uses HTTPS
- Update any hardcoded HTTP URLs to HTTPS

### Cache Issues
- Clear CDN cache after migration
- Add cache-busting parameters if needed
- Check browser cache and force refresh