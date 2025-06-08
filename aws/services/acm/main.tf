module "s3_wordpress" {
  provider = aws.acm_provider
  source   = "git::https://github.com/nasir19noor/terraform.git//aws/modules/acm"
  bucket   = local.domain_name_assets
}
