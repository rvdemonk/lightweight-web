#!/bin/bash
set -e

REMOTE=root@170.64.189.221
TARGET=x86_64-unknown-linux-gnu

export PATH="$HOME/.nvm/versions/node/$(ls "$HOME/.nvm/versions/node" | tail -1)/bin:$PATH"

echo "Building frontend..."
cd frontend && npm ci && npm run build && cd ..

echo "Cross-compiling for $TARGET..."
cargo zigbuild --release -p lightweight-server -p lightweight-admin --target $TARGET

echo "Backing up production database..."
BACKUP_DIR="backups/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/lightweight.db.pre-deploy-$(date +%H%M%S)"

# Checkpoint WAL before stopping (captures all in-flight data)
ssh $REMOTE "sqlite3 /var/www/lightweight/data/lightweight.db 'PRAGMA wal_checkpoint(TRUNCATE);'"
ssh $REMOTE "systemctl stop lightweight"
scp "$REMOTE:/var/www/lightweight/data/lightweight.db" "$BACKUP_FILE"

# Verify backup before proceeding with deploy
INTEGRITY=$(sqlite3 "$BACKUP_FILE" "PRAGMA integrity_check;" 2>&1)
if [ "$INTEGRITY" != "ok" ]; then
  echo "BACKUP INTEGRITY CHECK FAILED — aborting deploy"
  ssh $REMOTE "systemctl start lightweight"
  exit 1
fi
SESSIONS=$(sqlite3 "$BACKUP_FILE" "SELECT COUNT(*) FROM sessions;")
echo "Backup saved: $BACKUP_FILE (integrity: ok, $SESSIONS sessions)"

echo "Deploying to droplet..."
scp target/$TARGET/release/lightweight-server target/$TARGET/release/lw-admin $REMOTE:/var/www/lightweight/
scp migrations/*.sql $REMOTE:/var/www/lightweight/migrations/

echo "Starting service..."
ssh $REMOTE "systemctl start lightweight"

echo "Deployed to https://lightweight.3rigby.xyz"
