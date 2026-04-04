# Claude Code Podman Sandbox — Design Spec

## Purpose

Provide a sandboxed environment for running Claude Code (and other AI coding agents) against this project, with strong filesystem isolation. The agent can do anything it wants inside the sandbox — install packages, run builds, create git worktrees — but cannot access host files outside the project directory and `~/.claude`.

## Requirements

- Agent has read-write access to the project directory and `~/.claude` only
- No access to host home directory, SSH keys, or other config
- No ability to push to git remotes
- Git commits and worktrees work normally
- Claude Code auth works via mounted `~/.claude`
- tmux session inside the container for detach/reattach
- Single script to build, start, and reconnect
- Ubuntu-based image
- Rootless Podman with defense-in-depth

## Architecture

### Container Image (Containerfile)

Base: `ubuntu:24.04`

Installed packages:
- Node.js LTS (via nodesource)
- git
- tmux
- curl
- build-essential (for native Node modules)
- Claude Code (`npm install -g @anthropic-ai/claude-code`)

A non-root user is created inside the container. `--userns=keep-id` maps the host UID at runtime so file ownership is consistent on both sides.

### Mounts

| Host path | Container path | Mode | Purpose |
|-----------|---------------|------|---------|
| Project dir (CWD's git root) | `/workspace` | read-write | Code, git, worktrees |
| `~/.claude` | `/home/user/.claude` | read-write | Auth, memory, project config |

Nothing else from the host is mounted. The agent cannot see `~`, `~/.ssh`, `~/.config`, `~/.gnupg`, or any other host files.

### Security Layers

| Layer | What it provides |
|-------|-----------------|
| **Mount namespace** | Only explicitly mounted paths are visible |
| **User namespace** (rootless Podman) | Container "root" maps to unprivileged host user |
| **`--cap-drop=ALL`** | All Linux capabilities dropped |
| **SELinux** (`:Z` label) | Mounts get `container_t` labels; host files remain inaccessible even on escape |
| **Seccomp** (Podman default) | Dangerous syscalls (`mount`, `ptrace`, etc.) blocked |
| **No SSH/credentials** | No keys mounted — `git push` fails by design |

### Network

Full internet access (default). The agent needs outbound connectivity for:
- Anthropic API (Claude Code)
- Package registries (npm, apt)

Network lockdown (outbound filtering) is out of scope for v1 but could be layered on later.

### Git Worktrees

Worktrees are created inside the project mount at `/workspace/.worktrees/`. This path is added to `.gitignore` so worktrees don't pollute the repo.

## File Layout

```
sequence-diagram-visualizer/
├── sandbox/
│   ├── Containerfile          # Ubuntu image with dev tools + Claude Code
│   └── sandbox.sh             # Build, start, attach, destroy
└── .gitignore                 # Add .worktrees/ entry
```

All sandbox infrastructure lives in `sandbox/`. No files at project root.

## Script UX (sandbox/sandbox.sh)

### Commands

- `sandbox.sh` (no args) — default flow: build image if missing, create container if missing, start if stopped, attach to tmux
- `sandbox.sh --destroy` — stop and remove the container
- `sandbox.sh --rebuild` — destroy + rebuild image + create fresh container

### Lifecycle

```
First run:
  1. Build image "claude-sandbox" (if not present)
  2. Create named container "claude-sandbox"
  3. Start container
  4. Launch tmux session "claude" inside container
  5. Attach to tmux

Subsequent runs:
  - Container stopped → start, reattach to tmux
  - Container running, detached → reattach to tmux
  - Container running, attached elsewhere → force-attach (tmux steals session)
```

### Inside the Container

- Working directory: `/workspace`
- tmux session name: `claude`
- Run `claude` to start Claude Code
- Detach with `Ctrl-b d` — container and Claude Code keep running
- Standard tmux usage for splits, windows, etc.

### Container Naming

Container name: `claude-sandbox`
Image name: `claude-sandbox`

## Podman Run Flags

```
podman run -d \
  --name claude-sandbox \
  --userns=keep-id \
  --cap-drop=ALL \
  -v <project-dir>:/workspace:Z \
  -v ~/.claude:/home/user/.claude:Z \
  -w /workspace \
  claude-sandbox \
  bash -c "tmux new-session -d -s claude && sleep infinity"
```

Key flags:
- `-d` — detached, runs in background
- `--userns=keep-id` — UID mapping
- `--cap-drop=ALL` — maximum capability restriction
- `:Z` — SELinux relabeling for container access
- `sleep infinity` — keeps container alive after tmux starts

## Out of Scope (v1)

- Network filtering / outbound restrictions
- Multiple project support (currently one container per project)
- GPU passthrough
- VS Code devcontainer integration
- Automatic Claude Code updates inside running containers
