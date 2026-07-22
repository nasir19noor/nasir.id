resource "cloudflare_record" "acm_antri_nasir_id" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = "_9b67ee2a80da0be272484ea35d2c52ab.antri.nasir.id."
  content = "_f6360797db659cd52826215cd26d419d.jkddzztszm.acm-validations.aws."
  type    = "CNAME"
  proxied = false
  ttl     = 1
}