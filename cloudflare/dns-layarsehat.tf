resource "cloudflare_record" "layarsehat_nasir_id" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = "layarsehat.nasir.id"
  content = "207.180.248.214"
  type    = "A"
  proxied = true
  ttl     = 1
}

resource "cloudflare_record" "api_layarsehat_nasir_id" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = "api.layarsehat.nasir.id"
  content = "207.180.248.214"
  type    = "A"
  proxied = false
  ttl     = 600
}