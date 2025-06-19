terraform {
  backend "gcs" {
    prefix = "vm/"
  }
}