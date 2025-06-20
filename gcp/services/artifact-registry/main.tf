module "docker_repository" {
  source = "git::https://github.com/nasir19noor/terraform.git//gcp/modules/artifact-registry"
  
  project_id    = local.project_id
  location      = local.region
  repository_id = "nasir-docker-repo"
  description   = "Docker repository for containerized applications"
  format        = "DOCKER"
  
  labels = {
    managed-by  = "terraform"
    purpose     = "container-images"
  }
  
  docker_config = {
    immutable_tags = true
  }
}