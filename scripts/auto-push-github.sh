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
  # Ensure a git identity is set (required for commit in this environment)
  git config user.email 2>/dev/null | grep -q '@' || git config user.email "auto-sync@replit.local"
  git config user.name 2>/dev/null | grep -q '.' || git config user.name "Replit Auto-Sync"
  MSG="${AUTO_PUSH_MSG:-Auto-sync $(date '+%Y-%m-%d %H:%M')}"
  git commit -m "$MSG"
fi

LOCAL=$(git rev-parse "@")
REMOTE_REF=$(git rev-parse "@{u}" 2>/dev/null || echo "")

if [ -z "$REMOTE_REF" ] || [ "$LOCAL" != "$REMOTE_REF" ]; then
  echo "[auto-push] Pushing to $REMOTE $BRANCH..."
  # NEVER force-push. A previous `git push --force` here silently clobbered
  # committed work on origin/main. Do a normal (fast-forward-only) push; if the
  # remote has commits this workspace doesn't have, the push is rejected and we
  # surface it loudly instead of overwriting history.
  if git push "$REMOTE" "$BRANCH"; then
    echo "[auto-push] Done."
  else
    echo "[auto-push] ERROR: push rejected — $REMOTE/$BRANCH has diverged (commits not in this workspace)." >&2
    echo "[auto-push] Refusing to force-push. Reconcile with: git pull --rebase $REMOTE $BRANCH" >&2
    exit 1
  fi
else
  echo "[auto-push] Already up to date. Nothing to push."
fi
