module "gke" {
  source = "git::https://github.com/nasir19noor/terraform.git//gcp/modules/gke"

  name                     = local.name
  project_id               = local.project_id
  region                   = local.region
  description              = local.description
  network                  = local.network
  subnetwork               = local.subnetwork
  network_project_id       = local.network_project_id
  kubernetes_version       = local.kubernetes_version
  enable_l4_ilb_subsetting = local.enable_l4_ilb_subsetting
  datapath_provider        = local.datapath_provider
  networking_mode          = local.networking_mode
  ip_range_pods            = local.ip_range_pods
  ip_range_services        = local.ip_range_services
  master_ipv4_cidr_block   = local.master_ipv4_cidr_block
  regional                 = local.regional
  zones                    = local.zones
  deletion_protection      = local.deletion_protection
  enable_private_nodes     = local.enable_private_nodes
  enable_private_endpoint  = local.enable_private_endpoint
  service_account          = google_service_account.gke_sa.email
  remove_default_node_pool = local.remove_default_node_pool

  node_pools = [
    {
      name               = local.node_pool_name
      machine_type       = local.machine_type
      image_type         = local.image_type
      local_ssd_count    = local.local_ssd_count
      disk_size_gb       = local.disk_size_gb
      disk_type          = local.disk_type
      preemptible        = local.preemptible
      node_locations     = local.node_locations
      autoscaling        = local.autoscaling
      min_count          = local.min_count
      max_count          = local.max_count
      initial_node_count = local.initial_node_count
      max_pods_per_node  = local.max_pods_per_node
      node_metadata      = local.node_metadata
      auto_repair        = local.auto_repair  
      auto_upgrade       = local.auto_upgrade
    }
  ]

  master_authorized_networks_cidr_blocks = [
    {
      cidr_block   = local.master_authorized_networks_cidr_blocks
      display_name = "workload"
    }
  ]
  node_pools_tags = {
    all = ["gke"]
  }

  
    node_pools_metadata = {
      all = {node-pool-metadata-custom-value = local.name}
    }
}

resource "google_service_account" "gke_sa" {
  account_id   = "${local.name}-sa"
  display_name = "GKE Service Account for ${local.name}"
  project      = local.project_id
}

# Grant the service account the required roles
resource "google_project_iam_member" "gke_sa_roles" {
  for_each = toset([
    "roles/container.admin",
    "roles/container.clusterAdmin",
    "roles/compute.admin",
    "roles/storage.objectUser",
    "roles/container.nodeServiceAccount",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/monitoring.viewer",
    "roles/stackdriver.resourceMetadata.writer",
    "roles/storage.objectViewer",
    "roles/artifactregistry.reader"
  ])

  project = local.project_id
  role    = each.key
  member  = "serviceAccount:${google_service_account.gke_sa.email}"
}

