// Christmas List Manager

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
  const menuContainer = menuToggle.closest('.menu-container');
  const menuBackdrop = document.getElementById('menu-backdrop');
  const menuClose = document.getElementById('menu-close');

  function openMenu() {
    menuContainer.classList.add('active');
    menuBackdrop.classList.add('active');
  }

  function closeMenu() {
    menuContainer.classList.remove('active');
    menuBackdrop.classList.remove('active');
  }

  menuToggle.addEventListener('click', () => {
    if (menuContainer.classList.contains('active')) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  menuClose.addEventListener('click', () => {
    closeMenu();
  });

  menuBackdrop.addEventListener('click', () => {
    closeMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuContainer.classList.contains('active')) {
      closeMenu();
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

  const savedTheme = localStorage.getItem('theme') || 'dark';

  if (savedTheme === 'light') {
    htmlElement.setAttribute('data-theme', 'light');
    themeLabel.textContent = 'Dark Mode';
  } else {
    themeLabel.textContent = 'Light Mode';
  }

  themeToggle.addEventListener('click', () => {
    const currentTheme = htmlElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    if (newTheme === 'light') {
      htmlElement.setAttribute('data-theme', 'light');
      themeLabel.textContent = 'Dark Mode';
    } else {
      htmlElement.removeAttribute('data-theme');
      themeLabel.textContent = 'Light Mode';
    }

    localStorage.setItem('theme', newTheme);
  });
})();

// Christmas List Functionality
(function() {
  const form = document.getElementById('add-item-form');
  const wishlistContainer = document.getElementById('wishlist-items');
  const emptyState = document.getElementById('empty-state');
  const itemCount = document.getElementById('item-count');
  const clearListBtn = document.getElementById('clear-list-btn');

  let wishlistItems = JSON.parse(localStorage.getItem('christmasWishlist')) || [];

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

    wishlistItems.forEach((item, index) => {
      const itemEl = createItemElement(item, index);
      wishlistContainer.appendChild(itemEl);
    });
  }

  // Create item element
  function createItemElement(item, index) {
    const div = document.createElement('div');
    div.className = `wishlist-item${item.purchased ? ' purchased' : ''}`;

    const imageEl = item.image
      ? `<img src="${item.image}" alt="${item.name}" class="item-image" />`
      : `<div class="item-image placeholder">🎁</div>`;

    const priceEl = item.price
      ? `<span class="item-price">${item.price}</span>`
      : '';

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
        <button class="action-btn purchased-btn" data-index="${index}">
          ${item.purchased ? '✓ Purchased' : 'Mark Purchased'}
        </button>
        <button class="action-btn delete-btn" data-index="${index}">
          Delete
        </button>
      </div>
    `;

    // Add event listeners
    const purchasedBtn = div.querySelector('.purchased-btn');
    const deleteBtn = div.querySelector('.delete-btn');

    purchasedBtn.addEventListener('click', () => togglePurchased(index));
    deleteBtn.addEventListener('click', () => deleteItem(index));

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

    // Handle image upload
    if (imageFile) {
      imageData = await fileToBase64(imageFile);
    }

    const newItem = {
      id: Date.now(),
      name,
      price,
      url,
      priority,
      notes,
      image: imageData,
      purchased: false,
      createdAt: new Date().toISOString()
    };

    wishlistItems.unshift(newItem);
    saveItems();
    renderItems();
    form.reset();
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
  function togglePurchased(index) {
    wishlistItems[index].purchased = !wishlistItems[index].purchased;
    saveItems();
    renderItems();
  }

  // Delete item
  function deleteItem(index) {
    if (confirm('Are you sure you want to delete this item?')) {
      wishlistItems.splice(index, 1);
      saveItems();
      renderItems();
    }
  }

  // Clear all items
  clearListBtn.addEventListener('click', () => {
    if (wishlistItems.length === 0) return;

    if (confirm('Are you sure you want to clear your entire wishlist? This cannot be undone.')) {
      wishlistItems = [];
      saveItems();
      renderItems();
    }
  });

  // Save to localStorage
  function saveItems() {
    localStorage.setItem('christmasWishlist', JSON.stringify(wishlistItems));
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initial render
  renderItems();
})();
