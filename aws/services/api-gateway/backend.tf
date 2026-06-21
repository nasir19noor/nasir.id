terraform {
  backend "s3" {
    key = "api-gateway/terraform.tfstate"
  }
}