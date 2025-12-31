output "zone_id" {
  value = data.cloudflare_zones.nasir_id.zones[0].id
}