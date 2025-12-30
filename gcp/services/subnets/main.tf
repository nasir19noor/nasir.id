module "vpc_subnets" {
  source        = "git::https://github.com/nasir19noor/terraform.git//gcp/modules/subnets"
  project_id    = local.project_id
  network_name  = local.network_name
  
  subnets = [
    {
      subnet_name           = local.subnet_name
      subnet_ip             = local.subnet_ip
      subnet_region         = local.region
      subnet_private_access = "true"
      subnet_flow_logs      = true
      description           = local.description
    }
  ]

  secondary_ranges = {
    (local.subnet_name) = [
      {
        range_name    = "sub-gke-pod"
        ip_cidr_range = "10.20.0.0/16"
      },
      {
        range_name    = "sub-gke-svc"
        ip_cidr_range = "10.21.8.0/22"
      }
    ]
  }
}

