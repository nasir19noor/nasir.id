terraform {
  required_version = ">= 1.0"  
    required_providers {
      cloudflare = {
        source  = "cloudflare/cloudflare"
        version = "~> 4.46.0"
      }
    }
}

provider "cloudflare" {
}

