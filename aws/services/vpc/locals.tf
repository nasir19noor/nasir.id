locals {
  config                  = yamldecode(file("../../config.yaml"))
  cidr_block              = local.aws.config.network.cidr_block
  region                  = local.aws.config.global.region
  name                    = local.aws.config.network.vpc_name
  description             = local.aws.config.network.description
  instance_tenancy        = local.aws.config.network.instance_tenancy
  enable_dns_hostnames    = local.aws.config.network.enable_dns_hostnames
  enable_dns_support      = local.aws.config.network.enable_dns_support
}    

