locals {
  config                   = yamldecode(file("../../config.yaml"))
  region                   = local.config.global.region
  project_id               = local.config.global.project_id
  bucket_state             = local.config.global.state_bucket
  name                     = local.config.gke.name
  network                  = local.config.network.vpc_name
  subnetwork               = local.config.network.subnet_name
  description              = local.config.gke.description
  network_project_id       = local.config.global.project_id
  kubernetes_version       = local.config.gke.kubernetes_version
  enable_l4_ilb_subsetting = local.config.gke.enable_l4_ilb_subsetting
  datapath_provider        = local.config.gke.datapath_provider
  networking_mode          = local.config.gke.networking_mode
  ip_range_pods            = local.config.gke.ip_range_pods
  ip_range_services        = local.config.gke.ip_range_services
  master_ipv4_cidr_block   = local.config.gke.master_ipv4_cidr_block
  regional                 = local.config.gke.regional
  zones                    = local.config.gke.zones
  deletion_protection      = local.config.gke.deletion_protection
  enable_private_nodes     = local.config.gke.enable_private_nodes
  enable_private_endpoint  = local.config.gke.enable_private_endpoint
  service_account          = local.config.gke.service_account
  remove_default_node_pool = local.config.gke.remove_default_node_pool
  node_pool_name           = local.config.gke.node_pool_name
  machine_type             = local.config.gke.machine_type
  image_type               = local.config.gke.image_type
  local_ssd_count          = local.config.gke.local_ssd_count
  disk_size_gb             = local.config.gke.disk_size_gb
  disk_type                = local.config.gke.disk_type
  preemptible              = local.config.gke.preemptible
  node_locations           = local.config.gke.node_locations
  autoscaling              = local.config.gke.autoscaling
  min_count                = local.config.gke.min_count
  max_count                = local.config.gke.max_count
  initial_node_count       = local.config.gke.initial_node_count
  max_pods_per_node        = local.config.gke.max_pods_per_node
  node_metadata            = local.config.gke.node_metadata
  auto_repair              = local.config.gke.auto_repair
  auto_upgrade             = local.config.gke.auto_upgrade
  master_authorized_networks_cidr_blocks = local.config.gke.master_authorized_networks_cidr_blocks
  


}    