locals {
  config                  = yamldecode(file("../../../config.yaml"))
  region                  = local.config.aws.global.region
  domain_name_itung       = local.config.aws.cloudfront.domain_name_itung
  domain_name_nasir       = local.config.aws.cloudfront.domain_name_nasir
  domain_name_pulsara     = local.config.aws.cloudfront.domain_name_pulsara
}    

