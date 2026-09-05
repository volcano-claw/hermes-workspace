#!/bin/bash
set -e

WORKSPACE_USER=workspace
WORKSPACE_GROUP=workspace
WORKSPACE_HOME="$(getent passwd "$WORKSPACE_USER" | cut -d: -f6)"
TARGET_UID="${HERMES_UID:-}"
TARGET_GID="${HERMES_GID:-}"
JARVIS_BRIDGE_GID="${JARVIS_BRIDGE_GID:-}"

fix_owner_if_needed() {
  local path="$1"
  if [ ! -e "$path" ]; then
    return
  fi

  local actual_uid
  actual_uid=$(id -u "$WORKSPACE_USER")
  local current_uid
  current_uid=$(stat -c %u "$path" 2>/dev/null || true)
  if [ -n "$current_uid" ] && [ "$current_uid" != "$actual_uid" ]; then
    chown -R "$WORKSPACE_USER:$WORKSPACE_GROUP" "$path" 2>/dev/null || \
      echo "Warning: chown failed for $path (rootless container or restricted mount?) — continuing anyway"
  fi
}

if [ "$(id -u)" = "0" ]; then
  current_uid=$(id -u "$WORKSPACE_USER")
  current_gid=$(id -g "$WORKSPACE_USER")

  if [ -n "$TARGET_GID" ] && [ "$TARGET_GID" != "$current_gid" ]; then
    echo "Changing workspace GID to $TARGET_GID"
    groupmod -o -g "$TARGET_GID" "$WORKSPACE_GROUP" 2>/dev/null || true
  fi

  if [ -n "$TARGET_UID" ] && [ "$TARGET_UID" != "$current_uid" ]; then
    echo "Changing workspace UID to $TARGET_UID"
    usermod -o -u "$TARGET_UID" "$WORKSPACE_USER"
  fi

  if [ -n "$JARVIS_BRIDGE_GID" ]; then
    # local fork carry: gosu drops Docker group_add-only supplemental groups
    # when invoked as user:group below. Materialize the Jarvis bridge GID in
    # /etc/group so the unprivileged app process can read the read-only sibling
    # mounts instead of showing an empty-but-online Jarvis panel.
    if ! getent group "$JARVIS_BRIDGE_GID" >/dev/null; then
      groupadd -g "$JARVIS_BRIDGE_GID" jarvisbridge 2>/dev/null || true
    fi
    usermod -aG "$JARVIS_BRIDGE_GID" "$WORKSPACE_USER" 2>/dev/null || true
  fi

  mkdir -p "$WORKSPACE_HOME/.hermes" /workspace
  fix_owner_if_needed "$WORKSPACE_HOME"
  fix_owner_if_needed /workspace

  echo "Dropping root privileges"
  exec gosu "$WORKSPACE_USER" "$0" "$@"
fi

exec "$@"
