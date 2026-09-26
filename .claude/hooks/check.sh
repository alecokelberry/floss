#!/usr/bin/env bash
# Stop hook: before Claude finishes a turn that changed code, the code must typecheck, lint clean, and pass the
# unit tests the changed files reach. Seconds, not the whole suite (that's `pnpm check` and `pnpm test:e2e`).
# Exit 2 hands the failures back to Claude to fix. Skips when nothing changed since the last clean run.
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

input=$(cat)
# Already continuing because of this hook: let the turn end rather than loop
if printf '%s' "$input" | jq -e '.stop_hook_active == true' >/dev/null 2>&1; then exit 0; fi

stamp=.claude/.last-clean-check
changed=$({ git diff --name-only HEAD 2>/dev/null; git ls-files --others --exclude-standard; } | sort -u |
  grep -E '\.(ts|tsx|js|jsx|mjs|cjs)$' | while read -r f; do [ -f "$f" ] && echo "$f"; done)
[ -z "$changed" ] && exit 0
if [ -f "$stamp" ] && [ -z "$(find $changed -newer "$stamp" 2>/dev/null | head -1)" ]; then exit 0; fi

failures=""
out=$(pnpm -s typecheck 2>&1) || failures+=$'\n── typecheck ──\n'"$(tail -30 <<<"$out")"
# shellcheck disable=SC2086
out=$(pnpm -s exec oxlint --deny-warnings $changed 2>&1) || failures+=$'\n── lint ──\n'"$(tail -30 <<<"$out")"
# shellcheck disable=SC2086
out=$(pnpm -s exec vitest related --run --passWithNoTests $changed 2>&1) || failures+=$'\n── unit tests ──\n'"$(tail -40 <<<"$out")"

if [ -n "$failures" ]; then
  echo "Checks failed on the changed files. Fix them, then finish:$failures" >&2
  exit 2
fi
touch "$stamp"
exit 0
