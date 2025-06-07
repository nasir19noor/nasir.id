output "s3_wordpress_id" {
  value = module.s3_wordpress.s3_bucket_id
}
output "s3_wordpress_arn" {
  value = module.s3_wordpress.s3_bucket_arn
}

output "s3_backup_id" {
  value = module.s3_backup.s3_bucket_id
}
output "s3_backup_arn" {
  value = module.s3_backup.s3_bucket_arn
}

output "s3_upload_id" {
  value = module.s3_upload.s3_bucket_id
}
output "s3_upload_arn" {
  value = module.s3_upload.s3_bucket_arn
}

# output "s3_upload_website_endpoint" {
#   value = module.s3_upload.website_endpoint
# }