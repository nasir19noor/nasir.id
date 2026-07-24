resource "cloudflare_record" "agent_nasir_id" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = local.root
  content = "207.180.248.214"
  type    = "A"
  proxied = true
  ttl     = 1
}

resource "cloudflare_record" "api_agent_nasir_id" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = local.root
  content = "207.180.248.214"
  type    = "A"
  proxied = false
  ttl     = 600
}