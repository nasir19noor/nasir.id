module "cloudfront_nasir" {
  source = "git::https://github.com/nasir19noor/terraform.git//aws/modules/cloudfront"

  providers = {
    aws = aws.us-east-1
  }

  distribution_name = local.domain_name_nasir
  domain_name       = local.domain_name_nasir
  comment           = "CloudFront distribution for ${local.domain_name_nasir}"

  # OAC — keeps www.nasir.id bucket private; only this distribution can access it
  create_origin_access_control = true
  origin_access_control = {
    "nasir-www" = {
      description      = "OAC for www.nasir.id"
      origin_type      = "s3"
      signing_behavior = "always"
      signing_protocol = "sigv4"
    }
  }

  origins = [
    {
      domain_name           = "www.nasir.id.s3.ap-southeast-1.amazonaws.com"
      origin_id             = "S3-www-nasir"
      origin_type           = "s3"
      origin_access_control = "nasir-www"
    }
  ]

  default_cache_behavior = {
    target_origin_id       = "S3-www-nasir"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]

    forward_query_string = false
    forward_cookies      = "none"

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  geo_restriction = {
    restriction_type = "none"
    locations        = []
  }
}
