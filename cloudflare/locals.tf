locals {
  config                  = yamldecode(file("../config.yaml"))
  region                  = local.config.aws.global.region
  bucket                  = local.config.aws.global.state_bucket
  zone_id                 = local.config.cloudflare.zone_id
  root                    = local.config.cloudflare.root
  contabo_ip              = local.config.contabo.ip
}    