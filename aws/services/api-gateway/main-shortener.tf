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