output "function_name" {
  value = module.shortener_lambda.function_name
}
output "invoke_arn" {
  value = module.shortener_lambda.invoke_arn
}

output "mbg_function_name" {
  value = module.mbg_lambda.function_name
}
output "mbg_invoke_arn" {
  value = module.mbg_lambda.invoke_arn
}