# Christmas List Deployment Guide

This guide explains how to deploy the Christmas List application with the API backend on your homelab.

## Architecture

- **Frontend**: Static HTML/CSS/JS files served by Caddy
- **Backend**: FastAPI Python application running in Docker
- **Storage**: JSON file stored on TrueNAS
- **Access**: Both behind Cloudflare Zero Trust

## Deployment Steps

### 1. Deploy the API Backend

#### Option A: Docker Compose (Recommended)

```bash
# Navigate to the API directory
cd /mnt/NAS/apps/caddy/start-page/api

# Create .env file with your password
echo "ADMIN_PASSWORD=your-secure-password-here" > .env

# Build and start the container
docker-compose up -d

# Check logs
docker-compose logs -f
```

#### Option B: Kubernetes/K3s

Create a deployment manifest:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: christmas-api
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: christmas-api
  template:
    metadata:
      labels:
        app: christmas-api
    spec:
      containers:
      - name: api
        image: christmas-wishlist-api:latest
        ports:
        - containerPort: 8000
        env:
        - name: ADMIN_USERNAME
          value: "jake"
        - name: ADMIN_PASSWORD
          valueFrom:
            secretKeyRef:
              name: christmas-api-secret
              key: password
        - name: DATA_FILE
          value: "/data/wishlist.json"
        volumeMounts:
        - name: data
          mountPath: /data
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: christmas-data-pvc
---
apiVersion: v1
kind: Service
metadata:
  name: christmas-api
spec:
  selector:
    app: christmas-api
  ports:
  - port: 8000
    targetPort: 8000
```

### 2. Configure Caddy Reverse Proxy

Add to your Caddyfile:

```
# API endpoint
home.rankin.works {
    # Frontend files
    root * /mnt/NAS/apps/caddy/start-page
    file_server

    # API reverse proxy
    handle /api/* {
        reverse_proxy localhost:8000
    }

    # Handle requests
    handle {
        try_files {path} {path}.html
    }
}
```

Or if using a separate subdomain for the API:

```
christmas-api.rankin.works {
    reverse_proxy localhost:8000
}
```

### 3. Update API Configuration

Edit `christmas-api.js` and `christmas-public-api.js`:

```javascript
// Change this line to your actual domain
const API_BASE_URL = 'https://home.rankin.works';
```

### 4. Deploy Frontend Files

The Woodpecker CI pipeline should automatically deploy when you push to main. If deploying manually:

```bash
cd /mnt/NAS/apps/caddy/start-page
git pull origin main

# Update cache-busting version
VERSION=$(git rev-parse --short HEAD)
sed -i "s/style.css?v=__CACHE_BUST__/style.css?v=$VERSION/" christmas.html
sed -i "s/christmas.css?v=__CACHE_BUST__/christmas.css?v=$VERSION/" christmas.html
sed -i "s/christmas-api.js?v=__CACHE_BUST__/christmas-api.js?v=$VERSION/" christmas.html

# Repeat for christmas-public.html
```

### 5. Test the Deployment

1. **Test API directly**:
   ```bash
   curl https://home.rankin.works/api/wishlist
   ```

2. **Test frontend**:
   - Visit `https://home.rankin.works/christmas.html`
   - Try adding an item (will prompt for password)
   - Visit `https://home.rankin.works/christmas-public.html`
   - Verify item appears

3. **Test authentication**:
   - Try adding item with wrong password
   - Try adding item with correct password

### 6. Migrate Existing Data (Optional)

If you have existing data in localStorage:

1. Open browser console on old christmas.html
2. Run: `JSON.parse(localStorage.getItem('christmasWishlist'))`
3. Copy the JSON output
4. POST each item to the API using the admin credentials

Or create a migration script:

```javascript
// Run this in browser console on the old page
const items = JSON.parse(localStorage.getItem('christmasWishlist')) || [];
const API_URL = 'https://home.rankin.works/api/wishlist';
const credentials = btoa('jake:your-password');

for (const item of items) {
  await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(item)
  });
}
console.log('Migration complete!');
```

## Security Notes

1. **Change default password immediately**
2. **Use strong passwords** (20+ characters recommended)
3. **HTTPS only** - handled by Cloudflare Tunnel
4. **Backup `/data/wishlist.json` regularly**
5. **Consider IP whitelisting** for edit endpoints via Cloudflare

## Troubleshooting

### API not accessible
- Check Docker container is running: `docker ps | grep christmas`
- Check logs: `docker logs christmas-wishlist-api`
- Verify port 8000 is not blocked

### CORS errors
- Verify API_BASE_URL in JS files matches your domain
- Check Caddy is properly proxying /api/* requests

### Authentication failing
- Verify password in .env file
- Check browser console for auth errors
- Try clearing localStorage and refreshing

### Data not persisting
- Check volume mount in docker-compose.yml
- Verify permissions on /data directory
- Check API logs for write errors

## Backup Strategy

Create a backup script:

```bash
#!/bin/bash
# /mnt/NAS/apps/caddy/start-page/backup.sh

BACKUP_DIR="/mnt/NAS/backups/christmas-list"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"
cp /mnt/NAS/apps/caddy/start-page/api/data/wishlist.json "$BACKUP_DIR/wishlist-$DATE.json"

# Keep only last 30 backups
ls -t "$BACKUP_DIR" | tail -n +31 | xargs -I {} rm "$BACKUP_DIR/{}"
```

Add to cron:
```
0 2 * * * /mnt/NAS/apps/caddy/start-page/backup.sh
```

## URLs

- **Private (edit) page**: https://home.rankin.works/christmas.html
- **Public (view only) page**: https://home.rankin.works/christmas-public.html
- **API docs**: https://home.rankin.works/api/docs
- **API health**: https://home.rankin.works/api/

## Next Steps

Consider adding:
- Email notifications when list is updated
- Item claiming feature for gift-givers
- Multiple wishlists (one per person)
- Price tracking from Amazon
- Mobile app using the API
