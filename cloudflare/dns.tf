resource "cloudflare_record" "mx-1" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = local.root
  content = "mx1.titan.email"
  type    = "MX"
  priority = 1
  ttl     = 3600
}

resource "cloudflare_record" "mx-2" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = local.root
  content = "mx2.titan.email"
  type    = "MX"
  priority = 5
  ttl     = 3600
}

resource "cloudflare_record" "spf" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = local.root
  content = "v=spf1 include:spf.titan.email ~all"
  type    = "TXT"
  ttl     = 3600
}

resource "cloudflare_record" "dkm" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = "titan1._domainkey"
  content = "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCNQJWkkAegTEczSlTsQOOrUDVtrXyMgNUfEx4fDBNBxPc/pFqvgzmuTLcWZD5paYf9obJwHiWM7MRwbQCcxunZ6eH/5j7qevHehGfSZmDY79X1m6KkDgovSDqmVcLd4AS2/S7GbLt3EXDQDd7d/J8GMTSTHwmuRCU1Dy+otr4WsQIDAQAB"
  type    = "TXT"
  ttl     = 3600
}

resource "cloudflare_record" "blog" {
  zone_id = data.cloudflare_zones.nasir_id.zones[0].id
  name    = local.root
  content = "216.106.184.20"
  type    = "A"
  ttl     = 3600
}







