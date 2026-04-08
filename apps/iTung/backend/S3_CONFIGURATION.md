# S3 Configuration for iTung Image Generation

## Overview
The image generation system now uploads mathematical diagrams to an S3 bucket with the following structure:

```
s3://assets.itung.nasir.id/
├── questions/
│   ├── {topic}/
│   │   ├── {year}/
│   │   │   ├── {month}/
│   │   │   │   ├── {day}/
│   │   │   │   │   ├── {uuid}.png
│   │   │   │   │   └── {uuid}.png
│   │   │   │   └── ...
│   │   │   └── ...
│   │   └── ...
│   └── ...
├── avatars/
│   └── {user_id}/
│       ├── original.{ext}
│       └── cartoon.png
└── ...
```

## Image URL Format
Generated question images are accessible from: `https://assets.itung.nasir.id/questions/{topic}/{year}/{month}/{day}/{uuid}.png`

## Required Environment Variables

### AWS Configuration
```bash
# AWS S3 Credentials
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=ap-southeast-1  # or your preferred region

# S3 Bucket Configuration
S3_BUCKET_NAME=assets.itung.nasir.id
S3_CDN_BASE=https://assets.itung.nasir.id

# Optional: For Avatar Generation
HF_TOKEN=your_huggingface_api_token
```

## S3 Bucket Setup

### 1. Create S3 Bucket
```bash
aws s3api create-bucket \
  --bucket assets.itung.nasir.id \
  --region ap-southeast-1 \
  --create-bucket-configuration LocationConstraint=ap-southeast-1
```

### 2. Configure Public Access (for images to be viewable)
```bash
# Block public access config
aws s3api put-public-access-block \
  --bucket assets.itung.nasir.id \
  --public-access-block-configuration \
  "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false"
```

### 3. Create Bucket Policy for Public Read
Create a file `bucket-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::assets.itung.nasir.id/*"
    }
  ]
}
```

Apply the policy:
```bash
aws s3api put-bucket-policy \
  --bucket assets.itung.nasir.id \
  --policy file://bucket-policy.json
```

### 4. Configure CORS (if frontend is from different domain)
Create `cors.json`:
```json
{
  "CORSRules": [
    {
      "AllowedOrigins": ["https://itung.nasir.id", "http://localhost:3000"],
      "AllowedMethods": ["GET", "HEAD"],
      "AllowedHeaders": ["*"],
      "MaxAgeSeconds": 3000
    }
  ]
}
```

Apply CORS:
```bash
aws s3api put-bucket-cors \
  --bucket assets.itung.nasir.id \
  --cors-configuration file://cors.json
```

### 5. Set Up CloudFront Distribution (Optional but recommended)
For better performance, create a CloudFront distribution pointing to:
- Origin: `assets.itung.nasir.id.s3.amazonaws.com` (or your S3 endpoint)
- Alternate Domain Names: `assets.itung.nasir.id`
- SSL Certificate: ACM certificate for the domain

Then set `S3_CDN_BASE=https://assets.itung.nasir.id` to use CloudFront.

## Docker Environment Setup

Add these environment variables to your `.env` file or Docker compose:

```yaml
# For Docker Compose
environment:
  - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
  - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
  - AWS_REGION=ap-southeast-1
  - S3_BUCKET_NAME=assets.itung.nasir.id
  - S3_CDN_BASE=https://assets.itung.nasir.id
  - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
  - HF_TOKEN=${HF_TOKEN}
```

## Testing Image Generation

1. **Create a test question with images enabled:**
```python
import requests

response = requests.post('http://localhost:9000/quiz/sessions/start', json={
    "topic": "luas bangun datar",
    "total_questions": 1,
    "use_ai": True,
    "include_images": True,  # Enable image generation
})
```

2. **Retrieve the question with image:**
```python
session_id = response.json()['session_id']
questions = requests.get(f'http://localhost:9000/quiz/sessions/{session_id}/questions').json()
print(questions[0].get('image_url'))  # Should be https://assets.itung.nasir.id/questions/{topic}/{year}/{month}/{day}/{uuid}.png
```

## Troubleshooting

### Images not generating
1. Check environment variables are set correctly
2. Verify AWS credentials have S3 permissions
3. Check CloudWatch logs for AWS S3 errors
4. Verify BUCKET and CDN_BASE are set

### Images not accessible
1. Verify public read access is enabled on S3
2. Confirm bucket policy allows public GetObject
3. Test direct access: `curl https://assets.itung.nasir.id/questions/{topic}/{year}/{month}/{day}/{uuid}.png`

### Path structure issues
- Topic names are used exactly as passed to `generate_adaptive_question()`
- Dates are always in YYYY/MM/DD format
- File names are UUIDs with .png extension

## Supported Image Types

The system supports the following diagram types:
- `number_line` - Number line diagrams
- `rectangle` - Rectangle shape diagrams
- `square` - Square shape diagrams
- `triangle` - Triangle shape diagrams
- `circle` - Circle diagrams with radius labels
- `angle` - Angle diagrams in degrees
- `fraction` - Fractional representation diagrams

Topics that support images are marked with the `VISUAL_TOPICS` constant in [constants.py](./constants.py).
