output "cloudfront_itung_distribution_arn" {
  description = "ARN of the itung CloudFront distribution (used for OAC bucket policy on assets.itung.nasir.id)"
  value       = module.cloudfront_itung.cloudfront_distribution_arn
}
