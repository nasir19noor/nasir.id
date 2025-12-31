locals {
  config      = yamldecode(file("../../config.yaml"))
  region      = local.config.global.region
  project_id  = local.config.global.project_id
  name        = local.config.artifact-registry.name
}    