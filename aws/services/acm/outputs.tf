output "acm_assets_certificate_arn" {
  description = "ARN of the ACM certificate for the assets domain (used by CloudFront)"
  value       = module.acm_assets.acm_certificate_arn
}

output "acm_nasir_certificate_arn" {
  description = "ARN of the ACM certificate for the nasir domain (used by CloudFront)"
  value       = module.acm_nasir.acm_certificate_arn
}
