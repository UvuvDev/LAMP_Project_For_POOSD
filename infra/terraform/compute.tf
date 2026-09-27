resource "google_service_account" "web" {
  account_id   = "${local.name}-web-sa"
  display_name = "LAMP web server (${local.name})"
  description  = "Runtime identity of the LAMP VM. Holds logging/monitoring write access only."

  depends_on = [google_project_service.required]
}

resource "google_project_iam_member" "web" {
  for_each = toset([
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.web.email}"
}

resource "google_compute_instance" "web" {
  name         = "${local.name}-web"
  machine_type = var.machine_type
  zone         = var.zone
  tags         = [local.web_tag, local.ssh_tag]
  labels       = local.common_labels

  # Needed so machine_type / metadata changes don't require a manual stop.
  allow_stopping_for_update = true
  deletion_protection       = var.deletion_protection

  boot_disk {
    auto_delete = true

    initialize_params {
      image  = var.boot_image
      size   = var.boot_disk_size_gb
      type   = var.boot_disk_type
      labels = local.common_labels
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.web.id

    access_config {
      nat_ip       = google_compute_address.web.address
      network_tier = "PREMIUM"
    }
  }

  metadata = {
    # OS Login is disabled because Ansible authenticates with the metadata key below.
    enable-oslogin = "FALSE"
    ssh-keys       = "${var.ssh_user}:${trimspace(file(pathexpand(var.ssh_public_key_path)))}"
  }

  # Ansible does all the real configuration; this only guarantees a Python
  # interpreter exists before the first playbook run.
  metadata_startup_script = <<-SCRIPT
    #!/usr/bin/env bash
    set -euo pipefail
    if ! command -v python3 >/dev/null 2>&1; then
      export DEBIAN_FRONTEND=noninteractive
      apt-get update -qq
      apt-get install -y -qq python3
    fi
  SCRIPT

  service_account {
    email  = google_service_account.web.email
    scopes = ["cloud-platform"]
  }

  shielded_instance_config {
    enable_secure_boot          = true
    enable_vtpm                 = true
    enable_integrity_monitoring = true
  }

  depends_on = [google_project_iam_member.web]
}
