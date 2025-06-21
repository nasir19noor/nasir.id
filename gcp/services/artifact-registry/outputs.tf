output "application_repository_name" {
  description = "The name of the application's Artifact Registry repository."
  value       = module.artifact_registry.repository_name
}

# This output block retrieves the 'repository_full_id' output from the module.
output "application_repository_full_id" {
  description = "The full identifier of the application's Artifact Registry repository."
  value       = module.artifact_registry.repository_full_id
}
