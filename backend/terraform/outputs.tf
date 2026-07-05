
output "database_endpoint" {
  description = "Database connection endpoint"
  value       = aws_db_instance.db.endpoint
}

output "database_port" {
  description = "Database connection port"
  value       = aws_db_instance.db.port
}

output "database_username" {
  description = "Database master username"
  value       = aws_db_instance.db.username
}
