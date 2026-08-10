module "s3_sundog_rag" {
  source = "git::https://github.com/nasir19noor/terraform.git//aws/modules/s3"
  bucket = local.bucket_name_sundog_rag
}