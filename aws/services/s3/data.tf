data "terraform_remote_state" "cloudfront" {
  backend = "s3"
  config = {
    bucket = "terraform.nasir.id"
    key    = "cloudfront/terraform.tfstate"
    region = "ap-southeast-1"
  }
}
