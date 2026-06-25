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

# Default VPC Security Group for RDS to allow connections
resource "aws_security_group" "rds_sg" {
  name        = "${var.service_name}-rds-sg"
  description = "Allow inbound traffic to RDS PostgreSQL"

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # Note: For production, restrict this to specific IPs
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# AWS RDS Database (PostgreSQL - Low Spec t4g.micro)
resource "aws_db_instance" "db" {
  identifier             = "${var.service_name}-db"
  allocated_storage      = 20
  engine                 = "postgres"
  engine_version         = "15.7"
  instance_class         = "db.t4g.micro"
  username               = "dbmasteruser"
  password               = var.db_password
  publicly_accessible    = true
  skip_final_snapshot    = true
  vpc_security_group_ids = [aws_security_group.rds_sg.id]
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
