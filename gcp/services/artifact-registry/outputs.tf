# Docker Repository Outputs
output "docker_repository_url" {
  description = "URL for the Docker repository"
  value       = module.docker_repository.registry_url
}

output "docker_repository_name" {
  description = "Full name of the Docker repository"
  value       = module.docker_repository.name
}

# Maven Repository Outputs
output "maven_repository_url" {
  description = "URL for the Maven repository"
  value       = module.maven_repository.registry_url
}

output "maven_repository_name" {
  description = "Full name of the Maven repository"
  value       = module.maven_repository.name
}

# NPM Repository Outputs
output "npm_repository_url" {
  description = "URL for the NPM repository"
  value       = module.npm_repository.registry_url
}

output "npm_repository_name" {
  description = "Full name of the NPM repository"
  value       = module.npm_repository.name
}

# Python Repository Outputs
output "python_repository_url" {
  description = "URL for the Python repository"
  value       = module.python_repository.registry_url
}

output "python_repository_name" {
  description = "Full name of the Python repository"
  value       = module.python_repository.name
}

# Development Docker Repository Outputs
output "dev_docker_repository_url" {
  description = "URL for the development Docker repository"
  value       = module.dev_docker_repository.registry_url
}

output "dev_docker_repository_name" {
  description = "Full name of the development Docker repository"
  value       = module.dev_docker_repository.name
}

# Summary output
output "all_repositories" {
  description = "Summary of all created repositories"
  value = {
    docker_prod = {
      name = module.docker_repository.name
      url  = module.docker_repository.registry_url
      format = module.docker_repository.format
    }
    maven_prod = {
      name = module.maven_repository.name
      url  = module.maven_repository.registry_url
      format = module.maven_repository.format
    }
    npm_prod = {
      name = module.npm_repository.name
      url  = module.npm_repository.registry_url
      format = module.npm_repository.format
    }
    python_prod = {
      name = module.python_repository.name
      url  = module.python_repository.registry_url
      format = module.python_repository.format
    }
    docker_dev = {
      name = module.dev_docker_repository.name
      url  = module.dev_docker_repository.registry_url
      format = module.dev_docker_repository.format
    }
  }
}