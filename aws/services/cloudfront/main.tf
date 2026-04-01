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
  web_acl_id = "arn:aws:wafv2:us-east-1:647459380434:global/webacl/CreatedByCloudFront-5f0bc3d6/145321c3-fd37-479f-b520-595248a53f0f"
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
    acm_certificate_arn      = data.terraform_remote_state.acm.outputs.acm_itung_nasir_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  geo_restriction = {
    restriction_type = "none"
    locations        = []
  }
  web_acl_id = "arn:aws:wafv2:us-east-1:647459380434:global/webacl/CreatedByCloudFront-b0d05f91/2ff953c7-42db-4dee-af26-1d933ea236b0"
}

module "cloudfront_pulsara" {
  source = "git::https://github.com/nasir19noor/terraform.git//aws/modules/cloudfront"

  providers = {
    aws = aws.us-east-1
  }

  aliases = [local.domain_name_pulsara]
  comment = "CloudFront distribution for ${local.domain_name_pulsara}"

  # OAC — keeps assets.pulsara.nasir.id bucket private; only this distribution can access it
  create_origin_access_control = true
  origin_access_control = {
    "assets-pulsara" = {
      description      = "OAC for assets.pulsara.nasir.id"
      origin_type      = "s3"
      signing_behavior = "always"
      signing_protocol = "sigv4"
    }
  }

  # origin is a map; the key becomes the origin_id
  origin = {
    "S3-assets-pulsara" = {
      domain_name           = "assets.pulsara.nasir.id.s3.ap-southeast-1.amazonaws.com"
      origin_access_control = "assets-pulsara"
    }
  }

  default_cache_behavior = {
    target_origin_id       = "S3-assets-pulsara"
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]

    use_forwarded_values = false
    cache_policy_id      = "658327ea-f89d-4fab-a63d-7e88639e58f6" # AWS managed: CachingOptimized
  }

  viewer_certificate = {
    acm_certificate_arn      = data.terraform_remote_state.acm.outputs.acm_pulsara_nasir_certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  geo_restriction = {
    restriction_type = "none"
    locations        = []
  }
  # web_acl_id = "arn:aws:wafv2:us-east-1:647459380434:global/webacl/CreatedByCloudFront-d550082b/98f68743-26be-4953-a995-61403d4571e4"
}



