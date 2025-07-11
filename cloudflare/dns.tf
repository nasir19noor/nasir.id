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

resource "cloudflare_record" "assets_acm" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = "_3c4a03e63b16108a5c8930220098fe53.assets"
  content = "_4c3847f4d8babde6128bee26c801501d.xlfgrmvvlj.acm-validations.aws."
  type    = "CNAME"
  ttl     = 300
  proxied = false
}

resource "cloudflare_record" "gke" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = "gke"
  content = "34.87.190.78"
  type    = "A"
  ttl     = 1
  proxied = true
}

resource "cloudflare_record" "gke_flask" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = "gke.flask"
  content = "34.107.128.211"
  type    = "A"
  ttl     = 1
  proxied = true
}

# resource "cloudflare_record" "gke_nginx" {
#   zone_id = data.cloudflare_zones.nasir_id.zones[0].id
#   name    = "gke.flask"
#   content = "34.107.128.211"
#   type    = "A"
#   ttl     = 1
#   proxied = true
# }

resource "cloudflare_record" "gke_react_movie" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = "gke.react-movie"
  content = "35.186.153.90"
  type    = "A"
  ttl     = 1
  proxied = false
}