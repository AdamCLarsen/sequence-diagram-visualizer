# Claude Code Sandbox

Run Claude Code in an isolated Podman container. The agent gets full access to the project directory and your Claude config, but cannot see or touch anything else on your system.

## Prerequisites

- [Podman](https://podman.io/) (rootless) - pre-installed on Bazzite/Fedora Atomic
- `~/.claude` directory (run `claude` on the host once to set up auth)

## Usage

```bash
# Start the sandbox (builds image on first run)
sandbox/sandbox.sh

# Inside the container, start Claude Code
claude

# Detach from tmux without stopping anything
# Press: Ctrl-b d

# Reattach to a running sandbox
sandbox/sandbox.sh

# Tear down the container
sandbox/sandbox.sh --destroy

# Full rebuild (new image + new container)
sandbox/sandbox.sh --rebuild
```

## What's mounted

| Host | Container | Access |
|------|-----------|--------|
| Project directory | `/workspace` | read-write |
| `~/.claude` | `~/.claude` | read-write |

Everything else on your host is invisible to the container.

## What's NOT accessible

- Home directory (`~`)
- SSH keys (`~/.ssh`) - git push will fail by design
- GPG keys (`~/.gnupg`)
- Any other config or files

## Security layers

- **Rootless Podman** - container "root" maps to your unprivileged user
- **`--cap-drop=ALL`** - all Linux capabilities dropped
- **SELinux** (`:Z` labels) - mounts get container-specific labels
- **Seccomp** - dangerous syscalls blocked by Podman's default profile
- **No credentials** - no SSH/GPG keys, no remote push

## tmux basics

The sandbox runs inside a tmux session so you can disconnect and reconnect without losing your work.

| Key | Action |
|-----|--------|
| `Ctrl-b d` | Detach (sandbox keeps running) |
| `Ctrl-b c` | New window |
| `Ctrl-b n` / `Ctrl-b p` | Next / previous window |
| `Ctrl-b %` | Split pane vertically |
| `Ctrl-b "` | Split pane horizontally |
| `Ctrl-b arrow` | Switch panes |

## Git worktrees

Worktrees are created at `.worktrees/` in the project root (gitignored). Inside the container:

```bash
git worktree add .worktrees/my-feature -b my-feature
```

## Troubleshooting

**Container won't start:** Run `sandbox/sandbox.sh --rebuild` to start fresh.

**Permission errors on mounted files:** The `:Z` SELinux label should handle this. If not, check `podman unshare` or run `restorecon -R` on the project directory.

**Claude Code auth fails:** Make sure you've run `claude` on the host first. Your `~/.claude` directory needs to exist with valid auth tokens.

**Stale container state:** `sandbox/sandbox.sh --destroy` then re-run `sandbox/sandbox.sh`.
