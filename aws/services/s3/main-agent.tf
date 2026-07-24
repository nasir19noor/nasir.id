module "s3_agent" {
  source = "git::https://github.com/nasir19noor/terraform.git//aws/modules/s3"
  bucket = local.bucket_name_agent
}