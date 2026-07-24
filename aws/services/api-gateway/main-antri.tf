# =============================================================
# Antri — API Gateway (REST, Regional)
# Domain : antri.nasir.id
# Region : ap-southeast-1 | Account: 647459380434
# Pattern: follows mbg-api structure, module from nasir19noor/terraform
# =============================================================

module "antri_api" {
  source        = "git::https://github.com/nasir19noor/terraform.git//aws/modules/api-gateway"
  api_name      = "antri-api"
  endpoint_type = "REGIONAL"

  tags = {
    Project     = "antri"
    Environment = "prd"
    ManagedBy   = "terraform"
  }
}

data "aws_api_gateway_rest_api" "antri" {
  name       = module.antri_api.api_name
  depends_on = [module.antri_api]
}

locals {
  antri_rest_api_id      = module.antri_api.api_id
  antri_root_resource_id = data.aws_api_gateway_rest_api.antri.root_resource_id

  # Point these to remote state once the Lambda + Cognito stacks exist.
  # For now they are variables so this stack can be planned independently.
  antri_lambda_invoke_arn = var.antri_lambda_invoke_arn
  antri_app_origin        = "https://antri.nasir.id"
}

variable "antri_lambda_invoke_arn" {
  description = "Invoke ARN of the Antri booking Lambda (swap to remote state later)"
  type        = string
}

variable "antri_lambda_function_name" {
  description = "Function name of the Antri booking Lambda"
  type        = string
}

variable "antri_cognito_user_pool_arn" {
  description = "ARN of the Antri Cognito user pool (swap to remote state later)"
  type        = string
  # Example: arn:aws:cognito-idp:ap-southeast-1:647459380434:userpool/ap-southeast-1_xxxxxxx
}

# --- Cognito authorizer (REST API => COGNITO_USER_POOLS) ---
resource "aws_api_gateway_authorizer" "cognito" {
  name            = "cognito-antri"
  type            = "COGNITO_USER_POOLS"
  rest_api_id     = local.antri_rest_api_id
  identity_source = "method.request.header.Authorization"
  provider_arns   = [var.antri_cognito_user_pool_arn]
}

# =============================================================
# /bookings
# =============================================================
resource "aws_api_gateway_resource" "bookings" {
  rest_api_id = local.antri_rest_api_id
  parent_id   = local.antri_root_resource_id
  path_part   = "bookings"
}

