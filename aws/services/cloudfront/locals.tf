locals {
  config                  = yamldecode(file("../../../config.yaml"))
  region                  = local.config.aws.global.region
  domain_name_itung       = "assets.itung.nasir.id"
}    

