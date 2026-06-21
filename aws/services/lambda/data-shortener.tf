data "terraform_remote_state" "api_gateway" {
  backend = "s3"
  config = {
    bucket = "terraform.nasir.id"
    key    = "api-gateway/terraform.tfstate"
    region = "ap-southeast-1"
  }
}