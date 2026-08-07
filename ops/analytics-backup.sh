#!/usr/bin/env bash
set -euo pipefail
umask 077

db=/var/lib/real-estate-calculator/analytics.sqlite
backup_dir=/var/backups/real-estate-calculator/analytics
timestamp=$(date +%Y%m%d-%H%M%S)

install -d -m 0700 "$backup_dir"
if [[ ! -f "$db" ]]; then
  exit 0
fi

backup_file="$backup_dir/analytics-$timestamp.sqlite"
sqlite3 "$db" ".backup '$backup_file'"

mapfile -d '' old_backups < <(
  find "$backup_dir" -maxdepth 1 -type f -name 'analytics-*.sqlite' -printf '%T@ %p\0' |
    sort -z -rn |
    tail -z -n +31 |
    cut -z -d ' ' -f 2-
)
for old_backup in "${old_backups[@]}"; do
  case "$old_backup" in
    "$backup_dir"/analytics-*.sqlite) rm -- "$old_backup" ;;
    *) exit 1 ;;
  esac
done
