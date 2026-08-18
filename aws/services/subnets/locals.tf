locals {
  config                  = yamldecode(file("../../../config.yaml"))
  cidr_block              = local.config.aws.network.cidr_block
  region                  = local.config.aws.global.region

  subnet_count              = local.config.aws.network.subnet_count
}    

