module "s3_mbg" {
  source = "git::https://github.com/nasir19noor/terraform.git//aws/modules/s3"
  bucket = local.bucket_name_mbg

  # Disable all public access blocking to allow public access
  block_public_acls       = true
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false

  # --- Enable Website and Public Access Features ---
  enable_website_hosting    = true
  enable_public_read_access = true
}


data "cloudflare_ip_ranges" "cloudflare" {}

data "aws_iam_policy_document" "mbg_cloudflare_only" {
  statement {
    sid    = "AllowCloudflareOnly"
    effect = "Allow"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions   = ["s3:GetObject"]
    resources = ["${module.s3_mbg.arn}/*"]

    condition {
      test     = "IpAddress"
      variable = "aws:SourceIp"
      values = concat(
        data.cloudflare_ip_ranges.cloudflare.ipv4_cidr_blocks,
        data.cloudflare_ip_ranges.cloudflare.ipv6_cidr_blocks,
      )
    }
  }
}

resource "aws_s3_bucket_policy" "mbg" {
  bucket = module.s3_mbg.id
  policy = data.aws_iam_policy_document.mbg_cloudflare_only.json
}