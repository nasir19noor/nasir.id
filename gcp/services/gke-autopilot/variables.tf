# ############################################
# # variables.tf
# ############################################

# variable "project_id" {
#   description = "The GCP project ID"
#   type        = string
# }

# variable "region" {
#   description = "The region to deploy the GKE cluster"
#   type        = string
#   default     = "us-central1"
# }

# variable "cluster_name" {
#   description = "The name of the GKE cluster"
#   type        = string
# }

# variable "cluster_description" {
#   description = "Description of the GKE cluster"
#   type        = string
#   default     = "GKE Autopilot Cluster"
# }

# variable "network_name" {
#   description = "The VPC network name"
#   type        = string
# }

# variable "subnetwork_name" {
#   description = "The subnetwork name"
#   type        = string
# }

# variable "network_project_id" {
#   description = "The project ID of the shared VPC (leave empty if not using shared VPC)"
#   type        = string
#   default     = ""
# }

# variable "ip_range_pods" {
#   description = "The secondary IP range name for pods"
#   type        = string
# }

# variable "ip_range_services" {
#   description = "The secondary IP range name for services"
#   type        = string
# }

# variable "kubernetes_version" {
#   description = "The Kubernetes version"
#   type        = string
#   default     = "latest"
# }

# variable "release_channel" {
#   description = "The release channel (RAPID, REGULAR, STABLE)"
#   type        = string
#   default     = "REGULAR"
# }

# variable "deletion_protection" {
#   description = "Enable deletion protection"
#   type        = bool
#   default     = true
# }

# variable "cluster_labels" {
#   description = "Labels to apply to the cluster"
#   type        = map(string)
#   default = {
#     environment = "production"
#     managed_by  = "terraform"
#   }
# }

# variable "enable_private_nodes" {
#   description = "Enable private nodes"
#   type        = bool
#   default     = true
# }

# variable "enable_private_endpoint" {
#   description = "Enable private endpoint"
#   type        = bool
#   default     = false
# }

# variable "master_ipv4_cidr_block" {
#   description = "The IP range for the master network"
#   type        = string
#   default     = "172.16.0.0/28"
# }

# variable "master_global_access_enabled" {
#   description = "Enable global access to the master"
#   type        = bool
#   default     = false
# }

# variable "deploy_using_private_endpoint" {
#   description = "Deploy using private endpoint"
#   type        = bool
#   default     = false
# }

# variable "master_authorized_networks" {
#   description = "List of master authorized networks"
#   type = list(object({
#     cidr_block   = string
#     display_name = string
#   }))
#   default = [
#     {
#       cidr_block   = "10.0.0.0/8"
#       display_name = "Internal Network"
#     }
#   ]
# }

# variable "http_load_balancing" {
#   description = "Enable HTTP load balancing"
#   type        = bool
#   default     = true
# }

# variable "horizontal_pod_autoscaling" {
#   description = "Enable horizontal pod autoscaling"
#   type        = bool
#   default     = true
# }

# variable "dns_cache_enabled" {
#   description = "Enable DNS cache"
#   type        = bool
#   default     = true
# }

# variable "enable_vertical_pod_autoscaling" {
#   description = "Enable vertical pod autoscaling"
#   type        = bool
#   default     = true
# }

# variable "logging_enabled_components" {
#   description = "List of logging components to enable"
#   type        = list(string)
#   default     = ["SYSTEM_COMPONENTS", "WORKLOADS"]
# }

# variable "monitoring_enabled_components" {
#   description = "List of monitoring components to enable"
#   type        = list(string)
#   default     = ["SYSTEM_COMPONENTS"]
# }

# variable "enable_managed_prometheus" {
#   description = "Enable managed Prometheus"
#   type        = bool
#   default     = true
# }

# variable "enable_shielded_nodes" {
#   description = "Enable shielded nodes"
#   type        = bool
#   default     = true
# }

# variable "enable_binary_authorization" {
#   description = "Enable binary authorization"
#   type        = string
#   default     = "PROJECT_SINGLETON_POLICY_ENFORCE"
# }

# variable "database_encryption" {
#   description = "Database encryption configuration"
#   type = list(object({
#     state    = string
#     key_name = string
#   }))
#   default = [{
#     state    = "DECRYPTED"
#     key_name = ""
#   }]
# }

# variable "identity_namespace" {
#   description = "Workload Identity namespace"
#   type        = string
#   default     = "enabled"
# }

# variable "maintenance_start_time" {
#   description = "Maintenance window start time"
#   type        = string
#   default     = "05:00"
# }

# variable "maintenance_end_time" {
#   description = "Maintenance window end time"
#   type        = string
#   default     = ""
# }

# variable "maintenance_recurrence" {
#   description = "Maintenance window recurrence"
#   type        = string
#   default     = ""
# }

# variable "maintenance_exclusions" {
#   description = "Maintenance exclusions"
#   type = list(object({
#     name       = string
#     start_time = string
#     end_time   = string
#   }))
#   default = []
# }

# variable "resource_usage_export_dataset_id" {
#   description = "BigQuery dataset ID for resource usage export"
#   type        = string
#   default     = ""
# }

# variable "enable_network_egress_export" {
#   description = "Enable network egress metering"
#   type        = bool
#   default     = false
# }

# variable "enable_resource_consumption_export" {
#   description = "Enable resource consumption metering"
#   type        = bool
#   default     = true
# }

# variable "authenticator_security_group" {
#   description = "Security group for RBAC"
#   type        = string
#   default     = null
# }