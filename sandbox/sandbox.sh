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
