// Christmas List Manager with API Backend

// Configuration
// Use production API when accessed through HTTPS proxy, otherwise use direct API for local development
const isLocalDevelopment = window.location.origin.includes('localhost') ||
                           (window.location.origin.includes('5503') && window.location.protocol === 'http:');

const API_BASE_URL = isLocalDevelopment
  ? 'http://10.0.0.13:8000'
  : 'https://home.rankin.works/christmas';  // API is proxied at /christmas/api/*

console.log('Christmas API - Detected URL:', window.location.href);
console.log('Christmas API - Using API Base URL:', API_BASE_URL);

// No authentication needed - protected by Cloudflare Zero Trust

// Custom Cursor (from main site)
(function() {
  const cursorDot = document.getElementById('cursor-dot');
  const cursorOutline = document.getElementById('cursor-outline');

  document.addEventListener('mousemove', (e) => {
    cursorDot.style.left = e.clientX + 'px';
    cursorDot.style.top = e.clientY + 'px';
    cursorOutline.style.left = e.clientX + 'px';
    cursorOutline.style.top = e.clientY + 'px';
  });

  document.addEventListener('mousedown', () => {
    cursorDot.style.transform = 'translate(-50%, -50%) scale(0.8)';
    cursorOutline.style.transform = 'translate(-50%, -50%) scale(0.8)';
  });

  document.addEventListener('mouseup', () => {
    cursorDot.style.transform = 'translate(-50%, -50%) scale(1)';
    cursorOutline.style.transform = 'translate(-50%, -50%) scale(1)';
  });

  document.addEventListener('mouseenter', () => {
    cursorDot.style.opacity = '1';
    cursorOutline.style.opacity = '1';
  });
})();

// Hamburger Menu Toggle (from main site)
(function() {
  const menuToggle = document.getElementById('menu-toggle');
  const menuBackdrop = document.getElementById('menu-backdrop');
  const menuOverlay = document.getElementById('menu-overlay');
  const menuClose = document.getElementById('menu-close');

  menuToggle.addEventListener('click', () => {
    menuBackdrop.classList.add('active');
  });

  menuClose.addEventListener('click', () => {
    menuBackdrop.classList.remove('active');
  });

  menuBackdrop.addEventListener('click', (e) => {
    if (e.target === menuBackdrop) {
      menuBackdrop.classList.remove('active');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuBackdrop.classList.contains('active')) {
      menuBackdrop.classList.remove('active');
    }
  });

  const projectsToggle = document.getElementById('projects-toggle');
  const projectsSubmenu = document.getElementById('projects-submenu');

  projectsToggle.addEventListener('click', () => {
    projectsToggle.classList.toggle('active');
    projectsSubmenu.classList.toggle('active');
  });
})();

// Theme Toggle (from main site)
(function() {
  const themeToggle = document.getElementById('theme-toggle');
  const themeLabel = themeToggle.querySelector('.theme-label');
  const htmlElement = document.documentElement;

  // Check if user has a saved preference, otherwise use system preference
  let savedTheme = localStorage.getItem('theme');

  if (!savedTheme) {
    // Detect system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    savedTheme = prefersDark ? 'dark' : 'light';
  }

  if (savedTheme === 'light') {
    htmlElement.setAttribute('data-theme', 'light');
    themeLabel.textContent = 'Light Mode';
  } else {
    themeLabel.textContent = 'Dark Mode';
  }

  themeToggle.addEventListener('click', () => {
    const currentTheme = htmlElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    if (newTheme === 'light') {
      htmlElement.setAttribute('data-theme', 'light');
      themeLabel.textContent = 'Light Mode';
    } else {
      htmlElement.removeAttribute('data-theme');
      themeLabel.textContent = 'Dark Mode';
    }

    localStorage.setItem('theme', newTheme);
  });
})();

// API Helper Functions
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // No auth headers needed - Cloudflare Zero Trust handles authentication

  const response = await fetch(url, { ...defaultOptions, ...options });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'API request failed');
  }

  if (response.status === 204) {
    return null; // No content
  }

  return response.json();
}

// Password prompt removed - Cloudflare Zero Trust handles authentication

