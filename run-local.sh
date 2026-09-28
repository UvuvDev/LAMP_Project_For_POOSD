#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
DOCKER=(sudo docker)

NETWORK_NAME="lamp-dev"
DB_CONTAINER="lamp-db"
WEB_CONTAINER="lamp-web"
DB_IMAGE="mariadb:11"
WEB_IMAGE="php:8.2-apache"

DB_NAME="ContactsAppDB"
DB_USER="ContactsAppUser"
DB_ROOT_PASSWORD="${LAMP_DB_ROOT_PASSWORD:-local-root-password}"
DB_PASSWORD="${LAMP_DB_PASSWORD:-local-app-password}"
WEB_PORT="${LAMP_WEB_PORT:-8080}"

usage() {
  cat <<'EOF'
Usage: ./run-local.sh <command>

Commands:
  start   Start MariaDB, load sample data, and start Apache/PHP
  test    Lint PHP and smoke-test login and the admin API
  logs    Follow Apache/PHP logs
  status  Show the local containers
  stop    Remove the local containers and network, preserving images
  clean   Stop everything and remove the downloaded images

Optional environment variables:
  LAMP_WEB_PORT          Web port (default: 8080)
  LAMP_DB_ROOT_PASSWORD  Local MariaDB root password
  LAMP_DB_PASSWORD       Local application database password
EOF
}

require_commands() {
  for command_name in docker curl; do
    if ! command -v "$command_name" >/dev/null 2>&1; then
      echo "Required command not found: $command_name" >&2
      exit 1
    fi
  done

  for required_file in create_schema.sql sample_data.sql index.html; do
    if [[ ! -f "$PROJECT_DIR/$required_file" ]]; then
      echo "Required project file not found: $PROJECT_DIR/$required_file" >&2
      exit 1
    fi
  done
}

docker_login() {
  echo "Requesting sudo access for Docker..."
  sudo -v
  "${DOCKER[@]}" info >/dev/null
}

container_exists() {
  "${DOCKER[@]}" container inspect "$1" >/dev/null 2>&1
}

network_exists() {
  "${DOCKER[@]}" network inspect "$NETWORK_NAME" >/dev/null 2>&1
}

wait_for_database() {
  echo "Waiting for MariaDB..."
  for _attempt in $(seq 1 60); do
    if "${DOCKER[@]}" exec "$DB_CONTAINER" \
      mariadb -uroot --password="$DB_ROOT_PASSWORD" \
      --execute='SELECT 1' >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done

  echo "MariaDB did not become ready." >&2
  "${DOCKER[@]}" logs "$DB_CONTAINER" >&2 || true
  return 1
}

wait_for_website() {
  echo "Waiting for Apache/PHP (the first PDO build can take a minute)..."
  for _attempt in $(seq 1 120); do
    if curl --silent --fail "http://127.0.0.1:${WEB_PORT}/index.html" >/dev/null; then
      return 0
    fi

    if ! "${DOCKER[@]}" inspect -f '{{.State.Running}}' "$WEB_CONTAINER" 2>/dev/null | grep -q true; then
      echo "The web container stopped during startup." >&2
      "${DOCKER[@]}" logs "$WEB_CONTAINER" >&2 || true
      return 1
    fi
    sleep 2
  done

  echo "The website did not become ready." >&2
  "${DOCKER[@]}" logs "$WEB_CONTAINER" >&2 || true
  return 1
}

