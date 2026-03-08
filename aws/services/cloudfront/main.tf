module "cloudfront_nasir" {
  source = "git::https://github.com/nasir19noor/terraform.git//aws/modules/cloudfront"

  providers = {
    aws = aws.us-east-1
  }

  aliases = [local.domain_name_nasir]
  comment = "CloudFront distribution for ${local.domain_name_nasir}"

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

  # origin is a map; the key becomes the origin_id
  origin = {
    "S3-www-nasir" = {
      domain_name           = "www.nasir.id.s3.ap-southeast-1.amazonaws.com"
      origin_access_control = "nasir-www"
    }
  }

  default_cache_behavior = {
    target_origin_id       = "S3-www-nasir"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]

    use_forwarded_values = false
    cache_policy_id      = "658327ea-f89d-4fab-a63d-7e88639e58f6" # AWS managed: CachingOptimized
  }

  viewer_certificate = {
    acm_certificate_arn      = data.terraform_remote_state.acm.outputs.acm_nasir_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  geo_restriction = {
    restriction_type = "none"
    locations        = []
  }
}

module "cloudfront_itung" {
  source = "git::https://github.com/nasir19noor/terraform.git//aws/modules/cloudfront"

  providers = {
    aws = aws.us-east-1
  }

  aliases = [local.domain_name_itung]
  comment = "CloudFront distribution for ${local.domain_name_itung}"

  # OAC — keeps assets.nasir.id bucket private; only this distribution can access it
  create_origin_access_control = true
  origin_access_control = {
    "assets-itung" = {
      description      = "OAC for assets.itung.nasir.id"
      origin_type      = "s3"
      signing_behavior = "always"
      signing_protocol = "sigv4"
    }
  }

  # origin is a map; the key becomes the origin_id
  origin = {
    "S3-assets-itung" = {
      domain_name           = "assets.itung.nasir.id.s3.ap-southeast-1.amazonaws.com"
      origin_access_control = "assets-itung"
    }
  }

  default_cache_behavior = {
    target_origin_id       = "S3-assets-itung"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]

    use_forwarded_values = false
    cache_policy_id      = "658327ea-f89d-4fab-a63d-7e88639e58f6" # AWS managed: CachingOptimized
  }

  viewer_certificate = {
    acm_certificate_arn      = data.terraform_remote_state.acm.outputs.acm_nasir_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  geo_restriction = {
    restriction_type = "none"
    locations        = []
  }
}









