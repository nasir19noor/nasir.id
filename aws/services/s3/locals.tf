locals {
  config                  = yamldecode(file("../../../config.yaml"))
  region                  = local.config.aws.global.region
  bucket_name_wordpress   = local.config.aws.s3.bucket_name_wordpress
  bucket_name_backup      = local.config.aws.s3.bucket_name_backup
  bucket_name_upload      = local.config.aws.s3.bucket_name_upload
  bucket_name_mbg         = local.config.aws.s3.bucket_name_mbg
  bucket_name_transform   = local.config.aws.s3.bucket_name_transform
  bucket_name_agent       = local.config.aws.s3.bucket_name_agent
  bucket_name_ck_nets     = local.config.aws.s3.bucket_name_ck_nets
  bucket_name_ucl         = local.config.aws.s3.bucket_name_ucl 
  bucket_name_layarsehat  = local.config.aws.s3.bucket_name_layarsehat
  bucket_name_sundog_rag   = local.config.aws.s3.bucket_name_sundog_rag
}    

