locals {
  config                  = yamldecode(file("../../../config.yaml"))
  region                  = local.config.aws.global.region
  domain_name_assets      = local.config.aws.acm.domain_name_assets
  domain_name             = local.config.aws.acm.domain_name_assets
  create_route53_records  = local.config.aws.acm.create_route53_records
  validation_method       = local.config.aws.acm.validation_method
}    

