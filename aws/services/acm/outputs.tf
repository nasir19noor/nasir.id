output "acm_itung_nasir_certificate_arn" {
  description = "ARN of the ACM certificate for the assets.itung.nasir.id domain (used by CloudFront)"
  value       = module.acm_itung_nasir.acm_certificate_arn
}

output "acm_nasir_certificate_arn" {
  description = "ARN of the ACM certificate for the nasir domain (used by CloudFront)"
  value       = module.acm_nasir.acm_certificate_arn
}
