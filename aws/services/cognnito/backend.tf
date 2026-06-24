terraform {
  backend "s3" {
    key = "cognito/terraform.tfstate"
  }
}