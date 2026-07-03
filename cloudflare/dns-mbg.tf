#mbg.nasir.id
resource "cloudflare_record" "mbg_nasir_id" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = "mbg.nasir.id"
  content = "mbg.nasir.id.s3-website-ap-southeast-1.amazonaws.com"
  type    = "CNAME"
  proxied = true
  ttl     = 1
}

resource "cloudflare_page_rule" "mbg_flexible_ssl" {
  zone_id  = data.cloudflare_zones.nasir_id.zones[0].id
  target   = "mbg.nasir.id/*"
  priority = 1

  actions {
    ssl = "flexible"
  }
}

resource "cloudflare_record" "acm_api_mbg_nasir_id" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = "_c9adce6002bfde1a1d21cfb9204d69ed.api.mbg.nasir.id."
  content = "_2c50c0776412168b835c1e3c048cdf98.jkddzztszm.acm-validations.aws."
  type    = "CNAME"
  proxied = false
  ttl     = 1
}