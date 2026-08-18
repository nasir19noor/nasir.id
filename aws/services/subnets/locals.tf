locals {
  config                  = yamldecode(file("../../../config.yaml"))
  region                  = local.config.aws.global.region
  subnet_count            = local.config.aws.network.subnet_count
}    

