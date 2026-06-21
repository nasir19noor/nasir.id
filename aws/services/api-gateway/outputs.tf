output "api_id" {
  value = module.shortener_api.api_id
}

output "api_execution_arn" {
  value = module.shortener_api.api_execution_arn
}

output "invoke_url" {
  value = aws_api_gateway_stage.this.invoke_url
}