resource "cloudflare_record" "esim_nasir_id" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = "esim.nasir.id"
  content = "207.180.248.214"
  type    = "A"
  proxied = true
  ttl     = 1
}

