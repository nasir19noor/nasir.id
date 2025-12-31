locals {
  config                  = yamldecode(file("../../../config.yaml"))
  region                  = local.config.aws.global.region
  bucket_name_upload      = local.config.aws.s3.bucket_name_upload
  domain_name_assets      = local.config.aws.cloudfront.domain_name_assets
}    

