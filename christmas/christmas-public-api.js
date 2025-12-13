// Christmas List Public View (Read-Only) with API Backend

// Configuration
// Use production API when accessed through HTTPS proxy, otherwise use direct API for local development
const isLocalDevelopment = window.location.origin.includes('localhost') ||
                           (window.location.origin.includes('5503') && window.location.protocol === 'http:');

const API_BASE_URL = isLocalDevelopment
  ? 'http://10.0.0.13:8000'
  : 'https://home.rankin.works/christmas';  // API is proxied at /christmas/api/*

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

// Christmas List Read-Only Display with API
(function() {
  const wishlistContainer = document.getElementById('wishlist-items');
  const emptyState = document.getElementById('empty-state');
  const itemCount = document.getElementById('item-count');
  const sortSelect = document.getElementById('sort-select');

  let wishlistItems = [];
  let currentSort = 'default'; // Track current sort method
  let showClaims = localStorage.getItem('showClaimsMode') === 'true'; // Track whether to show claim information

  // Listen for toggle claims event
  window.addEventListener('toggleClaims', (e) => {
    showClaims = e.detail.showClaims;
    renderItems(); // Re-render to show/hide claims
  });

  // Load items from API
  async function loadItems() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/wishlist`);
      if (!response.ok) {
        throw new Error('Failed to fetch wishlist');
      }
      const data = await response.json();
      wishlistItems = data.items;
      sortItems();
      renderItems();
    } catch (error) {
      console.error('Failed to load wishlist:', error);
      emptyState.classList.remove('hidden');
      emptyState.innerHTML = `
        <span class="empty-icon">⚠️</span>
        <p>Unable to load wishlist</p>
        <small>Please try refreshing the page</small>
      `;
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

  // Render all items (read-only)
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

  // Show custom alert
  function showAlert(title, message) {
    return new Promise((resolve) => {
      const modal = document.getElementById('alert-modal');
      const alertTitle = document.getElementById('alert-title');
      const alertMessage = document.getElementById('alert-message');
      const okBtn = document.getElementById('alert-ok');

      alertTitle.textContent = title;
      alertMessage.textContent = message;

      modal.classList.add('active');
      okBtn.focus();

      const handleOk = () => {
        modal.classList.remove('active');
        okBtn.removeEventListener('click', handleOk);
        document.removeEventListener('keydown', handleKeyPress);
        resolve();
      };

      const handleKeyPress = (e) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
          handleOk();
        }
      };

      okBtn.addEventListener('click', handleOk);
      document.addEventListener('keydown', handleKeyPress);
    });
  }

  // Show custom modal
  function showModal(title, subtitle, isUnclaim = false) {
    return new Promise((resolve, reject) => {
      const modal = document.getElementById('claim-modal');
      const modalTitle = document.getElementById('modal-title');
      const modalSubtitle = document.getElementById('modal-subtitle');
      const form = document.getElementById('claim-form');
      const nameInput = document.getElementById('modal-name');
      const passwordInput = document.getElementById('modal-password');
      const passwordGroup = document.getElementById('password-group');
      const submitBtn = document.getElementById('modal-submit');
      const cancelBtn = document.getElementById('modal-cancel');

      // Configure modal
      modalTitle.textContent = title;
      modalSubtitle.textContent = subtitle;

      if (isUnclaim) {
        nameInput.parentElement.style.display = 'none';
        nameInput.removeAttribute('required'); // Remove required when hidden
        passwordGroup.querySelector('label').textContent = 'Enter Password';
        passwordInput.placeholder = 'Enter the password to unclaim';
        submitBtn.textContent = 'Unclaim';
      } else {
        nameInput.parentElement.style.display = 'flex';
        nameInput.setAttribute('required', 'required'); // Re-add required when visible
        passwordGroup.querySelector('label').textContent = 'Password';
        passwordInput.placeholder = 'Set a password to protect this claim';
        submitBtn.textContent = 'Claim Item';
      }

      // Reset form
      form.reset();

      // Show modal
      modal.classList.add('active');

      // Focus correct input
      if (isUnclaim) {
        passwordInput.focus();
      } else {
        nameInput.focus();
      }

      // Handle form submission
      const handleSubmit = (e) => {
        e.preventDefault();
        const name = isUnclaim ? '' : nameInput.value.trim();
        const password = passwordInput.value.trim();

        // Validate
        if (!isUnclaim && !name) {
          nameInput.focus();
          return;
        }
        if (!password) {
          passwordInput.focus();
          return;
        }

        modal.classList.remove('active');
        form.removeEventListener('submit', handleSubmit);
        cancelBtn.removeEventListener('click', handleCancel);
        modal.removeEventListener('click', handleBackdropClick);

        resolve({ name, password });
      };

      // Handle cancel
      const handleCancel = () => {
        modal.classList.remove('active');
        form.removeEventListener('submit', handleSubmit);
        cancelBtn.removeEventListener('click', handleCancel);
        reject('cancelled');
      };

      // Handle backdrop click
      const handleBackdropClick = (e) => {
        if (e.target === modal) {
          handleCancel();
        }
      };

      // Handle escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          handleCancel();
          document.removeEventListener('keydown', handleEscape);
        }
      };

      form.addEventListener('submit', handleSubmit);
      cancelBtn.addEventListener('click', handleCancel);
      modal.addEventListener('click', handleBackdropClick);
      document.addEventListener('keydown', handleEscape);
    });
  }

  // Claim item (mark as claimed without spoiling the surprise)
  async function claimItem(itemId) {
    try {
      const { name, password } = await showModal(
        'Claim Item',
        'Enter your name and set a password. You\'ll need this password to unclaim the item later.'
      );

      const response = await fetch(`${API_BASE_URL}/api/wishlist/${itemId}/claim?claimed_by=${encodeURIComponent(name)}&password=${encodeURIComponent(password)}`, {
        method: 'PATCH'
      });

      if (!response.ok) {
        throw new Error('Failed to claim item');
      }

      await loadItems();
      await showAlert('Success!', `Great! You've claimed this item. Jake won't see who claimed it unless he peeks!`);
    } catch (error) {
      if (error === 'cancelled') {
        return; // User cancelled
      }
      console.error('Failed to claim item:', error);
      await showAlert('Error', 'Failed to claim item. Please try again.');
    }
  }

  // Unclaim item (requires password verification)
  async function unclaimItem(itemId, claimedBy) {
    try {
      const { password } = await showModal(
        'Unclaim Item',
        `This item was claimed by "${claimedBy}". Enter the password to remove the claim.`,
        true
      );

      const response = await fetch(`${API_BASE_URL}/api/wishlist/${itemId}/claim?claimed_by=&password=${encodeURIComponent(password)}`, {
        method: 'PATCH'
      });

      if (!response.ok) {
        if (response.status === 403) {
          await showAlert('Incorrect Password', 'Only the person who claimed this item can unclaim it. If you forgot the password, please contact Jake to remove it manually.');
        } else {
          throw new Error('Failed to unclaim item');
        }
        return;
      }

      await loadItems();
      await showAlert('Success!', 'Item unclaimed successfully!');
    } catch (error) {
      if (error === 'cancelled') {
        return; // User cancelled
      }
      console.error('Failed to unclaim item:', error);
      await showAlert('Error', 'Failed to unclaim item. Please try again.');
    }
  }

  // Create item element (read-only version)
  function createItemElement(item) {
    const div = document.createElement('div');
    // Add 'claimed' class if item is claimed (don't show purchased class to avoid spoiling)
    const isClaimed = item.claimed_by && item.claimed_by.trim() !== '';
    div.className = `wishlist-item${isClaimed ? ' claimed' : ''}`;

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

    // Show who claimed the item if showClaims is enabled
    const claimedByEl = showClaims && isClaimed
      ? `<p class="claimed-by-info">🎁 Claimed by: ${escapeHtml(item.claimed_by)}</p>`
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
        ${claimedByEl}
      </div>
      <div class="item-actions">
        <button class="action-btn claim-btn" data-id="${item.id}">
          ${isClaimed ? '✓ Claimed' : 'Mark as Claimed'}
        </button>
      </div>
    `;

    // Add event listener for claim button
    const claimBtn = div.querySelector('.claim-btn');
    claimBtn.addEventListener('click', () => {
      if (isClaimed) {
        unclaimItem(item.id, item.claimed_by);
      } else {
        claimItem(item.id);
      }
    });

    return div;
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Sort dropdown event listener
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    sortItems();
    renderItems();
  });

  // Initial render
  loadItems();

  // Auto-refresh every 10 seconds to see updates
  setInterval(loadItems, 10000);
})();

// Show Claims Toggle (outside the wishlist IIFE to access global scope)
(function() {
  const showClaimsToggle = document.getElementById('show-claims-toggle');
  const claimsStatus = document.getElementById('claims-status');

  // Check localStorage for saved preference
  let claimsVisible = localStorage.getItem('showClaimsMode') === 'true';

  // Apply initial state
  if (claimsVisible) {
    claimsStatus.textContent = '🙈 Hide Claims';
    document.body.classList.add('show-claims-mode');
  }

  showClaimsToggle.addEventListener('click', () => {
    claimsVisible = !claimsVisible;
    localStorage.setItem('showClaimsMode', claimsVisible);

    if (claimsVisible) {
      claimsStatus.textContent = '🙈 Hide Claims';
      document.body.classList.add('show-claims-mode');
    } else {
      claimsStatus.textContent = '👁️ Show Claims';
      document.body.classList.remove('show-claims-mode');
    }

    // Trigger re-render by dispatching custom event
    window.dispatchEvent(new CustomEvent('toggleClaims', { detail: { showClaims: claimsVisible } }));
  });
})();
