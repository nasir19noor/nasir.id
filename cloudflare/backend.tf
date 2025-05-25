terraform {
  backend "s3" {
    bucket = "terraform.nasir.id"
    region = "ap-southeast-1"
    key = "cloudflare/terraform.tfstate"
  }
}