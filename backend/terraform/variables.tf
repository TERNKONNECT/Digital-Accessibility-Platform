variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-1"
}

variable "service_name" {
  description = "Lightsail container service name"
  type        = string
  default     = "ternkonnect-backend"
}

variable "db_password" {
  description = "Master password for the PostgreSQL database"
  type        = string
  sensitive   = true
}
