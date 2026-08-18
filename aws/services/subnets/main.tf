locals {
  cidr_block  = data.terraform_remote_state.vpc.outputs.vpc_cidr_block
  name        = data.terraform_remote_state.vpc.outputs.vpc_name
  vpc_id      = data.terraform_remote_state.vpc.outputs.vpc_id
  public_subnet_cidrs  = ["10.1.1.0/24", "10.1.2.0/24", "10.1.3.0/24"]
  private_subnet_cidrs = ["10.1.11.0/24", "10.1.12.0/24", "10.1.13.0/24"]
}

module "public_subnets" {
  source = "git::https://github.com/nasir19noor/terraform.git//aws/modules/subnet"

  vpc_id                  = local.vpc_id
  region                  = local.region
  subnet_count            = local.subnet_count
  cidr_blocks             = local.public_subnet_cidrs
  map_public_ip_on_launch = true

  tags = {
    Name = "${local.name}-public"
    Tier = "public"
  }
}

module "private_subnets" {
  source = "git::https://github.com/nasir19noor/terraform.git//aws/modules/subnet"

  vpc_id                  = local.vpc_id
  region                  = local.region
  subnet_count            = local.subnet_count
  cidr_blocks             = local.private_subnet_cidrs
  map_public_ip_on_launch = false

  tags = {
    Name = "${local.name}-private"
    Tier = "private"
  }
}