"""
Christmas Wishlist API
A simple FastAPI backend for managing Christmas wishlists with authentication
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel
from typing import List, Optional
import json
import secrets
import os
from datetime import datetime
from pathlib import Path

app = FastAPI(title="Christmas Wishlist API", version="1.0.0")
security = HTTPBasic()

# CORS middleware to allow requests from your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your specific domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
DATA_FILE = Path(os.getenv("DATA_FILE", "/data/wishlist.json"))
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "jake")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "changeme")  # Change this!

# Ensure data directory exists
DATA_FILE.parent.mkdir(parents=True, exist_ok=True)

# Pydantic models
class WishlistItem(BaseModel):
    id: Optional[int] = None
    name: str
    price: Optional[str] = None
    url: Optional[str] = None
    priority: str = "want"  # nice, want, must
    notes: Optional[str] = None
    image: Optional[str] = None  # base64 encoded image
    purchased: bool = False
    claimed_by: Optional[str] = None  # Person who claimed the item
    created_at: Optional[str] = None

class WishlistResponse(BaseModel):
    items: List[WishlistItem]
    count: int

# Helper functions
def load_wishlist() -> List[dict]:
    """Load wishlist from JSON file"""
    if not DATA_FILE.exists():
        return []
    try:
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    except json.JSONDecodeError:
        return []

def save_wishlist(items: List[dict]):
    """Save wishlist to JSON file"""
    with open(DATA_FILE, 'w') as f:
        json.dump(items, f, indent=2)

def verify_admin(credentials: HTTPBasicCredentials = Depends(security)):
    """Verify admin credentials for protected endpoints"""
    correct_username = secrets.compare_digest(credentials.username, ADMIN_USERNAME)
    correct_password = secrets.compare_digest(credentials.password, ADMIN_PASSWORD)

    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username

# Public endpoints
@app.get("/")
def read_root():
    """API health check"""
    return {
        "message": "Christmas Wishlist API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/api/wishlist", response_model=WishlistResponse)
def get_wishlist():
    """Get all wishlist items (public endpoint)"""
    items = load_wishlist()
    return {"items": items, "count": len(items)}

@app.get("/api/wishlist/{item_id}")
def get_item(item_id: int):
    """Get a specific wishlist item"""
    items = load_wishlist()
    item = next((item for item in items if item.get("id") == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

# Protected endpoints (Cloudflare Zero Trust handles authentication)
@app.post("/api/wishlist", status_code=status.HTTP_201_CREATED)
def add_item(item: WishlistItem):
    """Add a new wishlist item (protected by Cloudflare Zero Trust)"""
    items = load_wishlist()

    # Generate new ID
    new_id = max([i.get("id", 0) for i in items], default=0) + 1

    item_dict = item.dict()
    item_dict["id"] = new_id
    item_dict["created_at"] = datetime.now().isoformat()

    items.insert(0, item_dict)  # Add to beginning
    save_wishlist(items)

    return item_dict

@app.put("/api/wishlist/{item_id}")
def update_item(item_id: int, item: WishlistItem):
    """Update an existing wishlist item (protected by Cloudflare Zero Trust)"""
    items = load_wishlist()

    for i, existing_item in enumerate(items):
        if existing_item.get("id") == item_id:
            item_dict = item.dict()
            item_dict["id"] = item_id
            item_dict["created_at"] = existing_item.get("created_at")
            items[i] = item_dict
            save_wishlist(items)
            return item_dict

    raise HTTPException(status_code=404, detail="Item not found")

@app.delete("/api/wishlist/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item(item_id: int):
    """Delete a wishlist item (protected by Cloudflare Zero Trust)"""
    items = load_wishlist()

    items = [item for item in items if item.get("id") != item_id]
    save_wishlist(items)

    return None

@app.delete("/api/wishlist", status_code=status.HTTP_204_NO_CONTENT)
def clear_wishlist():
    """Clear all wishlist items (protected by Cloudflare Zero Trust)"""
    save_wishlist([])
    return None

@app.patch("/api/wishlist/{item_id}/toggle-purchased")
def toggle_purchased(item_id: int):
    """Toggle purchased status of an item (protected by Cloudflare Zero Trust)"""
    items = load_wishlist()

    for item in items:
        if item.get("id") == item_id:
            item["purchased"] = not item.get("purchased", False)
            save_wishlist(items)
            return item

    raise HTTPException(status_code=404, detail="Item not found")

@app.patch("/api/wishlist/{item_id}/claim")
def claim_item(item_id: int, claimed_by: str):
    """
    Claim an item (public endpoint - for gift givers to mark what they're buying)
    This marks the item as claimed but doesn't show it as purchased to the owner
    """
    items = load_wishlist()

    for item in items:
        if item.get("id") == item_id:
            item["claimed_by"] = claimed_by if claimed_by else None
            save_wishlist(items)
            return {"message": "Item claimed successfully", "claimed_by": claimed_by}

    raise HTTPException(status_code=404, detail="Item not found")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
