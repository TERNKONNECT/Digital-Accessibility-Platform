terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Lightsail Database (PostgreSQL)
resource "aws_lightsail_database" "db" {
  relational_database_name = "${var.service_name}-db"
  availability_zone        = "${var.aws_region}a"
  master_database_name     = "postgres"
  master_password          = var.db_password
  master_username          = "dbmasteruser"
  blueprint_id             = "postgresql_15"
  bundle_id                = "micro_1_0" # 1GB RAM, 1 vCPU ($15/mo)
}

# Lightsail Container Service
resource "aws_lightsail_container_service" "app" {
  name        = var.service_name
  power       = "nano" # 512MB RAM, 0.25 vCPU ($7/mo)
  scale       = 1
  is_disabled = false
  
  tags = {
    Environment = "production"
    Project     = "TernKonnect"
  }
}
