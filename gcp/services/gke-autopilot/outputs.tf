############################################
# outputs.tf
############################################

output "cluster_id" {
  description = "The cluster ID"
  value       = module.gke_autopilot.cluster_id
}

output "cluster_name" {
  description = "The cluster name"
  value       = module.gke_autopilot.name
}

output "cluster_endpoint" {
  description = "The cluster endpoint"
  value       = module.gke_autopilot.endpoint
  sensitive   = true
}

output "cluster_ca_certificate" {
  description = "The cluster CA certificate"
  value       = module.gke_autopilot.ca_certificate
  sensitive   = true
}

output "cluster_location" {
  description = "The cluster location"
  value       = module.gke_autopilot.location
}

output "cluster_region" {
  description = "The cluster region"
  value       = module.gke_autopilot.region
}

output "cluster_type" {
  description = "The cluster type"
  value       = module.gke_autopilot.type
}

output "master_version" {
  description = "The master Kubernetes version"
  value       = module.gke_autopilot.master_version
}

output "identity_namespace" {
  description = "Workload Identity namespace"
  value       = module.gke_autopilot.identity_namespace
}

output "peering_name" {
  description = "The VPC peering name"
  value       = module.gke_autopilot.peering_name
}