module "acm_assets" {
  source = "git::https://github.com/nasir19noor/terraform.git//aws/modules/acm"

  domain_name = local.domain_name_assets
  subject_alternative_names = [
    "${local.domain_name_assets}"
  ]

  create_route53_records = local.create_route53_records
  validation_method      = local.validation_method
  wait_for_validation    = false
}