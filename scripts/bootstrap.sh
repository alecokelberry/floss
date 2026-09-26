#!/usr/bin/env bash
# `pnpm bootstrap`: gets the app running on a Mac with Postgres.app. Safe to run again: it makes sure of the
# dependencies, .env.local, the database, its migrations and seed, and the browser for the e2e tests.
set -euo pipefail
cd "$(dirname "$0")/.."

PG_BIN=/Applications/Postgres.app/Contents/Versions/latest/bin
LOG=$(mktemp -t bootstrap)
die() { echo "✗ $*" >&2; exit 1; }
step() { echo "→ $*"; }
# Runs a command with its output in the log; on failure shows the end of it and stops
run() { "$@" >>"$LOG" 2>&1 || { tail -30 "$LOG" >&2; die "failed: $* (full log: $LOG)"; }; }

[[ "$(node -v)" == v24.* ]] || die "Node 24 is required (found $(node -v)); fnm install 24"
command -v pnpm >/dev/null || die "pnpm is required (corepack enable)"
command -v jq >/dev/null || die "jq is required (the Claude Code hooks use it)"
[ -x "$PG_BIN/psql" ] || die "Postgres.app is required (https://postgresapp.com)"
"$PG_BIN/pg_isready" -q || die "Postgres.app isn't running: open it and start the server"

NAME=$(jq -r .name package.json)
DB_NAME="${NAME//-/_}"
PORT=$(jq -r .scripts.dev package.json | grep -oE '[0-9]{4}$')

step "Dependencies"
run pnpm install --frozen-lockfile

step "Environment and database ($DB_NAME)"
[ -f .env.local ] || printf 'BETTER_AUTH_SECRET=%s\n' "$(openssl rand -base64 32)" > .env.local
"$PG_BIN/psql" -d postgres -Atc "select 1 from pg_database where datname = '$DB_NAME'" | grep -q 1 ||
  "$PG_BIN/createdb" "$DB_NAME"
run pnpm db:migrate
run pnpm db:seed

step "Tools"
run pnpm exec next typegen
run pnpm exec playwright install chromium

echo
echo "✓ $NAME is ready: pnpm dev → http://localhost:$PORT"
