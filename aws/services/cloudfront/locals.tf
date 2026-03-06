locals {
  config                  = yamldecode(file("../../../config.yaml"))
  region                  = local.config.aws.global.region
  domain_name_itung       = "assets.itung.nasir.id"
  domain_name_nasir       = local.config.aws.cloudfront.domain_name_nasir
}    

