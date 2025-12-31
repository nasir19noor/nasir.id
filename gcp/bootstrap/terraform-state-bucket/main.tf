module "bucket" {
  source = "git::https://github.com/nasir19noor/terraform.git//gcp/modules/cloud-storage"
  project_id                  = local.project_id
  bucket_name                 = local.bucket_name
  bucket_location             = local.region
  force_destroy               = true
  storage_class               = "STANDARD"
  uniform_bucket_level_access = true
  public_access_prevention    = "inherited"

  random_bucket_suffix = false
}
