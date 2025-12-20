// Christmas List Public View (Read-Only)

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

// Christmas List Read-Only Display
(function() {
  const wishlistContainer = document.getElementById('wishlist-items');
  const emptyState = document.getElementById('empty-state');
  const itemCount = document.getElementById('item-count');

  let wishlistItems = JSON.parse(localStorage.getItem('christmasWishlist')) || [];

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

  // Create item element (read-only version)
  function createItemElement(item) {
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
    `;

    return div;
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initial render
  renderItems();

  // Optional: Auto-refresh if items change (in case you're editing in another tab)
  setInterval(() => {
    const updatedItems = JSON.parse(localStorage.getItem('christmasWishlist')) || [];
    if (JSON.stringify(updatedItems) !== JSON.stringify(wishlistItems)) {
      wishlistItems = updatedItems;
      renderItems();
    }
  }, 3000); // Check every 3 seconds
})();
