# Christmas List Reorganization - Deployment Steps

All Christmas files have been moved into the `/christmas/` directory. Follow these steps to complete the deployment.

---

## Step 1: Wait for Woodpecker CI Deployment

Wait for the Woodpecker CI pipeline to complete deploying the new file structure.

Check status at: `https://ci.rankin.works`

---

## Step 2: Update Caddyfile

Edit your Caddyfile to update the API proxy path:

```bash
nano /path/to/your/Caddyfile
```

**Change from:**
```caddy
http://home.rankin.works {
    handle /api/* {
        reverse_proxy 10.0.0.13:8000
    }

    root * /start-page
    file_server
}
```

**Change to:**
```caddy
http://home.rankin.works {
    handle /christmas/api/* {
        reverse_proxy 10.0.0.13:8000
    }

    root * /start-page
    file_server
}
```

**Reload Caddy:**
```bash
docker exec caddy caddy reload --config /etc/caddy/Caddyfile
```

---

## Step 3: Move API Data Directory

The API data directory needs to be moved to the new location:

```bash
sudo -i

# Navigate to the start-page directory
cd /mnt/NAS/apps/caddy/start-page

# Create the new API data directory
mkdir -p christmas/api/data

# Move existing wishlist data (if it exists)
if [ -f api/data/wishlist.json ]; then
  mv api/data/wishlist.json christmas/api/data/wishlist.json
fi

# Move .env file (if it exists)
if [ -f api/.env ]; then
  mv api/.env christmas/api/.env
fi

# Remove old api directory
rm -rf api
```

---

## Step 4: Restart Docker Container

Navigate to the new API directory and restart the container:

```bash
cd /mnt/NAS/apps/caddy/start-page/christmas/api

# Ensure .env exists
if [ ! -f .env ]; then
  echo "ADMIN_PASSWORD=not-needed" > .env
fi

# Ensure data directory exists
mkdir -p data
if [ ! -f data/wishlist.json ]; then
  echo "[]" > data/wishlist.json
fi

# Stop the old container
docker stop christmas-wishlist-api
docker rm christmas-wishlist-api

# Start new container from new location
docker compose up -d

# Verify it's running
docker ps | grep christmas
docker logs christmas-wishlist-api --tail 20
```

---

## Step 5: Update Cloudflare Access Applications

Go to Cloudflare Zero Trust Dashboard → Access → Applications

Update the following applications with new paths:

### Application 1: Christmas List Public
- **Old Path**: `/christmas-public.html`
- **New Path**: `/christmas/christmas-public.html`

### Application 2: Christmas Public JS
- **Old Path**: `/christmas-public-api.js`
- **New Path**: `/christmas/christmas-public-api.js`

### Application 3: Christmas CSS
- **Old Path**: `/christmas.css`
- **New Path**: `/christmas/christmas.css`

### Application 4: Christmas Style CSS (if you created it)
- **Old Path**: `/style.css`
- **New Path**: `/style.css` (NO CHANGE - this is still in root)

### Application 5: Christmas API Public Read
- **Old Path**: `/api/wishlist`
- **New Path**: `/christmas/api/wishlist`

### Application 6: Christmas Assets Folder (if you created it)
- **Old Path**: `/assets/*`
- **New Path**: `/assets/*` (NO CHANGE - this is still in root)

**For each application:**
1. Click the application name
2. Go to "Basic information" tab
3. Update the **Path** field
4. Click "Save application"

---

## Step 6: Test Everything

### Test Private Page (Editing):
1. Visit: `https://home.rankin.works/christmas/christmas.html`
2. You should be prompted to login with Cloudflare Zero Trust
3. Try adding a test item
4. Verify it saves successfully

### Test Public Page (View Only):
1. Visit: `https://home.rankin.works/christmas/christmas-public.html`
2. Should load WITHOUT requiring login
3. Should display all items from your list
4. Should NOT show "Add Item" form or edit buttons

### Test API Directly:
```bash
curl https://home.rankin.works/christmas/api/
curl https://home.rankin.works/christmas/api/wishlist
```

Both should return valid JSON responses.

---

## New URLs Reference

**Private (Editing) Page:**
- Old: `https://home.rankin.works/christmas.html`
- New: `https://home.rankin.works/christmas/christmas.html`

**Public (View Only) Page:**
- Old: `https://home.rankin.works/christmas-public.html`
- New: `https://home.rankin.works/christmas/christmas-public.html`

**API Endpoint:**
- Old: `https://home.rankin.works/api/wishlist`
- New: `https://home.rankin.works/christmas/api/wishlist`

---

## Troubleshooting

### API Container Won't Start
```bash
cd /mnt/NAS/apps/caddy/start-page/christmas/api
docker logs christmas-wishlist-api
```

Common fixes:
- Ensure `data/` directory exists and has `wishlist.json`
- Ensure `.env` file exists
- Check docker-compose.yml paths are correct

### Can't Access Pages
- Verify Woodpecker CI deployment completed
- Check Caddyfile was updated and reloaded
- Verify Cloudflare Access application paths are correct

### Data Lost
Your data should be in:
```bash
/mnt/NAS/apps/caddy/start-page/christmas/api/data/wishlist.json
```

If it's not there, check the old location:
```bash
/mnt/NAS/apps/caddy/start-page/api/data/wishlist.json
```

---

## Rollback (If Needed)

If something goes wrong and you need to rollback:

```bash
cd /mnt/NAS/apps/caddy/start-page
git checkout 36d6221  # Previous commit before reorganization
```

Then restart the old container and revert Caddyfile/Cloudflare Access changes.

---

## Summary Checklist

- [ ] Woodpecker CI deployment completed
- [ ] Caddyfile updated with `/christmas/api/*` path
- [ ] Caddy reloaded
- [ ] API data directory moved to `/christmas/api/data/`
- [ ] .env file moved to `/christmas/api/.env`
- [ ] Old `api/` directory removed
- [ ] Docker container restarted from new location
- [ ] All 5-6 Cloudflare Access applications updated with new paths
- [ ] Private page tested at `/christmas/christmas.html`
- [ ] Public page tested at `/christmas/christmas-public.html`
- [ ] API tested at `/christmas/api/wishlist`

Once all steps are complete, your Christmas list will be fully reorganized and operational! 🎄
