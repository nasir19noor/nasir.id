locals {
  config                  = yamldecode(file("../../../config.yaml"))
  region                  = local.config.aws.global.region
  bucket_name_wordpress   = local.config.aws.s3.bucket_name_wordpress

}    

