terraform {
  backend "s3" {
    key = "dynamodb/terraform.tfstate"
  }
}