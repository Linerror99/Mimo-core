###############################################################################
# Outputs - Mimo Finance Production
###############################################################################

output "project_id" {
  description = "GCP Project ID"
  value       = var.project_id
}

output "region" {
  description = "GCP Region"
  value       = var.region
}

###############################################################################
# URLs Services
###############################################################################

output "backend_url" {
  description = "URL du backend Cloud Run"
  value       = google_cloud_run_v2_service.backend.uri
}

output "frontend_url" {
  description = "URL du frontend Cloud Run"
  value       = google_cloud_run_v2_service.frontend.uri
}

###############################################################################
# Database
###############################################################################

output "database_instance_name" {
  description = "Nom de l'instance Cloud SQL"
  value       = google_sql_database_instance.main.name
}

output "database_connection_name" {
  description = "Connection name Cloud SQL"
  value       = google_sql_database_instance.main.connection_name
}

output "database_private_ip" {
  description = "IP privée de la base de données"
  value       = google_sql_database_instance.main.private_ip_address
  sensitive   = true
}

###############################################################################
# Redis
###############################################################################

output "redis_host" {
  description = "Host Redis"
  value       = google_redis_instance.main.host
  sensitive   = true
}

output "redis_port" {
  description = "Port Redis"
  value       = google_redis_instance.main.port
}

###############################################################################
# Storage
###############################################################################

output "uploads_bucket_name" {
  description = "Nom du bucket uploads"
  value       = google_storage_bucket.uploads.name
}

output "uploads_bucket_url" {
  description = "URL du bucket uploads"
  value       = google_storage_bucket.uploads.url
}

output "backups_bucket_name" {
  description = "Nom du bucket backups"
  value       = google_storage_bucket.backups.name
}

output "backups_bucket_url" {
  description = "URL du bucket backups"
  value       = google_storage_bucket.backups.url
}

###############################################################################
# Artifact Registry
###############################################################################

output "artifact_registry_repository" {
  description = "URL du repository Docker"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.main.name}"
}

###############################################################################
# Service Accounts
###############################################################################

output "cloud_run_service_account" {
  description = "Email du service account Cloud Run"
  value       = google_service_account.cloud_run.email
}

output "github_actions_service_account" {
  description = "Email du service account GitHub Actions"
  value       = google_service_account.github_actions.email
}

output "scheduler_service_account" {
  description = "Email du service account Scheduler"
  value       = google_service_account.scheduler.email
}

###############################################################################
# Workload Identity
###############################################################################

output "workload_identity_provider" {
  description = "Workload Identity Provider pour GitHub Actions"
  value       = google_iam_workload_identity_pool_provider.github.name
}

###############################################################################
# Monitoring
###############################################################################

output "notification_channel_id" {
  description = "ID du canal de notification email"
  value       = google_monitoring_notification_channel.email.id
}

###############################################################################
# Cloud Scheduler Jobs
###############################################################################

output "validation_job_name" {
  description = "Nom du job validation automatique"
  value       = google_cloud_scheduler_job.auto_validation.name
}

output "backup_job_name" {
  description = "Nom du job backup DB"
  value       = google_cloud_scheduler_job.db_backup.name
}

###############################################################################
# Résumé Déploiement
###############################################################################

output "deployment_summary" {
  description = "Résumé du déploiement"
  value = {
    backend_url              = google_cloud_run_v2_service.backend.uri
    frontend_url             = google_cloud_run_v2_service.frontend.uri
    database_instance        = google_sql_database_instance.main.name
    database_private_ip      = google_sql_database_instance.main.private_ip_address
    redis_host               = google_redis_instance.main.host
    uploads_bucket           = google_storage_bucket.uploads.name
    backups_bucket           = google_storage_bucket.backups.name
    artifact_registry        = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.main.name}"
    validation_schedule      = var.validation_schedule
    backup_schedule          = var.backup_schedule
    monitoring_enabled       = true
    workload_identity_configured = true
  }
  sensitive = true
}
