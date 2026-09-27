locals {
  ansible_inventory = templatefile("${path.module}/templates/hosts.ini.tftpl", {
    instance_name        = google_compute_instance.web.name
    public_ip            = google_compute_address.web.address
    ssh_user             = var.ssh_user
    ssh_private_key_path = pathexpand(var.ssh_private_key_path)
    project_id           = var.project_id
    zone                 = var.zone
  })
}

resource "local_file" "ansible_inventory" {
  filename        = "${path.module}/${var.ansible_inventory_path}"
  content         = local.ansible_inventory
  file_permission = "0644"
}
