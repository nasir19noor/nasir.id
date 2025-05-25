resource "cloudflare_record" "nasir-id" {
  zone_id = local.zone_id
  name    = "terraform"
  content = "161.97.86.160"
  type    = "A"
  ttl     = 3600
}