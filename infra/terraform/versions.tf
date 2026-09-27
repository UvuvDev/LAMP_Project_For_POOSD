terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }

  # Uncomment to keep state in GCS instead of on disk.
  # backend "gcs" {
  #   bucket = "my-tfstate-bucket"
  #   prefix = "lamp"
  # }
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}