start_stack() {
  require_commands
  docker_login

  if container_exists "$DB_CONTAINER" || container_exists "$WEB_CONTAINER"; then
    echo "A local LAMP container already exists. Run './run-local.sh stop' first." >&2
    exit 1
  fi

  if ! network_exists; then
    "${DOCKER[@]}" network create "$NETWORK_NAME" >/dev/null
  fi

  echo "Starting MariaDB..."
  "${DOCKER[@]}" run -d \
    --name "$DB_CONTAINER" \
    --network "$NETWORK_NAME" \
    -e MARIADB_ROOT_PASSWORD="$DB_ROOT_PASSWORD" \
    -e MARIADB_DATABASE="$DB_NAME" \
    -e MARIADB_USER="$DB_USER" \
    -e MARIADB_PASSWORD="$DB_PASSWORD" \
    "$DB_IMAGE" >/dev/null

  wait_for_database

  echo "Loading the schema and sample data..."
  "${DOCKER[@]}" exec -i "$DB_CONTAINER" \
    mariadb -uroot --password="$DB_ROOT_PASSWORD" \
    < "$PROJECT_DIR/create_schema.sql"
  "${DOCKER[@]}" exec -i "$DB_CONTAINER" \
    mariadb -uroot --password="$DB_ROOT_PASSWORD" \
    < "$PROJECT_DIR/sample_data.sql"

  # The sample data contains no administrator, so promote its first demo user.
  "${DOCKER[@]}" exec "$DB_CONTAINER" \
    mariadb -uroot --password="$DB_ROOT_PASSWORD" "$DB_NAME" \
    -e "UPDATE Users SET Role = 'admin' WHERE Username = 'ARoss';"

  echo "Starting Apache/PHP..."
  "${DOCKER[@]}" run -d \
    --name "$WEB_CONTAINER" \
    --network "$NETWORK_NAME" \
    -p "${WEB_PORT}:80" \
    -v "$PROJECT_DIR:/var/www/html:ro,Z" \
    -e DB_HOST="$DB_CONTAINER" \
    -e DB_NAME="$DB_NAME" \
    -e DB_USER="$DB_USER" \
    -e DB_PASSWORD="$DB_PASSWORD" \
    "$WEB_IMAGE" \
    sh -c 'docker-php-ext-install pdo_mysql && apache2-foreground' >/dev/null

  wait_for_website

  cat <<EOF

Website ready: http://localhost:${WEB_PORT}
Admin page:    http://localhost:${WEB_PORT}/admin.html

Demo administrator:
  Username: ARoss
  Password: DemoPass

Run './run-local.sh test' to check PHP, login, and the admin API.
Run './run-local.sh logs' to follow server logs.
EOF
}

test_stack() {
  require_commands
  docker_login

  if ! container_exists "$WEB_CONTAINER"; then
    echo "The website is not running. Run './run-local.sh start' first." >&2
    exit 1
  fi

  echo "Linting PHP files..."
  "${DOCKER[@]}" exec "$WEB_CONTAINER" sh -c \
    'set -eu; for file in /var/www/html/api/*.php; do php -l "$file"; done'

  echo "Testing administrator login..."
  login_response="$(curl --silent --show-error --fail \
    "http://127.0.0.1:${WEB_PORT}/api/login.php" \
    -H 'Content-Type: application/json' \
    --data '{"username":"ARoss","password":"DemoPass"}')"

  session_token="$(printf '%s' "$login_response" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')"
  if [[ -z "$session_token" ]]; then
    echo "Login succeeded but did not return a session token." >&2
    exit 1
  fi

  echo "Testing the protected admin endpoint..."
  admin_response="$(curl --silent --show-error --fail \
    "http://127.0.0.1:${WEB_PORT}/api/admin.php" \
    -H "Authorization: Bearer $session_token")"

  if [[ "$admin_response" != *'"users"'* ]]; then
    echo "The admin endpoint did not return a user list." >&2
    exit 1
  fi

  echo "All PHP and admin API checks passed."
}

show_logs() {
  docker_login
  "${DOCKER[@]}" logs -f "$WEB_CONTAINER"
}

show_status() {
  docker_login
  "${DOCKER[@]}" ps -a \
    --filter "name=^/${DB_CONTAINER}$" \
    --filter "name=^/${WEB_CONTAINER}$"
}

stop_stack() {
  docker_login

  for container_name in "$WEB_CONTAINER" "$DB_CONTAINER"; do
    if container_exists "$container_name"; then
      "${DOCKER[@]}" rm -f "$container_name" >/dev/null
      echo "Removed container: $container_name"
    fi
  done

  if network_exists; then
    "${DOCKER[@]}" network rm "$NETWORK_NAME" >/dev/null
    echo "Removed network: $NETWORK_NAME"
  fi
}

clean_stack() {
  stop_stack

  for image_name in "$WEB_IMAGE" "$DB_IMAGE"; do
    if "${DOCKER[@]}" image inspect "$image_name" >/dev/null 2>&1; then
      if "${DOCKER[@]}" image rm "$image_name" >/dev/null; then
        echo "Removed image: $image_name"
      else
        echo "Could not remove $image_name because another container uses it." >&2
      fi
    fi
  done
}

case "${1:-}" in
  start)
    start_stack
    ;;
  test)
    test_stack
    ;;
  logs)
    show_logs
    ;;
  status)
    show_status
    ;;
  stop)
    stop_stack
    ;;
  clean)
    clean_stack
    ;;
  *)
    usage
    exit 1
    ;;
esac
