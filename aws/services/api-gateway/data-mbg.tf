data "terraform_remote_state" "mb-_cognito" {
  backend = "s3"
  config = {
    bucket = "terraform.nasir.id"
    key    = "cognito/terraform.tfstate"
    region = "ap-southeast-1"
  }
}

