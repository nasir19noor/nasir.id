data "terraform_remote_state" "lambda" {
  backend = "s3"
  config = {
    bucket = "your-tfstate-bucket"
    key    = "lambda/terraform.tfstate"
    region = "ap-southeast-1"
  }
}

