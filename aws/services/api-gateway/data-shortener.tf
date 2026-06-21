data "terraform_remote_state" "lambda" {
  backend = "s3"
  config = {
    bucket = "terraform.nasir.id"
    key    = "lambda/terraform.tfstate"
    region = "ap-southeast-1"
  }
}

