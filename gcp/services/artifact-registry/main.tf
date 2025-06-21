module "artifact_registry" {
  source = "git::https://github.com/nasir19noor/terraform.git//gcp/modules/artifact-registry"
  project_id  = local.project_id
  name        = local.name
  region      = local.region
  description = "Repository for my application artifacts"
}