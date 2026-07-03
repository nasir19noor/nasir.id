# locals {
#   tags = {
#     Project     = "mbg"
#     Environment = "prd"
#     ManagedBy   = "terraform"
#   }
# }

module "mbg_table" {
  source = "git::https://github.com/nasir19noor/terraform.git//aws/modules/dynamodb?ref=main"

  table_name = local.name-mbg
  hash_key   = "shortCode"
  # tags       = local.tags
}


