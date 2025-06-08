module "cloudfront_assets" {
  source = "git::https://github.com/nasir19noor/terraform.git//aws/modules/cloudfront"
  
  distribution_name = "assets.nasir.id"
  domain_name       = local.domain_name_assets
  comment           = "CloudFront distribution for ${local.domain_name_assets}"
  
  origins = [
    {
      domain_name = "upload.nasir.id.s3.ap-southeast-1.amazonaws.com"
      origin_id   = "S3-${local.bucket_name_upload}"
      origin_type = "s3"
    }
  ]
  
  default_cache_behavior = {
    target_origin_id       = "S3-${local.bucket_name_upload}"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    
    forward_query_string = false
    forward_cookies      = "none"
    
    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }
  
  custom_error_responses = [
    {
      error_code         = 403
      response_code      = 200
      response_page_path = "/index.html"
    },
    {
      error_code         = 404
      response_code      = 200
      response_page_path = "/index.html"
    }
  ]
  
  geo_restriction = {
    restriction_type = "none"
    locations        = []
  }

  providers = {
    aws = aws.us_east_1
  }
  
}
