# locals {
#   config                    = yamldecode(file("../../config.yaml"))
#   region                    = local.config.global.region
#   project_id                = local.config.global.project_id
#   instance_name             = local.config.management.instance_name
#   network                   = local.config.network.vpc_name
#   zone                      = local.config.management.zone
#   instance                  = local.config.management.instance
#   subnetwork                = local.config.network.subnet_name
#   instance_type             = local.config.management.instance_type
#   disk_size_gb              = local.config.management.disk_size_gb
#   disk_type                 = local.config.management.disk_type 
#   image                     = local.config.management.image
#   create_internal_static_ip = local.config.management.create_internal_static_ip
#   create_external_static_ip = local.config.management.create_external_static_ip
#   allow_stopping_for_update = local.config.management.allow_stopping_for_update

#   service_account = {
#     email = "serviceAccount:${data.google_project.project.number}-compute@developer.gserviceaccount.com"
#     scopes = [
#       "https://www.googleapis.com/auth/cloud-platform"
#     ]
#   }
# }    