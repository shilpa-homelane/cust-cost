#!/bin/bash
set -e
cd frontend && npm install --prefer-offline
# Re-install git hooks so auto-push stays active after merges.
bash "$(git rev-parse --show-toplevel)/scripts/install-git-hooks.sh"
