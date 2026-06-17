#!/usr/bin/env bash
# Non-interactive GitHub push — safe to run from cron, hooks, or workflows.
set -e

REMOTE="origin"
BRANCH="main"

if [ -n "$GITHUB_TOKEN" ]; then
  ORIGIN_URL=$(git remote get-url "$REMOTE")
  AUTH_URL=$(echo "$ORIGIN_URL" | sed "s|https://|https://${GITHUB_TOKEN}@|")
  git remote set-url "$REMOTE" "$AUTH_URL"
  cleanup() { git remote set-url "$REMOTE" "$ORIGIN_URL"; }
  trap cleanup EXIT
fi

echo "[auto-push] Staging all changes..."
git add -A

if git diff --cached --quiet; then
  echo "[auto-push] Nothing to commit. Checking for unpushed commits..."
else
  MSG="${AUTO_PUSH_MSG:-Auto-sync $(date '+%Y-%m-%d %H:%M')}"
  git commit -m "$MSG"
fi

LOCAL=$(git rev-parse "@")
REMOTE_REF=$(git rev-parse "@{u}" 2>/dev/null || echo "")

if [ -z "$REMOTE_REF" ] || [ "$LOCAL" != "$REMOTE_REF" ]; then
  echo "[auto-push] Pushing to $REMOTE $BRANCH..."
  git push "$REMOTE" "$BRANCH"
  echo "[auto-push] Done."
else
  echo "[auto-push] Already up to date. Nothing to push."
fi
