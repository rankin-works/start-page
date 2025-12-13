#!/bin/bash
# Christmas Wishlist Backup Script
# Backs up the wishlist.json file with timestamp

BACKUP_DIR="/mnt/NAS/backups/christmas-list"
DATE=$(date +%Y%m%d-%H%M%S)
SOURCE_FILE="/mnt/NAS/apps/caddy/start-page/christmas/api/data/wishlist.json"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if source file exists
if [ ! -f "$SOURCE_FILE" ]; then
  echo "Error: Source file not found at $SOURCE_FILE"
  exit 1
fi

# Create backup
cp "$SOURCE_FILE" "$BACKUP_DIR/wishlist-$DATE.json"

# Verify backup was created
if [ $? -eq 0 ]; then
  echo "Backup created successfully: $BACKUP_DIR/wishlist-$DATE.json"
else
  echo "Error: Backup failed"
  exit 1
fi

# Keep only last 30 backups
cd "$BACKUP_DIR"
ls -t wishlist-*.json 2>/dev/null | tail -n +31 | xargs -I {} rm "{}"

echo "Backup complete. Current backups:"
ls -lh "$BACKUP_DIR" | grep wishlist
