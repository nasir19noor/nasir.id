module "shortener_lambda" {
  source = "git::https://github.com/nasir19noor/terraform.git//aws/modules/lambda?ref=main"

  function_name    = "shortener"
  handler          = "shortener.lambda_handler"
  runtime          = "python3.13"
  architecture     = "arm64"
  role_arn         = aws_iam_role.lambda.arn
  source_code_path = "src/shortener.py"

  environment_variables = {
    TABLE_NAME = data.terraform_remote_state.dynamodb.outputs.table_name
    BASE_URL   = "https://m6gw7phdn5.execute-api.ap-southeast-1.amazonaws.com/prd"
  }

  tags = local.tags
}

# Lets API Gateway invoke the function — the bridge between your two modules
resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = module.shortener_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${data.terraform_remote_state.api_gateway.outputs.api_execution_arn}/*/*"
}

resource "aws_iam_role_policy" "lambda_dynamodb" {
  name   = "shortener-dynamodb-access"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.lambda_dynamodb.json
}


