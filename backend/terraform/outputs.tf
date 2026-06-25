output "container_service_url" {
  description = "Public URL of the backend service"
  value       = aws_lightsail_container_service.app.url
}

output "database_endpoint" {
  description = "Database connection endpoint"
  value       = aws_lightsail_database.db.master_endpoint_address
}

output "database_port" {
  description = "Database connection port"
  value       = aws_lightsail_database.db.master_endpoint_port
}
