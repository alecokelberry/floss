#!/usr/bin/env bash
# PostToolUse on Edit/Write: formats and lint-fixes the file Claude just wrote, so style never needs a thought.
# Quiet and never blocking: real problems surface in the Stop hook (check.sh).
file=$(jq -r '.tool_input.file_path // empty')
[ -n "$file" ] && [ -f "$file" ] || exit 0
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
case "$file" in
  *.ts | *.tsx | *.js | *.jsx | *.mjs | *.cjs)
    pnpm exec oxfmt --no-error-on-unmatched-pattern "$file" >/dev/null 2>&1
    pnpm exec oxlint --fix "$file" >/dev/null 2>&1 ;;
  *.json | *.jsonc | *.css | *.md | *.yml | *.yaml)
    pnpm exec oxfmt --no-error-on-unmatched-pattern "$file" >/dev/null 2>&1 ;;
esac
exit 0
