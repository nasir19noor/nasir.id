resource "cloudflare_record" "mx-1" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = local.root
  content = "aspmx.l.google.com"
  type    = "MX"
  priority = 1
  ttl     = 3600
}

resource "cloudflare_record" "mx-2" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = local.root
  content = "alt1.aspmx.l.google.com"
  type    = "MX"
  priority = 5
  ttl     = 3600
}

resource "cloudflare_record" "mx-3" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = local.root
  content = "alt1.aspmx.l.google.com"
  type    = "MX"
  priority = 5
  ttl     = 3600
}

resource "cloudflare_record" "mx-4" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = local.root
  content = "alt3.aspmx.l.google.com"
  type    = "MX"
  priority = 10
  ttl     = 3600
}

resource "cloudflare_record" "mx-5" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = local.root
  content = "alt4.aspmx.l.google.com"
  type    = "MX"
  priority = 10
  ttl     = 3600
}