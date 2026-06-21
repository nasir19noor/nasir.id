module "shortener_api" {
  source = "git::https://github.com/nasir19noor/terraform.git//aws/modules/api-gateway"

  api_name      = local.name-shortener
  endpoint_type = "REGIONAL"

  tags = {
    Project     = "url-shortener"
    Environment = "prd"
    ManagedBy   = "terraform"
  }
}

data "aws_api_gateway_rest_api" "shortener" {
  name = module.shortener_api.api_name # ties the lookup to the module so it reads after creation
}

locals {
  rest_api_id       = module.shortener_api.api_id
  root_resource_id  = data.aws_api_gateway_rest_api.shortener.root_resource_id
  lambda_invoke_arn = data.terraform_remote_state.lambda.outputs.invoke_arn
}

resource "aws_api_gateway_resource" "code" {
  rest_api_id = local.rest_api_id
  parent_id   = local.root_resource_id
  path_part   = "{code}"
}

resource "aws_api_gateway_method" "create" {
  rest_api_id   = local.rest_api_id
  resource_id   = local.root_resource_id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "create" {
  rest_api_id             = local.rest_api_id
  resource_id             = local.root_resource_id
  http_method             = aws_api_gateway_method.create.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST" # always POST for Lambda proxy, regardless of the client method
  uri                     = local.lambda_invoke_arn
}

resource "aws_api_gateway_method" "redirect" {
  rest_api_id   = local.rest_api_id
  resource_id   = aws_api_gateway_resource.code.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "redirect" {
  rest_api_id             = local.rest_api_id
  resource_id             = aws_api_gateway_resource.code.id
  http_method             = aws_api_gateway_method.redirect.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = local.lambda_invoke_arn
}

# resource "aws_lambda_permission" "apigw" {
#   statement_id  = "AllowAPIGatewayInvoke"
#   action        = "lambda:InvokeFunction"
#   function_name = data.terraform_remote_state.lambda.outputs.function_name
#   principal     = "apigateway.amazonaws.com"
#   source_arn    = "${module.shortener_api.api_execution_arn}/*/*"
# }

resource "aws_api_gateway_deployment" "this" {
  rest_api_id = local.rest_api_id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.code.id,
      aws_api_gateway_method.create.id,
      aws_api_gateway_integration.create.id,
      aws_api_gateway_method.redirect.id,
      aws_api_gateway_integration.redirect.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_integration.create,
    aws_api_gateway_integration.redirect,
  ]
}

resource "aws_api_gateway_stage" "this" {
  rest_api_id   = local.rest_api_id
  deployment_id = aws_api_gateway_deployment.this.id
  stage_name    = "prd"
}