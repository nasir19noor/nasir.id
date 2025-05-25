data "cloudflare_zones" "nasir_id" {
  filter {
    name = "nasir.id"
  }
}