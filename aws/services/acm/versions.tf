terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.79"
    }
  }
}

provider "aws" {
  region = local.region
}

provider "aws" {
  alias  = "acm_provider"
  region = "us-east-1"
}