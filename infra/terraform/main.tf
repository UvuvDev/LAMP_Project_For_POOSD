locals {
  name = "${var.name_prefix}-${var.environment}"

  common_labels = merge(
    {
      environment = var.environment
      stack       = "lamp"
      managed_by  = "terraform"
    },
    var.labels,
  )

  web_tag = "${local.name}-web"
  ssh_tag = "${local.name}-ssh"

  required_apis = [
    "compute.googleapis.com",
    "iam.googleapis.com",
    "oslogin.googleapis.com",
  ]
}

resource "google_project_service" "required" {
  for_each = var.enable_apis ? toset(local.required_apis) : toset([])

  project = var.project_id
  service = each.value

  # Leave the APIs on if the stack is torn down; other workloads may rely on them.
  disable_on_destroy = false
}
