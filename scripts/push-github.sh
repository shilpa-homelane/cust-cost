#!/usr/bin/env bash
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

echo "Staging all changes..."
git add -A

if git diff --cached --quiet; then
  echo "Nothing to commit. Pushing any unpushed commits..."
else
  read -r -p "Commit message (leave blank to use 'Update $(date +%Y-%m-%d)'): " MSG
  if [ -z "$MSG" ]; then
    MSG="Update $(date +%Y-%m-%d)"
  fi
  git commit -m "$MSG"
fi

echo "Pushing to $REMOTE $BRANCH..."
git push "$REMOTE" "$BRANCH"
echo "Done."
