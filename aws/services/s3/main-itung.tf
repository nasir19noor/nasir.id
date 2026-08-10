module "s3_itung" {
  source = "git::https://github.com/nasir19noor/terraform.git//aws/modules/s3"
  bucket = "assets.itung.nasir.id"
  # Bucket remains private; CloudFront OAC has exclusive access via the policy below
}

resource "time_sleep" "wait_for_s3_itung" {
  depends_on      = [module.s3_itung]
  create_duration = "10s"
}

resource "aws_s3_bucket_policy" "nasir_itung_cloudfront_only" {
  bucket = module.s3_itung.s3_bucket_id
  depends_on = [time_sleep.wait_for_s3_itung]

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
          "${module.s3_itung.s3_bucket_arn}/uploads/*",
          "${module.s3_itung.s3_bucket_arn}/avatars/*",
          "${module.s3_itung.s3_bucket_arn}/questions/*",
		      "${module.s3_itung.s3_bucket_arn}/android/*"]
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = data.terraform_remote_state.cloudfront.outputs.cloudfront_itung_distribution_arn
          }
        }
      }
    ]
  })
}