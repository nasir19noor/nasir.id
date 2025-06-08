# MX Record for Google Workspace
resource "cloudflare_record" "mx-1" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = local.root
  content = "ASPMX.L.GOOGLE.COM."
  type    = "MX"
  priority = 1
  ttl     = 3600
}

resource "cloudflare_record" "mx-2" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = local.root
  content = "ALT1.ASPMX.L.GOOGLE.COM."
  type    = "MX"
  priority = 5
  ttl     = 3600
}

resource "cloudflare_record" "mx-3" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = local.root
  content = "ALT2.ASPMX.L.GOOGLE.COM."
  type    = "MX"
  priority = 5
  ttl     = 3600
}

resource "cloudflare_record" "mx-4" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = local.root
  content = "ALT3.ASPMX.L.GOOGLE.COM."
  type    = "MX"
  priority = 10
  ttl     = 3600
}

resource "cloudflare_record" "mx-5" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = local.root
  content = "ALT4.ASPMX.L.GOOGLE.COM."
  type    = "MX"
  priority = 10
  ttl     = 3600
}

# A record nasir.id
resource "cloudflare_record" "nasir-id" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = local.root
  content = local.contabo_ip
  type    = "A"
  ttl     = 1
  proxied = true
}

resource "cloudflare_record" "hello-nasir-id" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = "hello"
  content = local.contabo_ip
  type    = "A"
  ttl     = 1
  proxied = true
}

resource "cloudflare_record" "n8n" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = "n8n"
  content = local.contabo_ip
  type    = "A"
  ttl     = 1
  proxied = true
}

resource "cloudflare_record" "upload" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = "upload"
  content = local.contabo_ip
  type    = "A"
  ttl     = 1
  proxied = true
}

resource "cloudflare_record" "vault" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = "vault"
  content = local.contabo_ip
  type    = "A"
  ttl     = 1
  proxied = true
}

resource "cloudflare_record" "assets" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = "assets"
  content = "s3.ap-southeast-1.amazonaws.com/upload.nasir.id"
  type    = "CNAME"
  ttl     = 1
  proxied = true
}