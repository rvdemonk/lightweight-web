#!/bin/bash
set -e

# Lightweight production database backup
# Usage: ./backup.sh [label]
# Example: ./backup.sh pre-auth-migration
#
# Checkpoints the WAL on the remote server, stops the server,
# copies the DB, verifies integrity, restarts. Backups stored
# in backups/YYYY-MM-DD/

REMOTE=root@170.64.189.221
REMOTE_DB=/var/www/lightweight/data/lightweight.db
BACKUP_DIR="backups/$(date +%Y-%m-%d)"
LABEL="${1:+.${1}}"
FILENAME="lightweight.db${LABEL}"

mkdir -p "$BACKUP_DIR"

if [ -f "$BACKUP_DIR/$FILENAME" ]; then
  echo "Backup already exists: $BACKUP_DIR/$FILENAME"
  echo "Add a label to differentiate: ./backup.sh my-label"
  exit 1
fi

# Checkpoint WAL while server is still running (safe — SQLite allows concurrent readers)
echo "Checkpointing WAL on remote..."
ssh $REMOTE "sqlite3 '$REMOTE_DB' 'PRAGMA wal_checkpoint(TRUNCATE);'"

# Stop server for a consistent snapshot
echo "Stopping server..."
ssh $REMOTE "systemctl stop lightweight"

echo "Copying database..."
scp "$REMOTE:$REMOTE_DB" "$BACKUP_DIR/$FILENAME"

echo "Restarting server..."
ssh $REMOTE "systemctl start lightweight"

# Verify backup integrity
echo "Verifying backup..."
INTEGRITY=$(sqlite3 "$BACKUP_DIR/$FILENAME" "PRAGMA integrity_check;" 2>&1)
if [ "$INTEGRITY" != "ok" ]; then
  echo "INTEGRITY CHECK FAILED: $INTEGRITY"
  exit 1
fi

USERS=$(sqlite3 "$BACKUP_DIR/$FILENAME" "SELECT COUNT(*) FROM users;")
SESSIONS=$(sqlite3 "$BACKUP_DIR/$FILENAME" "SELECT COUNT(*) FROM sessions;")
SETS=$(sqlite3 "$BACKUP_DIR/$FILENAME" "SELECT COUNT(*) FROM sets;")

SIZE=$(ls -lh "$BACKUP_DIR/$FILENAME" | awk '{print $5}')
echo ""
echo "Backup complete: $BACKUP_DIR/$FILENAME ($SIZE)"
echo "Verified: integrity ok | $USERS users | $SESSIONS sessions | $SETS sets"
echo "All backups:"
find backups -name "*.db*" -exec ls -lh {} \; | awk '{print "  " $NF " (" $5 ")"}'
