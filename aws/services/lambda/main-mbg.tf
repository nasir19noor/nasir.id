# lambda-get-profile.tf

locals {
  users_table_name = "mbg-users"
  get_profile_name = "mbg-get-profile"
}

# --- Package the inline Python source into a zip at plan time ---
data "archive_file" "get_profile" {
  type        = "zip"
  source_file = "${path.module}/src/mbg/handler.py"
  output_path = "${path.module}/get_profile.zip"
}

# --- Assume-role trust for Lambda ---
# data "aws_iam_policy_document" "lambda_assume" {
#   statement {
#     actions = ["sts:AssumeRole"]
#     principals {
#       type        = "Service"
#       identifiers = ["lambda.amazonaws.com"]
#     }
#   }
# }

resource "aws_iam_role" "get_profile" {
  name               = "${local.get_profile_name}-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume.json
}

# CloudWatch Logs (managed policy)
resource "aws_iam_role_policy_attachment" "get_profile_logs" {
  role       = aws_iam_role.get_profile.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Least-privilege: GetItem on the Users table only.
# ARN is constructed so this file doesn't depend on the table resource yet.
# data "aws_caller_identity" "current" {}

locals {
  users_table_arn = "arn:aws:dynamodb:${local.region}:${data.aws_caller_identity.current.account_id}:table/${local.users_table_name}"
}

data "aws_iam_policy_document" "get_profile_ddb" {
  statement {
    sid       = "ReadUsers"
    effect    = "Allow"
    actions   = ["dynamodb:GetItem"]
    resources = [local.users_table_arn]
  }
}

resource "aws_iam_role_policy" "get_profile_ddb" {
  name   = "${local.get_profile_name}-ddb"
  role   = aws_iam_role.get_profile.id
  policy = data.aws_iam_policy_document.get_profile_ddb.json
}

# --- The function ---
resource "aws_lambda_function" "get_profile" {
  function_name = local.get_profile_name
  role          = aws_iam_role.get_profile.arn
  runtime       = "python3.13"
  handler       = "handler.handler"
  architectures = ["arm64"]
  timeout       = 10
  memory_size   = 128

  filename         = data.archive_file.get_profile.output_path
  source_code_hash = data.archive_file.get_profile.output_base64sha256

  environment {
    variables = {
      USERS_TABLE = local.users_table_name
    }
  }
}

# Explicit log group so retention is managed (not the default "never expire")
resource "aws_cloudwatch_log_group" "get_profile" {
  name              = "/aws/lambda/${local.get_profile_name}"
  retention_in_days = 14
}