data "terraform_remote_state" "mbg_cognito" {
  backend = "s3"
  config = {
    bucket = "terraform.nasir.id"
    key    = "cognito/terraform.tfstate"
    region = "ap-southeast-1"
  }
}

