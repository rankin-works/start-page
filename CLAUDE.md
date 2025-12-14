# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a homelab dashboard with two main components:
1. **Main Dashboard** (`index.html`) - A static homepage for accessing self-hosted services with live system monitoring
2. **Christmas Wishlist App** (`christmas/`) - A FastAPI-powered wishlist manager with dual interfaces (admin/public)

The project runs on TrueNAS (10.0.0.13) behind Caddy reverse proxy with Cloudflare Zero Trust authentication.

## Architecture

### Frontend Architecture (Vanilla JavaScript)

The codebase uses **vanilla JavaScript with no frameworks**. Key patterns:

- **IIFE Modules**: Code is organized in immediately-invoked function expressions for encapsulation
- **Event Delegation**: Uses event delegation pattern for performance (see `script.js` for implementation)
- **Cache Busting Strategy**: Development vs production handled differently:
  - **Development**: Auto-detects Live Server proxy (`/proxy/5500`) or localhost and applies timestamp-based cache busting for SVG/CSS
  - **Production**: Uses git commit hash injected by CI/CD pipeline (replaces `__CACHE_BUST__` placeholder)
- **Theme System**: CSS variables with `data-theme` attribute switching, persisted to localStorage

### Backend Architecture (FastAPI)

The Christmas API (`christmas/api/main.py`) uses:
- **JSON file-based storage** at `/data/wishlist.json` (no database)
- **Dual authentication**: Cloudflare Zero Trust header check + HTTP Basic Auth fallback
- **Image handling**: Converts external URLs to base64 data URIs to prevent hotlinking issues
- **Web scraping**: Multiple fallback strategies for Amazon images (JSON-LD → meta tags → img tags)

### Service URL Management

All service URLs are configured in `services.json` mapping service names to internal IP:port combinations. Status checking polls `https://status.rankin.works/status` every 5 seconds.

## Development Workflow

### Running Locally

**Main Dashboard:**
```bash
# No build required - open index.html directly or use Live Server
# Development mode auto-detects localhost/Live Server for cache busting
```

**Christmas API:**
```bash
cd christmas/api

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run locally (development)
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or use Docker
docker-compose up --build
```

### Testing Changes

**Before committing frontend changes:**
1. Test in browser with developer tools open
2. Check console for cache-bust logs (should show `[cache-bust] isDev = true`)
3. Verify all service cards render correctly
4. Test theme toggle functionality
5. Confirm status indicators update (requires `status.rankin.works` API)

**Before committing API changes:**
1. Test CRUD operations via admin interface (`christmas.html`)
2. Verify public interface shows correct data (`christmas-public.html`)
3. Test Amazon image scraping with sample URLs
4. Check authentication works (both Cloudflare header and Basic Auth)

### Deployment

Deployment is **fully automated via Woodpecker CI** on push to `main`:

```bash
# Simply commit and push
git add .
git commit -m "Description"
git push origin main
```

**What happens automatically:**
1. Woodpecker CI triggers on main branch push
2. SSH to TrueNAS at `/mnt/NAS/apps/caddy/start-page`
3. `git reset --hard origin/main` to update files
4. Cache busting: Replace `__CACHE_BUST__` with `$(git rev-parse --short HEAD)`
5. Enable CSP headers (removes HTML comment markers)
6. Caddy serves updated files immediately (zero downtime)

**Manual deployment (if needed):**
```bash
ssh deploy@10.0.0.13
cd /mnt/NAS/apps/caddy/start-page
git pull origin main
# Then manually run cache-bust and CSP commands from .woodpecker/deploy.yaml
```

### Christmas API Deployment

API runs in Docker container:
```bash
ssh deploy@10.0.0.13
cd /mnt/NAS/apps/caddy/start-page/christmas/api
docker-compose down
docker-compose up -d --build
```

### Backup Wishlist Data

```bash
# Manual backup
ssh deploy@10.0.0.13
/mnt/NAS/apps/caddy/start-page/christmas/backup-christmas-list.sh

# Backups stored at: /mnt/NAS/backups/christmas-list/
# Automatically keeps last 30 backups
```

## Important Development Notes

### Cache Busting Strategy

**In development:** `script.js` auto-detects development environment and applies cache busting
**In production:** CI/CD pipeline replaces placeholders like:
```html
<link rel="stylesheet" href="style.css?v=__CACHE_BUST__">
```
with:
```html
<link rel="stylesheet" href="style.css?v=a1b2c3d">
```

**Never commit with hardcoded cache values** - always use `__CACHE_BUST__` placeholder.

### Content Security Policy

CSP is disabled in development via HTML comments:
```html
<!-- CSP disabled for development
<meta http-equiv="Content-Security-Policy" content="...">
Uncomment for production deployment -->
```

The CI/CD pipeline removes these comments for production. **Do not manually remove them** - let the pipeline handle it.

### HTML Structure Conventions

- Service cards follow strict structure: `service-icon` div must close before `service-text` div
- Status indicators use `data-service` attributes matching keys in `services.json`
- All service icons stored in `assets/` directory as SVG

### API Authentication Flow

1. Check for `Cf-Access-Authenticated-User-Email` header (Cloudflare Zero Trust)
2. If not present, fall back to HTTP Basic Auth (username from env `ADMIN_USERNAME`, password from `ADMIN_PASSWORD`)
3. Public endpoints (GET requests) bypass authentication

### File Paths in Production

- Dashboard: `/mnt/NAS/apps/caddy/start-page/`
- API data: `/mnt/NAS/apps/caddy/start-page/christmas/api/data/`
- Backups: `/mnt/NAS/backups/christmas-list/`

## Common Issues

**"Changes not showing after push"**: Check Woodpecker CI logs. Cache may need manual clear if deployment failed.

**"Service status showing 'Checking...' forever"**: Verify `https://status.rankin.works/status` API is running.

**"Christmas API not updating"**: Check Docker container logs with `docker logs christmas-wishlist-api`

**"Theme not persisting"**: Check localStorage in browser dev tools for `theme` key.

**"Missing closing div tag"**: Use `git diff index.html` to see recent changes. Service cards have nested structure that must be preserved.
