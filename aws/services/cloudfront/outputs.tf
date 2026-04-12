output "cloudfront_itung_distribution_arn" {
  description = "ARN of the itung CloudFront distribution (used for OAC bucket policy on assets.itung.nasir.id)"
  value       = module.cloudfront_itung.cloudfront_distribution_arn
}

output "cloudfront_nasir_distribution_arn" {
  description = "ARN of the nasir CloudFront distribution (used for OAC bucket policy on www.nasir.id)"
  value       = module.cloudfront_nasir.cloudfront_distribution_arn
}

# output "cloudfront_pulsara_distribution_arn" {
#   description = "ARN of the pulsaraCloudFront distribution (used for OAC bucket policy on assets.itung.nasir.id)"
#   value       = module.cloudfront_pulsara.cloudfront_distribution_arn
# }
