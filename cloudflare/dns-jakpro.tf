resource "cloudflare_record" "jakpro_nasir_id_certificate" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = "_acme-challenge_g6gykr3nnl4j3xae.jakpro.nasir.id."
  content = "0bfdec66-281b-408c-b034-3d4b542575bd.0.asia-southeast2.authorize.certificatemanager.goog."
  type    = "CNAME"
  proxied = false
  ttl     = 300
}

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

resource "cloudflare_record" "performa1_jakpro_nasir_id" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = "performa1.jakpro.nasir.id"
  content = "34.98.90.130"
  type    = "A"
  proxied = false
  ttl     = 300
}

resource "cloudflare_record" "performa2_jakpro_nasir_id" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = "performa2.jakpro.nasir.id"
  content = "34.98.90.130"
  type    = "A"
  proxied = false
  ttl     = 300
}

resource "cloudflare_record" "performa3_jakpro_nasir_id" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = "performa3.jakpro.nasir.id"
  content = "34.98.90.130"
  type    = "A"
  proxied = false
  ttl     = 300
}