module "s3_wordpress" {
  source = "git::https://github.com/nasir19noor/terraform.git//aws/modules/s3"
  bucket = local.bucket_name_wordpress

  # Disable all public access blocking to allow public access
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

module "s3_backup" {
  source = "git::https://github.com/nasir19noor/terraform.git//aws/modules/s3"
  bucket = local.bucket_name_backup
}

module "s3_upload" {
  source = "git::https://github.com/nasir19noor/terraform.git//aws/modules/s3"
  bucket = local.bucket_name_upload

  # Disable all public access blocking to allow public access
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false

  # --- Enable Website and Public Access Features ---
  enable_website_hosting    = true
  enable_public_read_access = true
}

module "s3_website" {
  source = "git::https://github.com/nasir19noor/terraform.git//aws/modules/s3"
  bucket = "website.nasir.id"
}

module "s3_waha" {
  source = "git::https://github.com/nasir19noor/terraform.git//aws/modules/s3"
  bucket = "waha.nasir.id"
}






module "s3_pulsara" {
  source = "git::https://github.com/nasir19noor/terraform.git//aws/modules/s3"
  bucket = "assets.pulsara.nasir.id"
  # Bucket remains private; CloudFront OAC has exclusive access via the policy below
}

resource "time_sleep" "wait_for_s3_pulsara" {
  depends_on      = [module.s3_pulsara]
  create_duration = "10s"
}

# resource "aws_s3_bucket_policy" "nasir_pulsara_cloudfront_only" {
#   bucket = module.s3_pulsara.s3_bucket_id
#   depends_on = [time_sleep.wait_for_s3_pulsara]

#   policy = jsonencode({
#     Version = "2012-10-17"
#     Statement = [
#       {
#         Sid    = "AllowCloudFrontOACUploads"
#         Effect = "Allow"
#         Principal = {
#           Service = "cloudfront.amazonaws.com"
#         }
#         Action   = "s3:GetObject"
#         Resource = [
#           "${module.s3_pulsara.s3_bucket_arn}/uploads/*"
#                    ]
#         Condition = {
#           StringEquals = {
#             "AWS:SourceArn" = data.terraform_remote_state.cloudfront.outputs.cloudfront_pulsara_distribution_arn
#           }
#         }
#       }
#     ]
#   })
# }


module "s3_wc2026" {
  source = "git::https://github.com/nasir19noor/terraform.git//aws/modules/s3"
  bucket = "wc2026.nasir.id"
}





