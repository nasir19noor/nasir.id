module "s3_transform" {
  source = "git::https://github.com/nasir19noor/terraform.git//aws/modules/s3"
  bucket = local.bucket_name_transform

  providers = {
    aws = aws.us-east-1
  }  
}

data "aws_caller_identity" "current" {
  provider = aws.us-east-1
}

resource "aws_s3_bucket_policy" "transform" {
  provider = aws.us-east-1
  bucket   = local.bucket_name_transform

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowAWSTransformAccess"
        Effect    = "Allow"
        Principal = { Service = "transform.amazonaws.com" }
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = [
          "arn:aws:s3:::${local.bucket_name_transform}",
          "arn:aws:s3:::${local.bucket_name_transform}/*"
        ]
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })

  depends_on = [module.s3_transform]
}