# Terraform Configuration - Mimo Finance Production

terraform {
  backend "gcs" {
    bucket = "mimo-finance-prod-terraform-state"
    prefix = "production/state"
  }
  
  required_version = ">= 1.6"
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
