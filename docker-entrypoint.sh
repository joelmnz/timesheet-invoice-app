#!/bin/sh
set -e

PUID=${PUID:-99}
PGID=${PGID:-100}

if [ "$(id -u)" = "0" ]; then
  echo "Running as root, fixing /data permissions for PUID=$PUID PGID=$PGID"
  
  chown -R "$PUID:$PGID" /data 2>/dev/null || true
  
  echo "Switching to user $PUID:$PGID and starting application..."
  exec su-exec "$PUID:$PGID" "$@"
else
  echo "Running as user $(id -u):$(id -g)"
  exec "$@"
fi
