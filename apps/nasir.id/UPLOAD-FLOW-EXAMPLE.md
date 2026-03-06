# Upload Flow Example

## How Image Upload Works

### 1. **User Uploads Image**
```
User uploads: profile-photo.jpg (500KB)
```

### 2. **Server Processing**
```typescript
// lib/s3.ts processes the upload
const timestamp = Date.now(); // 1709712000000
const datePrefix = "2024/03/06";
const originalKey = `uploads/${datePrefix}/${timestamp}-profile-photo.jpg`;
// Result: uploads/2024/03/06/1709712000000-profile-photo.jpg
```

### 3. **S3 Upload (Physical Storage)**
```typescript
// Files are uploaded to S3 bucket
await s3Client.send(new PutObjectCommand({
  Bucket: "www.nasir.id",                                    // ← Your S3 bucket
  Key: "uploads/2024/03/06/1709712000000-profile-photo.jpg", // ← S3 path
  Body: file,
  ContentType: "image/jpeg",
}));

// Multiple sizes are created:
// - uploads/2024/03/06/1709712000000-profile-photo.jpg      (original)
// - uploads/2024/03/06/1709712000000-profile-photo-large.jpg (1920px)
// - uploads/2024/03/06/1709712000000-profile-photo-medium.jpg (1024px)  
// - uploads/2024/03/06/1709712000000-profile-photo-thumb.jpg (400px)
```

### 4. **API Response (Public URLs)**
```json
{
  "url": "https://assets.nasir.id/uploads/2024/03/06/1709712000000-profile-photo-medium.jpg",
  "sizes": {
    "original": "https://assets.nasir.id/uploads/2024/03/06/1709712000000-profile-photo.jpg",
    "large": "https://assets.nasir.id/uploads/2024/03/06/1709712000000-profile-photo-large.jpg",
    "medium": "https://assets.nasir.id/uploads/2024/03/06/1709712000000-profile-photo-medium.jpg",
    "thumbnail": "https://assets.nasir.id/uploads/2024/03/06/1709712000000-profile-photo-thumb.jpg"
  }
}
```

### 5. **User Access**
```
User requests: https://assets.nasir.id/uploads/2024/03/06/1709712000000-profile-photo-medium.jpg
                ↓
Your web server/CDN proxies to:
                ↓  
S3: https://s3.ap-southeast-1.amazonaws.com/www.nasir.id/uploads/2024/03/06/1709712000000-profile-photo-medium.jpg
```

## Web Server Configuration

### Nginx Example:
```nginx
server {
    listen 443 ssl;
    server_name assets.nasir.id;
    
    # SSL configuration
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/private.key;
    
    location / {
        # Proxy all requests to S3
        proxy_pass https://s3.ap-southeast-1.amazonaws.com/www.nasir.id/;
        proxy_set_header Host s3.ap-southeast-1.amazonaws.com;
        
        # Cache static assets for 1 year
        expires 1y;
        add_header Cache-Control "public, immutable";
        
        # Security headers
        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
    }
}
```

### CloudFlare Example:
1. **DNS Record**: `assets.nasir.id` CNAME → `www.nasir.id.s3.ap-southeast-1.amazonaws.com`
2. **SSL**: Full (strict) encryption
3. **Caching**: Cache everything for 1 year
4. **Page Rules**: Cache level "Cache Everything"

## Benefits of This Approach

### ✅ **Separation of Concerns**
- **Storage**: S3 handles file storage and durability
- **Delivery**: Your domain handles public access and caching

### ✅ **Performance**
- CDN can cache assets at edge locations
- Better performance than direct S3 access
- Custom cache headers and optimization

### ✅ **Branding**
- All assets served from your domain
- Consistent URL structure
- Better SEO with domain authority

### ✅ **Control**
- Can add authentication if needed
- Custom headers and security policies
- Analytics and monitoring

### ✅ **Flexibility**
- Can change storage backend without breaking URLs
- Easy to add image processing or optimization
- Can implement custom access controls

## Verification

To verify everything is working:

1. **Upload Test**: Upload an image in admin panel
2. **Check Response**: Should return `https://assets.nasir.id/...` URL
3. **Verify S3**: File should exist in S3 bucket
4. **Test Access**: URL should load the image (after web server setup)

## Current Status

✅ **Application Code**: Ready (returns assets.nasir.id URLs)
✅ **S3 Upload**: Working (files go to S3 bucket)
⏳ **Web Server**: Needs configuration to serve assets.nasir.id
⏳ **DNS**: Needs assets.nasir.id subdomain setup