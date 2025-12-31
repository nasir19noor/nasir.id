terraform {
  backend "gcs" {
    prefix = "artifact-registry/"
  }
}