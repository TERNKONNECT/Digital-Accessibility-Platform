variable "aws_region" {
  description = "AWS Region"
  type        = string
  default     = "us-east-1"
}

variable "bucket_name" {
  description = "Name of the S3 bucket for the frontend"
  type        = string
  default     = "ternkonnect-frontend-bucket"
}
