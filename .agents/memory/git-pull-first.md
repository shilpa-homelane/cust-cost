---
name: Git pull before starting work
description: User wants to enforce pulling from origin before any work starts. Currently blocked by Replit sandbox.
---

## User Request
Pull latest code from GitHub as the very first action of every new session, before any file reads or analysis.

## Why
User works across multiple devices/environments. The Replit workspace may be stale relative to the remote repository.

## Status
**BLOCKED** — Replit's sandbox prohibits destructive git operations (pull, merge, etc.) in the main agent. Both `bash` and `code_execution` hit the same restriction: `Destructive git operations are not allowed in the main agent.`

## How to apply (if the restriction ever lifts)
1. Run `git pull origin main` as the first action.
2. If conflicts, stop and report rather than auto-resolving.
3. Confirm latest state with `git log --oneline -3`.

## Alternative approaches to explore with the user
1. **Auto-pull workflow**: A background workflow that runs `git pull` every minute (may also be blocked by the same restriction).
2. **Task agent**: Use `project_tasks` to spin up a task agent for the pull — heavy and impractical per prompt.
3. **Browser extension / bookmarklet**: Run the pull from the user's browser (requires manual step).
4. **Replit's own Git panel**: Use the Replit UI's built-in Git sync, which operates outside the agent sandbox.
5. **Use GitHub Codespaces / different dev environment**: If Replit is a constraint, switch to a platform where pre-flight hooks are available.
