module "s3_nasir" {
  source = "git::https://github.com/nasir19noor/terraform.git//aws/modules/s3"
  bucket = "www.nasir.id"

  # # Keep public access blocks disabled to allow the bucket policy below
  # block_public_acls       = true
  # block_public_policy     = true
  # ignore_public_acls      = true
  # restrict_public_buckets = true

  # enable_website_hosting    = false
  # # Disable blanket public read; a prefix-scoped policy is applied below
  # enable_public_read_access = false
}

resource "time_sleep" "wait_for_s3" {
  depends_on      = [module.s3_nasir]
  create_duration = "10s"
}

resource "aws_s3_bucket_policy" "nasir_uploads_cloudfront_only" {
  bucket = module.s3_nasir.s3_bucket_id
  depends_on = [time_sleep.wait_for_s3]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOACUploads"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = [
          "${module.s3_nasir.s3_bucket_arn}/uploads/*",
          "${module.s3_nasir.s3_bucket_arn}/android/*"
        ]
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = data.terraform_remote_state.cloudfront.outputs.cloudfront_nasir_distribution_arn
          }
        }
      }
    ]
  })
}
