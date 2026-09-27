output "instance_name" {
  description = "Name of the LAMP VM."
  value       = google_compute_instance.web.name
}

output "public_ip" {
  description = "Static external IP of the LAMP VM."
  value       = google_compute_address.web.address
}

output "internal_ip" {
  description = "Private IP of the LAMP VM inside the VPC."
  value       = google_compute_instance.web.network_interface[0].network_ip
}

output "site_url" {
  description = "URL serving the sample application."
  value       = "http://${google_compute_address.web.address}/"
}

output "ssh_command" {
  description = "Ready-to-paste SSH command."
  value       = "ssh -i ${pathexpand(var.ssh_private_key_path)} ${var.ssh_user}@${google_compute_address.web.address}"
}

output "service_account_email" {
  description = "Runtime service account attached to the VM."
  value       = google_service_account.web.email
}

output "ansible_inventory" {
  description = "Rendered Ansible inventory (also written to disk)."
  value       = local.ansible_inventory
}
