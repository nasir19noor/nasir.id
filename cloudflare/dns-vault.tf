resource "cloudflare_record" "vault_nasir_id" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = "vault.nasir.id"
  content = "62.169.18.141"
  type    = "A"
  proxied = true
  ttl     = 1
}
