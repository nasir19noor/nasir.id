module "acm_assets" {
  provider    = aws.acm_provider
  source      = "git::https://github.com/nasir19noor/terraform.git//aws/modules/acm"
  domain_name = local.domain_name_assets

  tags = {
    Name = local.domain_name_assets
  }

}

