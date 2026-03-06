locals {
  config                  = yamldecode(file("../../../config.yaml"))
  region                  = local.config.aws.global.region
  domain_name_nasir       = local.config.aws.acm.domain_name_nasir
  create_route53_records  = local.config.aws.acm.create_route53_records
  validation_method       = local.config.aws.acm.validation_method
}    

