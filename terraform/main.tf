###############################################################################
# Main Terraform Configuration - Mimo Finance Production
###############################################################################

###############################################################################
# VPC & Networking
###############################################################################

resource "google_compute_network" "main" {
  name                    = "mimo-vpc"
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
  project                 = var.project_id
}

resource "google_compute_subnetwork" "main" {
  name          = "mimo-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.main.id
  project       = var.project_id

  private_ip_google_access = true
}

# Cloud Router pour NAT
resource "google_compute_router" "main" {
  name    = "mimo-router"
  region  = var.region
  network = google_compute_network.main.id
  project = var.project_id
}

# Cloud NAT pour accès internet sortant
resource "google_compute_router_nat" "main" {
  name   = "mimo-nat"
  router = google_compute_router.main.name
  region = var.region
  project = var.project_id

  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# Peering range pour Cloud SQL
resource "google_compute_global_address" "private_ip_address" {
  name          = "mimo-private-ip"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.main.id
  project       = var.project_id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.main.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_address.name]
}

###############################################################################
# Artifact Registry
###############################################################################

resource "google_artifact_registry_repository" "main" {
  location      = var.region
  repository_id = "mimo-repo"
  description   = "Docker repository for Mimo Finance"
  format        = "DOCKER"
  project       = var.project_id
}

###############################################################################
# Service Accounts
###############################################################################

# Service Account pour Cloud Run
resource "google_service_account" "cloud_run" {
  account_id   = "cloud-run-sa"
  display_name = "Cloud Run Service Account"
  description  = "Service account for Cloud Run backend and frontend"
  project      = var.project_id
}

# Service Account pour Cloud Scheduler
resource "google_service_account" "scheduler" {
  account_id   = "scheduler-sa"
  display_name = "Cloud Scheduler Service Account"
  description  = "Service account for Cloud Scheduler jobs"
  project      = var.project_id
}

# Service Account pour GitHub Actions
resource "google_service_account" "github_actions" {
  account_id   = "github-actions-sa"
  display_name = "GitHub Actions Service Account"
  description  = "Service account for GitHub Actions CI/CD"
  project      = var.project_id
}

###############################################################################
# IAM Permissions - Cloud Run Service Account
###############################################################################

# Cloud SQL Client
resource "google_project_iam_member" "cloud_run_sql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Secret Manager Secret Accessor
resource "google_project_iam_member" "cloud_run_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Storage Object Admin (pour uploads et backups)
resource "google_storage_bucket_iam_member" "cloud_run_uploads_admin" {
  bucket = google_storage_bucket.uploads.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloud_run.email}"
}

resource "google_storage_bucket_iam_member" "cloud_run_backups_admin" {
  bucket = google_storage_bucket.backups.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Monitoring Metric Writer
resource "google_project_iam_member" "cloud_run_monitoring" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

# Logging Writer
resource "google_project_iam_member" "cloud_run_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.cloud_run.email}"
}

###############################################################################
# IAM Permissions - Cloud Scheduler Service Account
###############################################################################

# Cloud Run Invoker
resource "google_cloud_run_v2_service_iam_member" "scheduler_backend_invoker" {
  name     = google_cloud_run_v2_service.backend.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.scheduler.email}"
  project  = var.project_id
}

###############################################################################
# IAM Permissions - GitHub Actions Service Account
###############################################################################

# Cloud Run Admin
resource "google_project_iam_member" "github_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Artifact Registry Writer
resource "google_project_iam_member" "github_artifact_writer" {
  project = var.project_id
  role    = "roles/artifactregistry.writer"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Service Account User (pour déployer sur Cloud Run)
resource "google_project_iam_member" "github_sa_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

# Storage Admin (pour mettre à jour CORS)
resource "google_project_iam_member" "github_storage_admin" {
  project = var.project_id
  role    = "roles/storage.admin"
  member  = "serviceAccount:${google_service_account.github_actions.email}"
}

###############################################################################
# Workload Identity Federation (GitHub Actions)
###############################################################################

resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "github-pool"
  display_name              = "GitHub Actions Pool"
  description               = "Workload Identity Pool for GitHub Actions"
  project                   = var.project_id
}

resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github-provider"
  display_name                       = "GitHub Provider"
  description                        = "OIDC provider for GitHub Actions"
  project                            = var.project_id

  attribute_mapping = {
    "google.subject"             = "assertion.sub"
    "attribute.actor"            = "assertion.actor"
    "attribute.repository"       = "assertion.repository"
    "attribute.repository_owner" = "assertion.repository_owner"
  }

  attribute_condition = "assertion.repository_owner == 'Linerror99'"

  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}

# Binding GitHub repo vers Service Account
resource "google_service_account_iam_member" "github_wif_binding" {
  service_account_id = google_service_account.github_actions.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repo}"
}

###############################################################################
# Cloud SQL (PostgreSQL)
###############################################################################

resource "random_id" "db_suffix" {
  byte_length = 4
}

resource "google_sql_database_instance" "main" {
  name             = "mimo-db-${random_id.db_suffix.hex}"
  database_version = var.db_version
  region           = var.region
  project          = var.project_id

  deletion_protection = true

  depends_on = [google_service_networking_connection.private_vpc_connection]

  settings {
    tier              = var.db_tier
    availability_type = "ZONAL"
    disk_type         = "PD_SSD"
    disk_size         = 10
    disk_autoresize   = true

    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = var.db_backup_retention
        retention_unit   = "COUNT"
      }
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.main.id
    }

    maintenance_window {
      day          = 7  # Dimanche
      hour         = 4
      update_track = "stable"
    }

    insights_config {
      query_insights_enabled  = true
      query_string_length     = 1024
      record_application_tags = true
    }
  }
}

# Database
resource "google_sql_database" "main" {
  name     = "mimo_db"
  instance = google_sql_database_instance.main.name
  project  = var.project_id
}

# User DB
resource "google_sql_user" "main" {
  name     = "mimo_user"
  instance = google_sql_database_instance.main.name
  password = data.google_secret_manager_secret_version.db_password.secret_data
  project  = var.project_id
}

# Accès au secret DB_PASSWORD
data "google_secret_manager_secret_version" "db_password" {
  secret  = "db-password"
  project = var.project_id
}

###############################################################################
# Cloud Memorystore (Redis)
###############################################################################

resource "google_redis_instance" "main" {
  name               = "mimo-redis"
  tier               = var.redis_tier
  memory_size_gb     = var.redis_memory_size_gb
  redis_version      = "REDIS_7_0"
  region             = var.region
  authorized_network = google_compute_network.main.id
  project            = var.project_id

  display_name = "Mimo Finance Redis"
  
  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 4
        minutes = 0
      }
    }
  }
}

###############################################################################
# Cloud Storage Buckets
###############################################################################

# Bucket pour uploads utilisateurs
resource "google_storage_bucket" "uploads" {
  name          = "mimo-uploads-prod"
  location      = var.region
  project       = var.project_id
  storage_class = "STANDARD"

  uniform_bucket_level_access = true

  cors {
    origin          = ["*"]  # Sera mis à jour après déploiement frontend
    method          = ["GET", "POST", "PUT", "DELETE"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }

  lifecycle_rule {
    condition {
      age = var.uploads_bucket_lifecycle_age
    }
    action {
      type = "Delete"
    }
  }
}

# Bucket pour backups DB
resource "google_storage_bucket" "backups" {
  name          = "mimo-backups-prod"
  location      = var.region
  project       = var.project_id
  storage_class = "STANDARD"

  uniform_bucket_level_access = true
  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = var.backups_bucket_lifecycle_age
    }
    action {
      type = "Delete"
    }
  }

  lifecycle_rule {
    condition {
      num_newer_versions = 3
    }
    action {
      type = "Delete"
    }
  }
}

