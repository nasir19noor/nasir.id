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

resource "aws_api_gateway_domain_name" "shortener" {
  domain_name              = "s.nasir.id"
  regional_certificate_arn = "arn:aws:acm:ap-southeast-1:647459380434:certificate/66d0a5e7-d310-4df5-8ce6-c07eb0039235"
  security_policy          = "TLS_1_2"
  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_base_path_mapping" "shortener" {
  api_id      = module.shortener_api.api_id
  stage_name  = aws_api_gateway_stage.this.stage_name
  domain_name = aws_api_gateway_domain_name.shortener.domain_name
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

resource "aws_api_gateway_deployment" "this" {
  rest_api_id = local.rest_api_id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.code.id,
      aws_api_gateway_method.create.id,
      aws_api_gateway_integration.create.id,
      aws_api_gateway_method.redirect.id,
      aws_api_gateway_integration.redirect.id,
      aws_api_gateway_method.options.id,
      aws_api_gateway_integration.options.id,
      aws_api_gateway_method.home.id,
      aws_api_gateway_integration.home.id      
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

resource "aws_api_gateway_method" "options" {
  rest_api_id   = local.rest_api_id
  resource_id   = local.root_resource_id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "options" {
  rest_api_id = local.rest_api_id
  resource_id = local.root_resource_id
  http_method = aws_api_gateway_method.options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "options" {
  rest_api_id = local.rest_api_id
  resource_id = local.root_resource_id
  http_method = aws_api_gateway_method.options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Headers" = true
  }
}

resource "aws_api_gateway_integration_response" "options" {
  rest_api_id = local.rest_api_id
  resource_id = local.root_resource_id
  http_method = aws_api_gateway_method.options.http_method
  status_code = aws_api_gateway_method_response.options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
    "method.response.header.Access-Control-Allow-Methods" = "'POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type'"
  }

  depends_on = [aws_api_gateway_integration.options]
}

resource "aws_api_gateway_method" "home" {
  rest_api_id   = local.rest_api_id
  resource_id   = local.root_resource_id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "home" {
  rest_api_id             = local.rest_api_id
  resource_id             = local.root_resource_id
  http_method             = aws_api_gateway_method.home.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = local.lambda_invoke_arn
}