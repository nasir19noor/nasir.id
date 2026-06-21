locals {
  tags = {
    Project     = "url-shortener"
    Environment = "prd"
    ManagedBy   = "terraform"
  }
}

module "shortener_table" {
  source = "git::https://github.com/nasir19noor/terraform.git//aws/modules/dynamodb?ref=main"

  table_name = local.name-shortener
  hash_key   = "shortCode"
  tags       = local.tags
}


