data "terraform_remote_state" "api_gateway" {
  backend = "s3"
  config = {
    bucket = "terraform.nasir.id"
    key    = "api-gateway/terraform.tfstate"
    region = "ap-southeast-1"
  }
}

data "terraform_remote_state" "dynamodb" {
  backend = "s3"
  config = {
    bucket = "terraform.nasir.id"
    key    = "dynamodb/terraform.tfstate"
    region = "ap-southeast-1"
  }
}

data "aws_iam_policy_document" "lambda_dynamodb" {
  statement {
    actions   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:UpdateItem"]
    resources = [data.terraform_remote_state.dynamodb.outputs.table_arn]
  }
}