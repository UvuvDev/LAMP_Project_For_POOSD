variable "project_id" {
  description = "GCP project ID the stack is deployed into."
  type        = string
}

variable "region" {
  description = "GCP region for regional resources (subnet, static IP)."
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone for the web VM. Must be inside var.region."
  type        = string
  default     = "us-central1-a"
}

variable "name_prefix" {
  description = "Prefix applied to every resource name."
  type        = string
  default     = "lamp"

  validation {
    condition     = can(regex("^[a-z]([-a-z0-9]{0,18}[a-z0-9])?$", var.name_prefix))
    error_message = "name_prefix must be 1-20 chars, lowercase letters/digits/hyphens, starting with a letter."
  }
}

variable "environment" {
  description = "Environment label (dev/staging/prod)."
  type        = string
  default     = "dev"
}

variable "enable_apis" {
  description = "Let Terraform enable the required project APIs. Set false if they are already on or you lack serviceusage rights."
  type        = bool
  default     = true
}

variable "subnet_cidr" {
  description = "Primary CIDR range of the subnet hosting the web VM."
  type        = string
  default     = "10.10.0.0/24"
}

variable "machine_type" {
  description = "Compute Engine machine type for the web VM."
  type        = string
  default     = "e2-small"
}

variable "boot_image" {
  description = "Boot image or image family for the web VM."
  type        = string
  default     = "debian-cloud/debian-12"
}

variable "boot_disk_size_gb" {
  description = "Boot disk size in GB."
  type        = number
  default     = 20

  validation {
    condition     = var.boot_disk_size_gb >= 10
    error_message = "boot_disk_size_gb must be at least 10."
  }
}

variable "boot_disk_type" {
  description = "Boot disk type (pd-balanced, pd-ssd, pd-standard)."
  type        = string
  default     = "pd-balanced"
}

variable "ssh_user" {
  description = "Linux user created on the VM and used by Ansible over SSH."
  type        = string
  default     = "deploy"
}

variable "ssh_public_key_path" {
  description = "Path to the public key pushed to instance metadata (e.g. ~/.ssh/id_ed25519.pub)."
  type        = string
  default     = "~/.ssh/id_ed25519.pub"
}

variable "ssh_private_key_path" {
  description = "Path to the matching private key, written into the generated Ansible inventory."
  type        = string
  default     = "~/.ssh/id_ed25519"
}

variable "allowed_ssh_cidrs" {
  description = "Source ranges allowed to reach port 22. Narrow this to your own IP/32."
  type        = list(string)
  default     = ["0.0.0.0/0"]

  validation {
    condition     = length(var.allowed_ssh_cidrs) > 0
    error_message = "allowed_ssh_cidrs must contain at least one range, otherwise Ansible cannot connect."
  }
}

variable "allowed_web_cidrs" {
  description = "Source ranges allowed to reach ports 80/443."
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "labels" {
  description = "Extra labels merged onto every labelable resource."
  type        = map(string)
  default     = {}
}

variable "deletion_protection" {
  description = "Block `terraform destroy` from deleting the VM."
  type        = bool
  default     = false
}

variable "ansible_inventory_path" {
  description = "Where to render the Ansible inventory, relative to the terraform/ directory."
  type        = string
  default     = "../ansible/inventory/hosts.ini"
}
