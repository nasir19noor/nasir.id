locals {
  config                  = yamldecode(file("../../../config.yaml"))
  region                  = local.config.aws.global.region
  domain_name_assets      = local.config.aws.acm.domain_name_assets
}    

