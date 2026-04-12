#!/bin/bash
set -e

# Lightweight production database backup
# Usage: ./backup.sh [label]
# Example: ./backup.sh pre-auth-migration
#
# Stops the server to force WAL checkpoint, copies the DB,
# restarts the server. Backups stored in backups/YYYY-MM-DD/

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

echo "Stopping server (forces WAL checkpoint)..."
ssh $REMOTE "systemctl stop lightweight"

echo "Copying database..."
scp "$REMOTE:$REMOTE_DB" "$BACKUP_DIR/$FILENAME"

echo "Restarting server..."
ssh $REMOTE "systemctl start lightweight"

# Show backup info
SIZE=$(ls -lh "$BACKUP_DIR/$FILENAME" | awk '{print $5}')
echo ""
echo "Backup complete: $BACKUP_DIR/$FILENAME ($SIZE)"
echo "All backups:"
find backups -name "*.db*" -exec ls -lh {} \; | awk '{print "  " $NF " (" $5 ")"}'
