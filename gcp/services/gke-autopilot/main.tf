module "gke_autopilot" {
  source = "git::https://github.com/nasir19noor/terraform.git//gcp/modules/gke-autopilot"  

  # Required variables
  project_id = local.project_id
  name       = local.name
  region     = local.region
  network    = local.network_name
  subnetwork = local.subnet_name

  # IP ranges
  ip_range_pods     = local.ip_range_pods
  ip_range_services = local.ip_range_services

  # Cluster configuration
  description              = local.cluster_description
  kubernetes_version       = local.kubernetes_version
  release_channel          = local.release_channel
  deletion_protection      = local.deletion_protection
  cluster_resource_labels  = local.cluster_labels
  networking_mode          = "VPC_NATIVE"
  datapath_provider        = "ADVANCED_DATAPATH"

  # Private cluster settings
  enable_private_nodes            = local.enable_private_nodes
  enable_private_endpoint         = local.enable_private_endpoint
  master_ipv4_cidr_block          = local.master_ipv4_cidr_block
  master_global_access_enabled    = local.master_global_access_enabled
  deploy_using_private_endpoint   = local.deploy_using_private_endpoint

  # Master authorized networks
  master_authorized_networks_cidr_blocks = local.master_authorized_networks

  # Addons
  # http_load_balancing              = local.http_load_balancing
  # horizontal_pod_autoscaling       = local.horizontal_pod_autoscaling
  # dns_cache_config                 = local.dns_cache_config
  # enable_vertical_pod_autoscaling  = local.enable_vertical_pod_autoscaling

  # Monitoring and logging
  # logging_enabled_components   = local.logging_enabled_components
  # monitoring_enabled_components = local.monitoring_enabled_components
  # enable_managed_prometheus    = local.enable_managed_prometheus

  # Security
  # enable_shielded_nodes       = local.enable_shielded_nodes
  # enable_binary_authorization = local.enable_binary_authorization
  # database_encryption         = local.database_encryption

  # Workload Identity
  identity_namespace = local.identity_namespace

  # Maintenance window
  # maintenance_start_time  = local.maintenance_start_time
  # maintenance_end_time    = local.maintenance_end_time
  # maintenance_recurrence  = local.maintenance_recurrence
  # maintenance_exclusions  = local.maintenance_exclusions

  # Resource usage export
  # resource_usage_export_dataset_id     = local.resource_usage_export_dataset_id
  # enable_network_egress_export         = local.enable_network_egress_export
  # enable_resource_consumption_export   = local.enable_resource_consumption_export

  # Authentication
  authenticator_security_group = local.authenticator_security_group
  issue_client_certificate     = false

  # Network project (for Shared VPC)
  network_project_id = local.network_project_id
}