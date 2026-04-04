# Claude Code Podman Sandbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a sandboxed Podman container for running Claude Code against this project with strong filesystem isolation.

**Architecture:** Ubuntu-based container image with Node.js, git, tmux, and Claude Code. A shell script manages the full lifecycle — build, create, start, attach, destroy. Mounts only the project dir and `~/.claude`, drops all capabilities, runs rootless.

**Tech Stack:** Podman (rootless), bash, tmux, Ubuntu 24.04, Node.js LTS

**Spec:** `docs/superpowers/specs/2026-04-04-claude-sandbox-design.md`

---

## File Structure

| File | Responsibility |
|------|---------------|
| `sandbox/Containerfile` | Ubuntu image: Node.js LTS, git, tmux, curl, build-essential, Claude Code |
| `sandbox/sandbox.sh` | Lifecycle script: build, create, start, attach, destroy, rebuild |
| `.gitignore` | Add `.worktrees/` entry |

---

### Task 1: Create the Containerfile

**Files:**
- Create: `sandbox/Containerfile`

- [ ] **Step 1: Create sandbox directory**

```bash
mkdir -p sandbox
```

- [ ] **Step 2: Write the Containerfile**

Create `sandbox/Containerfile`:

```dockerfile
FROM ubuntu:24.04

ARG DEBIAN_FRONTEND=noninteractive

# Install base packages
RUN apt-get update && apt-get install -y \
    curl \
    git \
    tmux \
    build-essential \
    ca-certificates \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js LTS (22.x) via nodesource
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Claude Code globally
RUN npm install -g @anthropic-ai/claude-code

# Create non-root user (UID will be remapped by --userns=keep-id at runtime)
RUN useradd -m -s /bin/bash user

USER user
WORKDIR /workspace
```

- [ ] **Step 3: Build the image to verify it works**

```bash
cd sandbox && podman build -t claude-sandbox .
```

Expected: Image builds successfully, final line shows image ID.

- [ ] **Step 4: Verify Claude Code is installed in the image**

```bash
podman run --rm claude-sandbox claude --version
```

Expected: Prints Claude Code version number.

- [ ] **Step 5: Commit**

```bash
git add sandbox/Containerfile
git commit -m "feat: add Containerfile for Claude Code sandbox

Ubuntu 24.04 with Node.js 22, git, tmux, and Claude Code."
```

---

### Task 2: Write the sandbox.sh lifecycle script

**Files:**
- Create: `sandbox/sandbox.sh`

- [ ] **Step 1: Write sandbox.sh**

Create `sandbox/sandbox.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

# --- Config ---
IMAGE_NAME="claude-sandbox"
CONTAINER_NAME="claude-sandbox"
TMUX_SESSION="claude"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CLAUDE_DIR="$HOME/.claude"

# --- Colors ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[sandbox]${NC} $*"; }
warn()  { echo -e "${YELLOW}[sandbox]${NC} $*"; }
error() { echo -e "${RED}[sandbox]${NC} $*" >&2; }

# --- Preflight checks ---
preflight() {
    if ! command -v podman &>/dev/null; then
        error "podman not found. Install it first."
        exit 1
    fi

    if [[ ! -d "$CLAUDE_DIR" ]]; then
        error "~/.claude not found. Run 'claude' on the host first to set up auth."
        exit 1
    fi

    if [[ ! -d "$PROJECT_DIR/.git" ]]; then
        error "Project dir ($PROJECT_DIR) is not a git repository."
        exit 1
    fi
}

# --- Image management ---
image_exists() {
    podman image exists "$IMAGE_NAME" 2>/dev/null
}

build_image() {
    info "Building image '$IMAGE_NAME'..."
    podman build -t "$IMAGE_NAME" "$SCRIPT_DIR"
    info "Image built."
}

# --- Container management ---
container_exists() {
    podman container exists "$CONTAINER_NAME" 2>/dev/null
}

container_running() {
    [[ "$(podman inspect -f '{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null)" == "true" ]]
}

create_container() {
    info "Creating container '$CONTAINER_NAME'..."
    podman create \
        --name "$CONTAINER_NAME" \
        --userns=keep-id \
        --cap-drop=ALL \
        -v "$PROJECT_DIR:/workspace:Z" \
        -v "$CLAUDE_DIR:/home/user/.claude:Z" \
        -w /workspace \
        -it \
        "$IMAGE_NAME" \
        bash -c "tmux new-session -d -s $TMUX_SESSION; sleep infinity"
    info "Container created."
}

start_container() {
    info "Starting container '$CONTAINER_NAME'..."
    podman start "$CONTAINER_NAME"
    # Give tmux a moment to initialize
    sleep 1
    info "Container started."
}

attach_tmux() {
    info "Attaching to tmux session '$TMUX_SESSION'..."
    podman exec -it "$CONTAINER_NAME" tmux attach-session -t "$TMUX_SESSION"
}

# --- Commands ---
cmd_start() {
    preflight

    if ! image_exists; then
        build_image
    fi

    if ! container_exists; then
        create_container
    fi

    if ! container_running; then
        start_container
    fi

    attach_tmux
}

cmd_destroy() {
    info "Destroying container '$CONTAINER_NAME'..."
    podman rm -f "$CONTAINER_NAME" 2>/dev/null || true
    info "Container destroyed."
}

cmd_rebuild() {
    cmd_destroy
    info "Removing image '$IMAGE_NAME'..."
    podman rmi -f "$IMAGE_NAME" 2>/dev/null || true
    build_image
    create_container
    start_container
    attach_tmux
}

# --- Main ---
case "${1:-}" in
    --destroy)
        cmd_destroy
        ;;
    --rebuild)
        cmd_rebuild
        ;;
    --help|-h)
        echo "Usage: sandbox.sh [--destroy|--rebuild|--help]"
        echo ""
        echo "  (no args)   Build, create, start, and attach to sandbox"
        echo "  --destroy   Stop and remove the sandbox container"
        echo "  --rebuild   Destroy, rebuild image, and start fresh"
        echo "  --help      Show this help"
        ;;
    "")
        cmd_start
        ;;
    *)
        error "Unknown option: $1"
        echo "Usage: sandbox.sh [--destroy|--rebuild|--help]"
        exit 1
        ;;
esac
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x sandbox/sandbox.sh
```

