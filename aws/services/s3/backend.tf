terraform {
  backend "s3" {
    key = "s3/terraform.tfstate"
  }
}