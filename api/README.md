# Christmas Wishlist API

A FastAPI backend for managing Christmas wishlists with authentication.

## Features

- ✅ RESTful API for wishlist CRUD operations
- ✅ HTTP Basic Authentication for admin operations
- ✅ Public read access for viewing wishlist
- ✅ Item claiming feature (for gift-givers)
- ✅ JSON file storage
- ✅ Docker containerized
- ✅ CORS enabled for frontend access

## Quick Start

### Using Docker Compose

1. Create `.env` file:
```bash
cp .env.example .env
# Edit .env and set a secure password
```

2. Build and run:
```bash
docker-compose up -d
```

The API will be available at `http://localhost:8000`

### Manual Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variables:
```bash
export ADMIN_USERNAME=jake
export ADMIN_PASSWORD=your-secure-password
export DATA_FILE=/path/to/wishlist.json
```

3. Run the server:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

## API Endpoints

### Public Endpoints (No Auth Required)

- `GET /` - Health check
- `GET /api/wishlist` - Get all wishlist items
- `GET /api/wishlist/{item_id}` - Get specific item
- `PATCH /api/wishlist/{item_id}/claim` - Claim an item (for gift-givers)

### Protected Endpoints (Require Auth)

- `POST /api/wishlist` - Add new item
- `PUT /api/wishlist/{item_id}` - Update item
- `DELETE /api/wishlist/{item_id}` - Delete item
- `DELETE /api/wishlist` - Clear all items
- `PATCH /api/wishlist/{item_id}/toggle-purchased` - Toggle purchased status

## Authentication

Protected endpoints use HTTP Basic Authentication. Include credentials in requests:

```javascript
fetch('http://localhost:8000/api/wishlist', {
  method: 'POST',
  headers: {
    'Authorization': 'Basic ' + btoa('jake:password'),
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({...})
})
```

## Data Storage

Wishlist data is stored in a JSON file at the location specified by `DATA_FILE` environment variable (default: `/data/wishlist.json`).

## API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Deployment

### On TrueNAS/K3s

1. Build the Docker image
2. Deploy as a Kubernetes pod or Docker container
3. Mount a persistent volume for `/data`
4. Set up reverse proxy through Caddy
5. Configure environment variables

### Example Caddy Configuration

```
christmas-api.rankin.works {
    reverse_proxy localhost:8000
}
```

## Security Notes

- Change the default password immediately
- Use HTTPS in production (handled by Cloudflare Tunnel)
- Consider using more robust authentication (JWT, OAuth) for public deployment
- Regularly backup the `/data` directory
