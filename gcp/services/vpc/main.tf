module "vpc" {
  source = "git::https://github.com/nasir19noor/terraform.git//gcp/modules/vpc"
  network_name              = local.name
  auto_create_subnetworks   = false
  project_id                = local.project_id
  description               = local.description
}