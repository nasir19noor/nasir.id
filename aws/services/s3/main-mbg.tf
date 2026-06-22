module "s3_mbg" {
  source = "git::https://github.com/nasir19noor/terraform.git//aws/modules/s3"
  bucket = local.bucket_name_mbg

  # Disable all public access blocking to allow public access
  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false

  # --- Enable Website and Public Access Features ---
  enable_website_hosting    = true
  enable_public_read_access = true
}