- [ ] **Step 3: Verify the script parses correctly**

```bash
bash -n sandbox/sandbox.sh
```

Expected: No output (clean parse).

- [ ] **Step 4: Test --help flag**

```bash
sandbox/sandbox.sh --help
```

Expected: Prints usage info.

- [ ] **Step 5: Commit**

```bash
git add sandbox/sandbox.sh
git commit -m "feat: add sandbox.sh lifecycle script

Manages build, create, start, attach, destroy, and rebuild of the
Claude Code sandbox container."
```

---

### Task 3: Update .gitignore for worktrees

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Add .worktrees/ to .gitignore**

Append to the end of `.gitignore`:

```
# Sandbox worktrees
.worktrees/
```

- [ ] **Step 2: Verify the entry is present**

```bash
grep -n "worktrees" .gitignore
```

Expected: Shows the `.worktrees/` line.

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore .worktrees/ for sandbox worktrees"
```

---

### Task 4: End-to-end smoke test

**Files:**
- None (testing only)

- [ ] **Step 1: Clean slate — destroy any existing sandbox**

```bash
sandbox/sandbox.sh --destroy
podman rmi -f claude-sandbox 2>/dev/null || true
```

- [ ] **Step 2: Run sandbox.sh from scratch**

```bash
sandbox/sandbox.sh
```

Expected: Builds image, creates container, starts it, attaches to tmux session. You should see a tmux prompt inside the container.

- [ ] **Step 3: Verify you're in the right place (inside tmux)**

```bash
pwd
```

Expected: `/workspace`

```bash
ls -la
```

Expected: Project files visible (Containerfile won't be there — that's in sandbox/ which is part of the project mount, so it will be there at `/workspace/sandbox/`).

- [ ] **Step 4: Verify Claude Code works (inside tmux)**

```bash
claude --version
```

Expected: Prints version.

- [ ] **Step 5: Verify git works (inside tmux)**

```bash
git status
git log --oneline -3
```

Expected: Shows current branch status and recent commits.

- [ ] **Step 6: Verify ~/.claude is mounted (inside tmux)**

```bash
ls ~/.claude
```

Expected: Shows Claude config files (auth, memory, etc.).

- [ ] **Step 7: Verify isolation — host home is NOT accessible (inside tmux)**

```bash
ls /home/user/
```

Expected: Only `.claude` is visible (from the mount). No Desktop, Documents, Downloads, etc.

```bash
cat /home/user/.ssh/id_rsa 2>&1
```

Expected: "No such file or directory"

- [ ] **Step 8: Test detach/reattach**

Press `Ctrl-b d` to detach from tmux. You should be back on the host.

Then reattach:

```bash
sandbox/sandbox.sh
```

Expected: Reattaches to the existing tmux session without rebuilding.

- [ ] **Step 9: Test git worktree creation (inside tmux)**

```bash
git worktree add .worktrees/test-branch -b test-branch
ls .worktrees/test-branch/
git worktree remove .worktrees/test-branch
```

Expected: Worktree created and removed successfully.

- [ ] **Step 10: Clean up**

```bash
sandbox/sandbox.sh --destroy
```

Expected: Container removed.

---

### Task 5: Test --rebuild flag

**Files:**
- None (testing only)

- [ ] **Step 1: Build and start normally**

```bash
sandbox/sandbox.sh
```

Detach with `Ctrl-b d`.

- [ ] **Step 2: Rebuild from scratch**

```bash
sandbox/sandbox.sh --rebuild
```

Expected: Destroys old container, removes old image, builds fresh image, creates new container, starts it, attaches to tmux. Clean slate.

- [ ] **Step 3: Detach and destroy**

Press `Ctrl-b d`, then:

```bash
sandbox/sandbox.sh --destroy
```