# --- POST /bookings (create booking, protected) ---
resource "aws_api_gateway_method" "bookings_post" {
  rest_api_id   = local.antri_rest_api_id
  resource_id   = aws_api_gateway_resource.bookings.id
  http_method   = "POST"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "bookings_post" {
  rest_api_id             = local.antri_rest_api_id
  resource_id             = aws_api_gateway_resource.bookings.id
  http_method             = aws_api_gateway_method.bookings_post.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = local.antri_lambda_invoke_arn
}

# --- GET /bookings (list my bookings, protected) ---
resource "aws_api_gateway_method" "bookings_get" {
  rest_api_id   = local.antri_rest_api_id
  resource_id   = aws_api_gateway_resource.bookings.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id
}

resource "aws_api_gateway_integration" "bookings_get" {
  rest_api_id             = local.antri_rest_api_id
  resource_id             = aws_api_gateway_resource.bookings.id
  http_method             = aws_api_gateway_method.bookings_get.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST" # Lambda proxy is always POST
  uri                     = local.antri_lambda_invoke_arn
}

# --- OPTIONS /bookings (CORS preflight, MOCK) ---
resource "aws_api_gateway_method" "bookings_options" {
  rest_api_id   = local.antri_rest_api_id
  resource_id   = aws_api_gateway_resource.bookings.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "bookings_options" {
  rest_api_id       = local.antri_rest_api_id
  resource_id       = aws_api_gateway_resource.bookings.id
  http_method       = aws_api_gateway_method.bookings_options.http_method
  type              = "MOCK"
  request_templates = { "application/json" = "{\"statusCode\": 200}" }
}

resource "aws_api_gateway_method_response" "bookings_options" {
  rest_api_id = local.antri_rest_api_id
  resource_id = aws_api_gateway_resource.bookings.id
  http_method = aws_api_gateway_method.bookings_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "bookings_options" {
  rest_api_id = local.antri_rest_api_id
  resource_id = aws_api_gateway_resource.bookings.id
  http_method = aws_api_gateway_method.bookings_options.http_method
  status_code = aws_api_gateway_method_response.bookings_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'authorization,content-type'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,POST,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${local.antri_app_origin}'"
  }
  depends_on = [aws_api_gateway_integration.bookings_options]
}

# =============================================================
# /queue/{locationId}  (check queue position, protected)
# =============================================================
resource "aws_api_gateway_resource" "queue" {
  rest_api_id = local.antri_rest_api_id
  parent_id   = local.antri_root_resource_id
  path_part   = "queue"
}

resource "aws_api_gateway_resource" "queue_location" {
  rest_api_id = local.antri_rest_api_id
  parent_id   = aws_api_gateway_resource.queue.id
  path_part   = "{locationId}"
}

resource "aws_api_gateway_method" "queue_get" {
  rest_api_id   = local.antri_rest_api_id
  resource_id   = aws_api_gateway_resource.queue_location.id
  http_method   = "GET"
  authorization = "COGNITO_USER_POOLS"
  authorizer_id = aws_api_gateway_authorizer.cognito.id

  request_parameters = {
    "method.request.path.locationId" = true
  }
}

resource "aws_api_gateway_integration" "queue_get" {
  rest_api_id             = local.antri_rest_api_id
  resource_id             = aws_api_gateway_resource.queue_location.id
  http_method             = aws_api_gateway_method.queue_get.http_method
  type                    = "AWS_PROXY"
  integration_http_method = "POST"
  uri                     = local.antri_lambda_invoke_arn
}

# --- OPTIONS /queue/{locationId} (CORS preflight, MOCK) ---
resource "aws_api_gateway_method" "queue_options" {
  rest_api_id   = local.antri_rest_api_id
  resource_id   = aws_api_gateway_resource.queue_location.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "queue_options" {
  rest_api_id       = local.antri_rest_api_id
  resource_id       = aws_api_gateway_resource.queue_location.id
  http_method       = aws_api_gateway_method.queue_options.http_method
  type              = "MOCK"
  request_templates = { "application/json" = "{\"statusCode\": 200}" }
}

resource "aws_api_gateway_method_response" "queue_options" {
  rest_api_id = local.antri_rest_api_id
  resource_id = aws_api_gateway_resource.queue_location.id
  http_method = aws_api_gateway_method.queue_options.http_method
  status_code = "200"
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "queue_options" {
  rest_api_id = local.antri_rest_api_id
  resource_id = aws_api_gateway_resource.queue_location.id
  http_method = aws_api_gateway_method.queue_options.http_method
  status_code = aws_api_gateway_method_response.queue_options.status_code
  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'authorization,content-type'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'${local.antri_app_origin}'"
  }
  depends_on = [aws_api_gateway_integration.queue_options]
}

# =============================================================
# Lambda permission
# =============================================================
resource "aws_lambda_permission" "antri" {
  statement_id  = "AllowAPIGatewayInvokeAntri"
  action        = "lambda:InvokeFunction"
  function_name = var.antri_lambda_function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${data.aws_api_gateway_rest_api.antri.execution_arn}/*/*"
}

# =============================================================
# Custom domain: antri.nasir.id
# New ACM cert (the mbg cert only covers mbg.nasir.id)
# =============================================================
resource "aws_acm_certificate" "antri" {
  domain_name       = "antri.nasir.id"
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Project   = "antri"
    ManagedBy = "terraform"
  }
}

# Add this CNAME in Cloudflare (DNS only / gray cloud), then validation completes.
output "acm_validation_records" {
  description = "Add these to Cloudflare to validate the certificate"
  value = [
    for dvo in aws_acm_certificate.antri.domain_validation_options : {
      name  = dvo.resource_record_name
      type  = dvo.resource_record_type
      value = dvo.resource_record_value
    }
  ]
}

resource "aws_acm_certificate_validation" "antri" {
  certificate_arn = aws_acm_certificate.antri.arn
  # No validation_record_fqdns needed when records are created manually in
  # Cloudflare — ACM polls DNS. This resource just waits until ISSUED.
}

resource "aws_api_gateway_domain_name" "antri" {
  domain_name              = "antri.nasir.id"
  regional_certificate_arn = aws_acm_certificate_validation.antri.certificate_arn
  security_policy          = "TLS_1_2"

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

resource "aws_api_gateway_base_path_mapping" "antri" {
  api_id      = module.antri_api.api_id
  stage_name  = aws_api_gateway_stage.prd.stage_name
  domain_name = aws_api_gateway_domain_name.antri.domain_name
}

# Point antri.nasir.id at this in Cloudflare (CNAME, DNS only / gray cloud)
output "antri_regional_domain_name" {
  description = "CNAME target for antri.nasir.id in Cloudflare"
  value       = aws_api_gateway_domain_name.antri.regional_domain_name
}

# =============================================================
# Deployment + stage
# =============================================================
resource "aws_api_gateway_deployment" "antri" {
  rest_api_id = local.antri_rest_api_id

  # Redeploy whenever the API surface changes
  triggers = {
    redeploy = sha1(jsonencode([
      aws_api_gateway_resource.bookings.id,
      aws_api_gateway_method.bookings_post.id,
      aws_api_gateway_integration.bookings_post.id,
      aws_api_gateway_method.bookings_get.id,
      aws_api_gateway_integration.bookings_get.id,
      aws_api_gateway_method.bookings_options.id,
      aws_api_gateway_integration.bookings_options.id,
      aws_api_gateway_integration_response.bookings_options.id,
      aws_api_gateway_resource.queue_location.id,
      aws_api_gateway_method.queue_get.id,
      aws_api_gateway_integration.queue_get.id,
      aws_api_gateway_method.queue_options.id,
      aws_api_gateway_integration.queue_options.id,
      aws_api_gateway_integration_response.queue_options.id,
      aws_api_gateway_authorizer.cognito.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }

  depends_on = [
    aws_api_gateway_integration.bookings_post,
    aws_api_gateway_integration.bookings_get,
    aws_api_gateway_integration.bookings_options,
    aws_api_gateway_integration.queue_get,
    aws_api_gateway_integration.queue_options,
  ]
}

resource "aws_api_gateway_stage" "prd" {
  rest_api_id   = local.antri_rest_api_id
  deployment_id = aws_api_gateway_deployment.antri.id
  stage_name    = "prd"
}

output "antri_api_id" {
  value = module.antri_api.api_id
}

output "antri_invoke_url" {
  value = aws_api_gateway_stage.prd.invoke_url
}
