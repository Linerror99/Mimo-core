###############################################################################
# Variables - Mimo Finance Production
###############################################################################

variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "mimo-finance-prod"
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "europe-west1"
}

variable "zone" {
  description = "GCP Zone"
  type        = string
  default     = "europe-west1-b"
}

variable "admin_email" {
  description = "Email pour les alertes monitoring"
  type        = string
}

variable "github_repo" {
  description = "GitHub repository (format: owner/repo)"
  type        = string
  default     = "Linerror99/Mimo-core"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

###############################################################################
# Compute Resources
###############################################################################

variable "cloud_run_backend_cpu" {
  description = "CPU pour Cloud Run Backend"
  type        = string
  default     = "1"
}

variable "cloud_run_backend_memory" {
  description = "Memory pour Cloud Run Backend"
  type        = string
  default     = "512Mi"
}

variable "cloud_run_backend_min_instances" {
  description = "Nombre minimum d'instances backend"
  type        = number
  default     = 0
}

variable "cloud_run_backend_max_instances" {
  description = "Nombre maximum d'instances backend"
  type        = number
  default     = 5
}

variable "cloud_run_frontend_cpu" {
  description = "CPU pour Cloud Run Frontend"
  type        = string
  default     = "1"
}

variable "cloud_run_frontend_memory" {
  description = "Memory pour Cloud Run Frontend"
  type        = string
  default     = "256Mi"
}

variable "cloud_run_frontend_min_instances" {
  description = "Nombre minimum d'instances frontend"
  type        = number
  default     = 0
}

variable "cloud_run_frontend_max_instances" {
  description = "Nombre maximum d'instances frontend"
  type        = number
  default     = 3
}

###############################################################################
# Cloud SQL Database
###############################################################################

variable "db_tier" {
  description = "Cloud SQL instance tier"
  type        = string
  default     = "db-f1-micro"
}

variable "db_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "POSTGRES_15"
}

variable "db_backup_retention" {
  description = "Nombre de backups à conserver"
  type        = number
  default     = 7
}

###############################################################################
# Redis
###############################################################################

variable "redis_memory_size_gb" {
  description = "Taille mémoire Redis en GB"
  type        = number
  default     = 1
}

variable "redis_tier" {
  description = "Redis tier (BASIC ou STANDARD_HA)"
  type        = string
  default     = "BASIC"
}

###############################################################################
# Storage
###############################################################################

variable "uploads_bucket_lifecycle_age" {
  description = "Age en jours avant suppression des uploads"
  type        = number
  default     = 365
}

variable "backups_bucket_lifecycle_age" {
  description = "Age en jours avant suppression des backups"
  type        = number
  default     = 90
}

###############################################################################
# Scheduler
###############################################################################

variable "validation_schedule" {
  description = "Cron schedule pour validation automatique"
  type        = string
  default     = "0 6 * * *"  # 06h UTC quotidien
}

variable "backup_schedule" {
  description = "Cron schedule pour backup DB"
  type        = string
  default     = "0 2 * * 0"  # Dimanche 02h UTC
}

###############################################################################
# JWT Configuration
###############################################################################

variable "jwt_access_token_expire_minutes" {
  description = "Expiration des access tokens en minutes"
  type        = number
  default     = 15
}

variable "jwt_refresh_token_expire_days" {
  description = "Expiration des refresh tokens en jours"
  type        = number
  default     = 7
}
