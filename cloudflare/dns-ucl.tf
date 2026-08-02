resource "cloudflare_record" "ucl_nasir_id" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = "ucl.nasir.id"
  content = "207.180.248.214"
  type    = "A"
  proxied = true
  ttl     = 1
}

resource "cloudflare_record" "api_ucl_nasir_id" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = "api.ucl.nasir.id"
  content = "207.180.248.214"
  type    = "A"
  proxied = false
  ttl     = 600
}