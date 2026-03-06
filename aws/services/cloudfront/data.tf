data "terraform_remote_state" "acm" {
  backend = "s3"
  config = {
    bucket = "terraform.nasir.id"
    key    = "acm/terraform.tfstate"
    region = "ap-southeast-1"
  }
}
