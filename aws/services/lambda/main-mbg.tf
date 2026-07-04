module "mbg_lambda" {
  source = "git::https://github.com/nasir19noor/terraform.git//aws/modules/lambda?ref=main"

  function_name    = "mbg"
  handler          = "handler.handler"
  runtime          = "python3.13"
  architecture     = "arm64"
  role_arn         = aws_iam_role.lambda.arn
  source_code_path = "src/mbg/handler.py"
  environment_variables = {
    USERS_TABLE = "mbg-users"
  }  
}






