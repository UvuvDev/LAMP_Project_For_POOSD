# LAMP on GCP -- Terraform provisions, Ansible configures.
SHELL := /bin/bash
TF    := terraform -chdir=terraform
AP    := ansible-playbook
TFVARS := terraform/terraform.tfvars
VAULT  := ansible/group_vars/vault.yml

.DEFAULT_GOAL := help
.PHONY: help init fmt validate plan apply destroy output url ssh secrets deps provision deploy check lint up clean

help: ## Show this help
	@grep -hE '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN{FS=":.*?## "}{printf "  \033[1m%-12s\033[0m %s\n", $$1, $$2}'

$(TFVARS):
	@echo "terraform/terraform.tfvars is missing. Copy the example and edit it:"; \
	echo "  cp terraform/terraform.tfvars.example $(TFVARS)"; exit 1

$(VAULT):
	@echo "$(VAULT) is missing. Generate one with:"; echo "  make secrets"; exit 1

init: ## Download Terraform providers
	$(TF) init -input=false

fmt: ## Rewrite Terraform files in canonical style
	$(TF) fmt -recursive

validate: init ## Validate the Terraform configuration
	$(TF) validate

plan: $(TFVARS) ## Show what Terraform would change
	$(TF) plan -input=false

apply: $(TFVARS) ## Create/update the infrastructure and render the Ansible inventory
	$(TF) apply -input=false -auto-approve

destroy: $(TFVARS) ## Tear everything down
	$(TF) destroy -input=false

output: ## Print the Terraform outputs
	$(TF) output

url: ## Print the site URL
	@$(TF) output -raw site_url && echo

ssh: ## SSH into the web VM
	@eval "$$($(TF) output -raw ssh_command)"

secrets: ## Generate ansible/group_vars/vault.yml with a random DB password
	@if [ -f $(VAULT) ]; then echo "$(VAULT) already exists; leaving it alone."; else \
	  printf -- '---\n# Encrypt me: ansible-vault encrypt %s\nvault_db_password: "%s"\n' \
	    "$(VAULT)" "$$(openssl rand -base64 24)" > $(VAULT); \
	  chmod 600 $(VAULT); echo "Wrote $(VAULT) (gitignored). Encrypt it with: ansible-vault encrypt $(VAULT)"; \
	fi

deps: ## Install the required Ansible collections
	cd ansible && ansible-galaxy collection install -r requirements.yml

provision: $(VAULT) ## Configure the server with Ansible
	cd ansible && $(AP) site.yml

deploy: $(VAULT) ## Push app code changes only (fast -- skips the server setup)
	cd ansible && $(AP) site.yml -t app

check: $(VAULT) ## Ansible dry run (no changes applied)
	cd ansible && $(AP) site.yml --check --diff

lint: ## Format check + Ansible syntax/lint
	$(TF) fmt -check -recursive
	$(TF) validate
	cd ansible && $(AP) site.yml --syntax-check
	cd ansible && command -v ansible-lint >/dev/null && ansible-lint || echo "ansible-lint not installed; skipped"

up: apply deps provision url ## Full build: infrastructure, then configuration

clean: ## Remove generated local files (never touches the cloud)
	rm -f ansible/inventory/hosts.ini
