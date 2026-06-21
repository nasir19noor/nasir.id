locals {
  config                  = yamldecode(file("../../../config.yaml"))
  region                  = local.config.aws.global.region
  name-shortener          = local.config.aws.api-gateway.name-shortener
}    

