resource "cloudflare_record" "nasir-id" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = local.root
  content = local.contabo_ip
  type    = "A"
  ttl     = 3600
}