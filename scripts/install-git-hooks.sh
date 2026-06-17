#!/usr/bin/env bash
# Installs the post-commit hook so every local commit auto-pushes to GitHub.
set -e

HOOK_DIR="$(git rev-parse --git-dir)/hooks"
HOOK_FILE="$HOOK_DIR/post-commit"

mkdir -p "$HOOK_DIR"

cat > "$HOOK_FILE" <<'EOF'
#!/usr/bin/env bash
# Auto-push to GitHub after every commit.
SCRIPT="$(git rev-parse --show-toplevel)/scripts/auto-push-github.sh"
if [ -f "$SCRIPT" ]; then
  bash "$SCRIPT"
fi
EOF

chmod +x "$HOOK_FILE"
echo "post-commit hook installed at $HOOK_FILE"
