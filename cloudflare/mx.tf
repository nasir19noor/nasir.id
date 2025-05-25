resource "cloudflare_record" "mx-1" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = local.root
  content = "aspmx.l.google.com"
  type    = "MX"
  priority = 1
  ttl     = 3600
}