# Christmas List Backup Setup

This guide shows you how to set up automatic backups for your Christmas wishlist.

---

## Manual Backup

To manually backup your wishlist anytime:

```bash
sudo bash /mnt/NAS/apps/caddy/start-page/christmas/backup-christmas-list.sh
```

---

## Automatic Backups (Recommended)

Set up a cron job to backup automatically every day at 2 AM.

### Step 1: Make the script executable

```bash
sudo chmod +x /mnt/NAS/apps/caddy/start-page/christmas/backup-christmas-list.sh
```

### Step 2: Edit root's crontab

```bash
sudo crontab -e
```

### Step 3: Add this line to the crontab

```cron
# Backup Christmas wishlist daily at 2 AM
0 2 * * * /mnt/NAS/apps/caddy/start-page/christmas/backup-christmas-list.sh >> /var/log/christmas-backup.log 2>&1
```

Save and exit the editor.

### Step 4: Verify the cron job

```bash
sudo crontab -l
```

---

## Restore from Backup

If you need to restore your wishlist from a backup:

### Step 1: List available backups

```bash
ls -lh /mnt/NAS/backups/christmas-list/
```

### Step 2: Copy the backup you want to restore

```bash
sudo cp /mnt/NAS/backups/christmas-list/wishlist-YYYYMMDD-HHMMSS.json /mnt/NAS/apps/caddy/start-page/christmas/api/data/wishlist.json
```

Replace `YYYYMMDD-HHMMSS` with the actual timestamp of the backup you want.

### Step 3: Restart the API container

```bash
cd /mnt/NAS/apps/caddy/start-page/christmas/api
docker compose restart
```

### Step 4: Verify the restore

Visit `https://home.rankin.works/christmas/christmas.html` and check if your items are back.

---

## Backup Schedule

- **Frequency**: Daily at 2:00 AM
- **Location**: `/mnt/NAS/backups/christmas-list/`
- **Retention**: Last 30 backups (older ones are automatically deleted)
- **Log**: `/var/log/christmas-backup.log`

---

## Check Backup Logs

To see if backups are running successfully:

```bash
sudo tail -f /var/log/christmas-backup.log
```

---

## One-Time Setup Commands

Quick setup (run these once):

```bash
# Make script executable
sudo chmod +x /mnt/NAS/apps/caddy/start-page/christmas/backup-christmas-list.sh

# Test the backup script
sudo bash /mnt/NAS/apps/caddy/start-page/christmas/backup-christmas-list.sh

# Add to crontab
echo "0 2 * * * /mnt/NAS/apps/caddy/start-page/christmas/backup-christmas-list.sh >> /var/log/christmas-backup.log 2>&1" | sudo crontab -
```

Done! Your wishlist will now be backed up automatically every day.
