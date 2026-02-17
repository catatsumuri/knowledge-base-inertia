#!/usr/bin/env bash
set -euo pipefail

log() {
  printf "\n==> %s\n" "$1"
}

run_step() {
  local label="$1"
  shift
  log "$label"
  "$@"
}

run_step "Reset database (migrate:fresh --seed)" php artisan migrate:fresh --seed

run_step "Import Claude best practices (JA)" php artisan markdown:claudecode-best-practices-ja
run_step "Import Mintlify documents" php artisan markdown:mintlify
run_step "Import Inertia v2 (JA)" php artisan markdown:inertia-v2-ja
run_step "Import Kiro CLI documents" php artisan markdown:kiro-cli

log "Done."
