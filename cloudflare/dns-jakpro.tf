resource "cloudflare_record" "jppeka1_jakpro_nasir_id" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = "jppeka1.jakpro.nasir.id"
  content = "34.98.90.130"
  type    = "A"
  proxied = false
  ttl     = 300
}

resource "cloudflare_record" "jppeka2_jakpro_nasir_id" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = "jppeka2.jakpro.nasir.id"
  content = "34.98.90.130"
  type    = "A"
  proxied = false
  ttl     = 300
}

resource "cloudflare_record" "jppeka3_jakpro_nasir_id" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = "jppeka3.jakpro.nasir.id"
  content = "34.98.90.130"
  type    = "A"
  proxied = false
  ttl     = 300
}