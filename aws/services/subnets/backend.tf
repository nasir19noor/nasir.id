terraform {
  backend "s3" {
    key = "subnets/terraform.tfstate"
  }
}