// Christmas List Functionality with API
(function() {
  const form = document.getElementById('add-item-form');
  const wishlistContainer = document.getElementById('wishlist-items');
  const emptyState = document.getElementById('empty-state');
  const itemCount = document.getElementById('item-count');
  const clearListBtn = document.getElementById('clear-list-btn');
  const sortSelect = document.getElementById('sort-select');

  let wishlistItems = [];
  let fetchedImageUrl = null; // Store fetched image URL
  let currentSort = 'default'; // Track current sort method

  // Auto-fetch product image when URL is pasted
  const urlInput = document.getElementById('item-url');
  const imageInput = document.getElementById('item-image');
  let fetchTimeout = null;

  // Fetch image with retry logic
  async function fetchImageWithRetry(url, maxRetries = 3) {
    const imageLabel = document.querySelector('label[for="item-image"]');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (imageLabel) {
          if (attempt === 1) {
            imageLabel.textContent = 'Image (fetching...)';
          } else {
            imageLabel.textContent = `Image (retrying ${attempt}/${maxRetries}...)`;
          }
        }

        const response = await apiRequest('/api/fetch-product-image', {
          method: 'POST',
          body: JSON.stringify({ url })
        });

        if (response && response.image_url) {
          fetchedImageUrl = response.image_url;
          console.log('Auto-fetched product image:', fetchedImageUrl);

          // Show success
          if (imageLabel) {
            imageLabel.textContent = 'Image (auto-fetched from URL ✓)';
            setTimeout(() => {
              imageLabel.textContent = 'Image';
            }, 3000);
          }
          return; // Success - exit retry loop
        }
      } catch (error) {
        console.log(`Fetch attempt ${attempt} failed:`, error);

        // If not the last attempt, wait before retrying
        if (attempt < maxRetries) {
          const delay = attempt * 1000; // 1s, 2s, 3s backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // All retries failed
          fetchedImageUrl = null;
          if (imageLabel) {
            imageLabel.textContent = 'Image (auto-fetch failed - upload manually)';
            setTimeout(() => {
              imageLabel.textContent = 'Image';
            }, 4000);
          }
        }
      }
    }
  }

  urlInput.addEventListener('input', async () => {
    // Clear previous timeout
    if (fetchTimeout) clearTimeout(fetchTimeout);

    const url = urlInput.value.trim();

    // Only auto-fetch for URLs that look like product pages
    const isProductUrl = url && (
      url.includes('amazon.com') || url.includes('amzn') || url.includes('a.co') ||
      url.includes('target.com') || url.includes('ebay.com') || url.includes('walmart.com') ||
      url.includes('bestbuy.com') || url.includes('etsy.com') || url.includes('newegg.com')
    );

    if (isProductUrl) {
      // Debounce - wait 1 second after user stops typing
      fetchTimeout = setTimeout(() => {
        fetchImageWithRetry(url);
      }, 1000);
    } else {
      fetchedImageUrl = null;
    }
  });

  // Load items from API
  async function loadItems() {
    try {
      const response = await apiRequest('/api/wishlist');
      wishlistItems = response.items;
      sortItems();
      renderItems();
    } catch (error) {
      console.error('Failed to load wishlist:', error);
      showError('Failed to load wishlist. Please try again.');
    }
  }

  // Sort items based on current sort method
  function sortItems() {
    const sortedItems = [...wishlistItems];

    switch (currentSort) {
      case 'priority':
        // must > want > nice
        const priorityOrder = { must: 1, want: 2, nice: 3 };
        sortedItems.sort((a, b) => {
          const priorityA = priorityOrder[a.priority] || 999;
          const priorityB = priorityOrder[b.priority] || 999;
          return priorityA - priorityB;
        });
        break;

      case 'name':
        sortedItems.sort((a, b) => a.name.localeCompare(b.name));
        break;

      case 'price':
        sortedItems.sort((a, b) => {
          // Extract numeric value from price string
          const priceA = parseFloat(a.price?.replace(/[^0-9.]/g, '') || '0');
          const priceB = parseFloat(b.price?.replace(/[^0-9.]/g, '') || '0');
          return priceB - priceA; // Descending order
        });
        break;

      case 'default':
      default:
        // Keep original order (newest first based on insertion)
        break;
    }

    wishlistItems = sortedItems;
  }

  // Render all items
  function renderItems() {
    wishlistContainer.innerHTML = '';

    if (wishlistItems.length === 0) {
      emptyState.classList.remove('hidden');
      itemCount.textContent = '0 items';
      return;
    }

    emptyState.classList.add('hidden');
    itemCount.textContent = `${wishlistItems.length} item${wishlistItems.length !== 1 ? 's' : ''}`;

    wishlistItems.forEach((item) => {
      const itemEl = createItemElement(item);
      wishlistContainer.appendChild(itemEl);
    });
  }

  // Extract store name from URL
  function getStoreName(url) {
    if (!url) return null;

    try {
      const hostname = new URL(url).hostname.toLowerCase();

      // Map common domains to store names
      if (hostname.includes('amazon.com') || hostname.includes('amzn') || hostname.includes('a.co')) {
        return 'Amazon';
      } else if (hostname.includes('target.com')) {
        return 'Target';
      } else if (hostname.includes('ebay.com')) {
        return 'eBay';
      } else if (hostname.includes('walmart.com')) {
        return 'Walmart';
      } else if (hostname.includes('bestbuy.com')) {
        return 'Best Buy';
      } else if (hostname.includes('etsy.com')) {
        return 'Etsy';
      } else if (hostname.includes('newegg.com')) {
        return 'Newegg';
      } else {
        // Generic - extract domain name
        const parts = hostname.replace('www.', '').split('.');
        return parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      }
    } catch (e) {
      return null;
    }
  }

  // Create item element
  function createItemElement(item) {
    const div = document.createElement('div');
    div.className = `wishlist-item${item.purchased ? ' purchased' : ''}`;

    const imageEl = item.image
      ? `<img src="${item.image}" alt="${item.name}" class="item-image" />`
      : `<div class="item-image placeholder">🎁</div>`;

    const storeName = getStoreName(item.url);
    const storeEl = storeName
      ? `<span class="store-name">${storeName}</span>`
      : '';

    const priceEl = item.price
      ? `<span class="item-price">${item.price}${storeEl ? ' ' + storeEl : ''}</span>`
      : (storeEl ? `<span class="item-price">${storeEl}</span>` : '');

    const linkEl = item.url
      ? `<a href="${item.url}" target="_blank" rel="noopener noreferrer" class="item-link">View Product →</a>`
      : '';

    const notesEl = item.notes
      ? `<p class="item-notes">${escapeHtml(item.notes)}</p>`
      : '';

    const priorityLabels = {
      nice: 'Nice to Have',
      want: 'Really Want',
      must: 'Must Have!'
    };

    div.innerHTML = `
      ${imageEl}
      <div class="item-details">
        <div class="item-header">
          <h3 class="item-name">${escapeHtml(item.name)}</h3>
          ${priceEl}
          <span class="priority-badge priority-${item.priority}">${priorityLabels[item.priority]}</span>
        </div>
        ${linkEl}
        ${notesEl}
      </div>
      <div class="item-actions">
        <button class="action-btn purchased-btn" data-id="${item.id}">
          ${item.purchased ? '✓ Purchased' : 'Mark Purchased'}
        </button>
        <button class="action-btn delete-btn" data-id="${item.id}">
          Delete
        </button>
      </div>
    `;

    // Add event listeners
    const purchasedBtn = div.querySelector('.purchased-btn');
    const deleteBtn = div.querySelector('.delete-btn');

    purchasedBtn.addEventListener('click', () => togglePurchased(item.id));
    deleteBtn.addEventListener('click', () => deleteItem(item.id));

    return div;
  }

  // Add new item
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('item-name').value.trim();
    const price = document.getElementById('item-price').value.trim();
    const url = document.getElementById('item-url').value.trim();
    const priority = document.getElementById('item-priority').value;
    const notes = document.getElementById('item-notes').value.trim();
    const imageFile = document.getElementById('item-image').files[0];

    let imageData = null;

    // Handle image upload - prioritize uploaded file, then auto-fetched image
    if (imageFile) {
      imageData = await fileToBase64(imageFile);
    } else if (fetchedImageUrl) {
      imageData = fetchedImageUrl; // Use the fetched image URL
    }

    const newItem = {
      name,
      price,
      url,
      priority,
      notes,
      image: imageData,
      purchased: false
    };

    try {
      await apiRequest('/api/wishlist', {
        method: 'POST',
        body: JSON.stringify(newItem)
      });

      form.reset();
      fetchedImageUrl = null; // Reset fetched image
      await loadItems();
      showSuccess('Item added successfully!');
    } catch (error) {
      console.error('Failed to add item:', error);
      showError('Failed to add item. Please try again.');
    }
  });

  // Convert file to base64
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Toggle purchased status
  async function togglePurchased(itemId) {
    try {
      await apiRequest(`/api/wishlist/${itemId}/toggle-purchased`, {
        method: 'PATCH'
      });
      await loadItems();
    } catch (error) {
      console.error('Failed to toggle purchased:', error);
      showError('Failed to update item. Please try again.');
    }
  }

  // Delete item
  async function deleteItem(itemId) {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      await apiRequest(`/api/wishlist/${itemId}`, {
        method: 'DELETE'
      });
      await loadItems();
      showSuccess('Item deleted successfully!');
    } catch (error) {
      console.error('Failed to delete item:', error);
      showError('Failed to delete item. Please try again.');
    }
  }

  // Clear all items
  clearListBtn.addEventListener('click', async () => {
    if (wishlistItems.length === 0) return;

    if (!confirm('Are you sure you want to clear your entire wishlist? This cannot be undone.')) return;

    try {
      await apiRequest('/api/wishlist', {
        method: 'DELETE'
      });
      await loadItems();
      showSuccess('Wishlist cleared!');
    } catch (error) {
      console.error('Failed to clear wishlist:', error);
      showError('Failed to clear wishlist. Please try again.');
    }
  });

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Show success message
  function showSuccess(message) {
    // Simple alert for now - could be replaced with toast notification
    console.log('Success:', message);
  }

  // Show error message
  function showError(message) {
    alert(message);
  }

  // Sort dropdown event listener
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    sortItems();
    renderItems();
  });

  // Initial load
  loadItems();

  // Auto-refresh every 30 seconds to see changes from other devices
  setInterval(loadItems, 30000);
})();
