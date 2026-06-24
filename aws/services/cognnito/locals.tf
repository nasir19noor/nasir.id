locals {
  config                  = yamldecode(file("../../../config.yaml"))
  region                  = local.config.aws.global.region
  cognito_name_mbg        = local.config.aws.cognito.cognito_name_mbg
}    

