data "cloudflare_zones" "nasir_id" {
  filter {
    name = local.zone_name
  }
}