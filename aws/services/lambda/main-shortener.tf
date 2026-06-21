module "shortener_lambda" {
  source = "git::https://github.com/nasir19noor/terraform.git//aws/modules/lambda?ref=main"

  function_name    = "shortener"
  handler          = "shortener.lambda_handler"
  runtime          = "python3.13"
  architecture     = "arm64"
  role_arn         = aws_iam_role.lambda.arn
  source_code_path = "src/shortener.py"

  environment_variables = {
    TABLE_NAME = local.table_name
    BASE_URL   = "" # set once the stage URL or custom domain exists
  }

  tags = local.tags
}

# Lets API Gateway invoke the function — the bridge between your two modules
resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = module.shortener_lambda.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${module.shortener_api.execution_arn}/*/*"
}

