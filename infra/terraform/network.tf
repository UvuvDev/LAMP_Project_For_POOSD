resource "google_compute_network" "vpc" {
  name                            = "${local.name}-vpc"
  auto_create_subnetworks         = false
  routing_mode                    = "REGIONAL"
  delete_default_routes_on_create = false

  depends_on = [google_project_service.required]
}

resource "google_compute_subnetwork" "web" {
  name          = "${local.name}-subnet"
  region        = var.region
  network       = google_compute_network.vpc.id
  ip_cidr_range = var.subnet_cidr

  # Lets the VM reach Google APIs (logging, monitoring) without a public route.
  private_ip_google_access = true

  log_config {
    aggregation_interval = "INTERVAL_10_MIN"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

resource "google_compute_address" "web" {
  name         = "${local.name}-ip"
  region       = var.region
  address_type = "EXTERNAL"
  labels       = local.common_labels
}

resource "google_compute_firewall" "web" {
  name          = "${local.name}-allow-web"
  network       = google_compute_network.vpc.name
  description   = "HTTP/HTTPS to the LAMP web server."
  direction     = "INGRESS"
  priority      = 1000
  source_ranges = var.allowed_web_cidrs
  target_tags   = [local.web_tag]

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }
}

resource "google_compute_firewall" "ssh" {
  name          = "${local.name}-allow-ssh"
  network       = google_compute_network.vpc.name
  description   = "SSH for Ansible provisioning."
  direction     = "INGRESS"
  priority      = 1000
  source_ranges = var.allowed_ssh_cidrs
  target_tags   = [local.ssh_tag]

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }
}

# Everything else from the internet is dropped by the implied deny-ingress rule;
# this rule only exists so denied attempts show up in firewall logs.
resource "google_compute_firewall" "deny_other_ingress" {
  name          = "${local.name}-deny-ingress"
  network       = google_compute_network.vpc.name
  description   = "Explicit logged catch-all deny."
  direction     = "INGRESS"
  priority      = 65000
  source_ranges = ["0.0.0.0/0"]

  deny {
    protocol = "all"
  }

  log_config {
    metadata = "INCLUDE_ALL_METADATA"
  }
}