###############################################################################
# Cloud Run - Backend
###############################################################################

# Accès aux secrets
data "google_secret_manager_secret_version" "jwt_secret" {
  secret  = "jwt-secret"
  project = var.project_id
}

resource "google_cloud_run_v2_service" "backend" {
  name     = "mimo-backend"
  location = var.region
  project  = var.project_id

  template {
    service_account = google_service_account.cloud_run.email

    scaling {
      min_instance_count = var.cloud_run_backend_min_instances
      max_instance_count = var.cloud_run_backend_max_instances
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.main.name}/backend:latest"

      resources {
        limits = {
          cpu    = var.cloud_run_backend_cpu
          memory = var.cloud_run_backend_memory
        }
        cpu_idle = true
      }

      ports {
        container_port = 8000
      }

      env {
        name  = "ENVIRONMENT"
        value = var.environment
      }

      env {
        name  = "DATABASE_URL"
        value = "postgresql+asyncpg://mimo_user:${data.google_secret_manager_secret_version.db_password.secret_data}@${google_sql_database_instance.main.private_ip_address}:5432/mimo_db"
      }

      env {
        name  = "REDIS_URL"
        value = "redis://${google_redis_instance.main.host}:${google_redis_instance.main.port}/0"
      }

      env {
        name = "JWT_SECRET_KEY"
        value_source {
          secret_key_ref {
            secret  = "jwt-secret"
            version = "latest"
          }
        }
      }

      env {
        name  = "JWT_ALGORITHM"
        value = "HS256"
      }

      env {
        name  = "ACCESS_TOKEN_EXPIRE_MINUTES"
        value = tostring(var.jwt_access_token_expire_minutes)
      }

      env {
        name  = "REFRESH_TOKEN_EXPIRE_DAYS"
        value = tostring(var.jwt_refresh_token_expire_days)
      }

      env {
        name  = "GCS_BUCKET_UPLOADS"
        value = google_storage_bucket.uploads.name
      }

      env {
        name  = "GCS_BUCKET_BACKUPS"
        value = google_storage_bucket.backups.name
      }

      env {
        name  = "CORS_ORIGINS"
        value = "*"  # Sera mis à jour après déploiement frontend
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [
    google_project_iam_member.cloud_run_sql_client,
    google_project_iam_member.cloud_run_secret_accessor
  ]
}

# Public access pour backend
resource "google_cloud_run_v2_service_iam_member" "backend_public" {
  name     = google_cloud_run_v2_service.backend.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
  project  = var.project_id
}

###############################################################################
# Cloud Run - Frontend
###############################################################################

resource "google_cloud_run_v2_service" "frontend" {
  name     = "mimo-frontend"
  location = var.region
  project  = var.project_id

  template {
    service_account = google_service_account.cloud_run.email

    scaling {
      min_instance_count = var.cloud_run_frontend_min_instances
      max_instance_count = var.cloud_run_frontend_max_instances
    }

    containers {
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.main.name}/frontend:latest"

      resources {
        limits = {
          cpu    = var.cloud_run_frontend_cpu
          memory = var.cloud_run_frontend_memory
        }
        cpu_idle = true
      }

      ports {
        container_port = 80
      }

      env {
        name  = "BACKEND_URL"
        value = google_cloud_run_v2_service.backend.uri
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}

# Public access pour frontend
resource "google_cloud_run_v2_service_iam_member" "frontend_public" {
  name     = google_cloud_run_v2_service.frontend.name
  location = var.region
  role     = "roles/run.invoker"
  member   = "allUsers"
  project  = var.project_id
}

###############################################################################
# Cloud Scheduler Jobs
###############################################################################

# Job validation automatique (06h UTC quotidien)
resource "google_cloud_scheduler_job" "auto_validation" {
  name             = "auto-validation"
  description      = "Job de validation automatique quotidien"
  schedule         = var.validation_schedule
  time_zone        = "UTC"
  attempt_deadline = "320s"
  region           = var.region
  project          = var.project_id

  retry_config {
    retry_count = 3
  }

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.backend.uri}/api/v1/scheduled/validation"

    oidc_token {
      service_account_email = google_service_account.scheduler.email
    }
  }

  depends_on = [
    google_cloud_run_v2_service_iam_member.scheduler_backend_invoker
  ]
}

# Job backup DB (Dimanche 02h UTC)
resource "google_cloud_scheduler_job" "db_backup" {
  name             = "db-backup"
  description      = "Backup hebdomadaire de la base de données"
  schedule         = var.backup_schedule
  time_zone        = "UTC"
  attempt_deadline = "1800s"
  region           = var.region
  project          = var.project_id

  retry_config {
    retry_count = 2
  }

  http_target {
    http_method = "POST"
    uri         = "${google_cloud_run_v2_service.backend.uri}/api/v1/scheduled/backup"
    
    headers = {
      "Content-Type" = "application/json"
    }

    oidc_token {
      service_account_email = google_service_account.scheduler.email
    }
  }

  depends_on = [
    google_cloud_run_v2_service_iam_member.scheduler_backend_invoker
  ]
}

###############################################################################
# Cloud Monitoring
###############################################################################

# Email notification channel
resource "google_monitoring_notification_channel" "email" {
  display_name = "Admin Email"
  type         = "email"
  project      = var.project_id

  labels = {
    email_address = var.admin_email
  }
}

# Uptime check backend
resource "google_monitoring_uptime_check_config" "backend" {
  display_name = "Mimo Backend Health Check"
  timeout      = "10s"
  period       = "60s"
  project      = var.project_id

  http_check {
    path         = "/health"
    port         = 443
    use_ssl      = true
    validate_ssl = true
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = replace(google_cloud_run_v2_service.backend.uri, "https://", "")
    }
  }
}

# Alert policy pour 5xx errors
resource "google_monitoring_alert_policy" "backend_errors" {
  display_name = "Backend 5xx Errors"
  combiner     = "OR"
  project      = var.project_id

  conditions {
    display_name = "5xx error rate > 5%"
    
    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${google_cloud_run_v2_service.backend.name}\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"5xx\""
      duration        = "60s"
      comparison      = "COMPARISON_GT"
      threshold_value = 5

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  alert_strategy {
    auto_close = "1800s"
  }
}

# Alert policy pour latency P95
resource "google_monitoring_alert_policy" "backend_latency" {
  display_name = "Backend High Latency"
  combiner     = "OR"
  project      = var.project_id

  conditions {
    display_name = "P95 latency > 2s"
    
    condition_threshold {
      filter          = "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${google_cloud_run_v2_service.backend.name}\" AND metric.type=\"run.googleapis.com/request_latencies\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 2000

      aggregations {
        alignment_period     = "60s"
        per_series_aligner   = "ALIGN_DELTA"
        cross_series_reducer = "REDUCE_PERCENTILE_95"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  alert_strategy {
    auto_close = "3600s"
  }
}

# Alert policy pour uptime check
resource "google_monitoring_alert_policy" "uptime_failure" {
  display_name = "Backend Uptime Check Failure"
  combiner     = "OR"
  project      = var.project_id

  conditions {
    display_name = "Uptime check failure"
    
    condition_threshold {
      filter          = "metric.type=\"monitoring.googleapis.com/uptime_check/check_passed\" AND resource.type=\"uptime_url\" AND metric.labels.check_id=\"${google_monitoring_uptime_check_config.backend.uptime_check_id}\""
      duration        = "60s"
      comparison      = "COMPARISON_LT"
      threshold_value = 1

      aggregations {
        alignment_period     = "60s"
        cross_series_reducer = "REDUCE_COUNT_FALSE"
        per_series_aligner   = "ALIGN_NEXT_OLDER"
        group_by_fields      = ["resource.label.project_id"]
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]

  alert_strategy {
    auto_close = "1800s"
  }
}
