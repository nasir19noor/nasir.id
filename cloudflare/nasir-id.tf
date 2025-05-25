resource "cloudflare_record" "nasir-id" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = "@"
  content = "161.97.86.160"
  type    = "A"
  ttl     = 3600
}