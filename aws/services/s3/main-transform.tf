module "s3_transform" {
  source = "git::https://github.com/nasir19noor/terraform.git//aws/modules/s3"
  bucket = local.bucket_name_transform

  providers = {
    aws = aws.us-east-1
  }  
}