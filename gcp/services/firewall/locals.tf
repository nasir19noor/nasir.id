locals {
  config                 = yamldecode(file("../../config.yaml"))
  region                 = local.config.global.region
  network                = local.config.network.vpc_name  
  project_id             = local.config.global.project_id

  ssh_name             = local.config.firewall-ssh.name  
  ssh_description      = local.config.firewall-ssh.description 
  ssh_protocol         = local.config.firewall-ssh.protocol
  ssh_ports            = local.config.firewall-ssh.ports
  ssh_source_ranges     = local.config.firewall-ssh.source_ranges
  ssh_target_tags      = local.config.firewall-ssh.target_tags
}    