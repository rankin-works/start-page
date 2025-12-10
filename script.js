// DEV-ONLY SVG & CSS CACHE BUSTING (Live Server behind /proxy/550x)
// -----------------------------------------------------------
(function () {
  try {
    // Ports Live Server might use behind the /proxy/ path
    const devProxyPorts = ["5500", "5501", "5502"];

    const path = location.pathname || "";
    const isProxyDev = devProxyPorts.some(
      (p) => path.startsWith(`/proxy/${p}`) || path.includes(`/proxy/${p}/`)
    );

    // Keep localhost for when you run Live Server directly on your machine
    const isLocalDev =
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1";

    const isDev = isProxyDev || isLocalDev;

    console.log("[cache-bust] isDev =", isDev, "host =", location.hostname, "path =", path);

    if (!isDev) return; // Skip when on home.rankin.works or other prod URLs

    // Utility function to add cache-busting parameter
    function addCacheBust(url, stamp) {
      if (!url) return url;
      return `${url.split("?")[0]}?v=${stamp}`;
    }

    // Main cache-busting function
    function bustCache() {
      try {
        const stamp = Date.now();
        console.log("[cache-bust] applying stamp", stamp);

        // Bust all SVG <img> tags
        document.querySelectorAll("img").forEach((img) => {
          try {
            const srcAttr = img.getAttribute("src");
            if (!srcAttr || !/\.svg(?:\?|$)/.test(srcAttr)) return;

            const newSrc = addCacheBust(srcAttr, stamp);
            img.setAttribute("src", newSrc);

            console.log("[cache-bust] img ->", newSrc);
          } catch (imgErr) {
            console.error("[cache-bust] Error updating image:", imgErr);
          }
        });

        // Bust the favicon (using more specific selector)
        const icon = document.querySelector('link[rel="icon"][type="image/svg+xml"]');
        if (icon) {
          try {
            const iconHref = icon.getAttribute("href");
            const newIconHref = addCacheBust(iconHref, stamp);
            icon.setAttribute("href", newIconHref);
            console.log("[cache-bust] favicon ->", newIconHref);
          } catch (iconErr) {
            console.error("[cache-bust] Error updating favicon:", iconErr);
          }
        }

        // Bust stylesheets in dev
        document.querySelectorAll('link[rel="stylesheet"]').forEach((link) => {
          try {
            const href = link.getAttribute("href");
            if (href && !href.includes("__CACHE_BUST__")) {
              const newHref = addCacheBust(href, stamp);
              link.setAttribute("href", newHref);
              console.log("[cache-bust] css ->", newHref);
            }
          } catch (cssErr) {
            console.error("[cache-bust] Error updating stylesheet:", cssErr);
          }
        });
      } catch (bustErr) {
        console.error("[cache-bust] Error during cache busting:", bustErr);
      }
    }

    // Run cache busting when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bustCache);
    } else {
      // DOM already loaded, run immediately
      bustCache();
    }
  } catch (err) {
    console.error("[cache-bust] Initialization error:", err);
  }
})();

// Custom Cursor Implementation
(function() {
  const cursorDot = document.getElementById('cursor-dot');
  const cursorOutline = document.getElementById('cursor-outline');
  
  if (!cursorDot || !cursorOutline) return;
  
  let mouseX = 0;
  let mouseY = 0;
  let outlineX = 0;
  let outlineY = 0;
  
  // Update mouse position
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    
    // Update dot position immediately
    cursorDot.style.left = mouseX + 'px';
    cursorDot.style.top = mouseY + 'px';
  });
  
  // Animate outline to follow with slight delay
  function animateOutline() {
    outlineX += (mouseX - outlineX) * 0.15;
    outlineY += (mouseY - outlineY) * 0.15;
    
    cursorOutline.style.left = (outlineX - 16) + 'px';
    cursorOutline.style.top = (outlineY - 16) + 'px';
    
    requestAnimationFrame(animateOutline);
  }
  
  animateOutline();
  
  // Add hover effects for interactive elements
  const interactiveElements = document.querySelectorAll('a, button, [role="button"], .service-card');
  
  interactiveElements.forEach(el => {
    el.addEventListener('mouseenter', () => {
      cursorOutline.classList.add('hover');
      cursorDot.style.transform = 'scale(1.5)';
    });
    
    el.addEventListener('mouseleave', () => {
      cursorOutline.classList.remove('hover');
      cursorDot.style.transform = 'scale(1)';
    });
  });
  
  // Hide cursor when leaving window
  document.addEventListener('mouseleave', () => {
    cursorDot.style.opacity = '0';
    cursorOutline.style.opacity = '0';
  });
  
  document.addEventListener('mouseenter', () => {
    cursorDot.style.opacity = '1';
    cursorOutline.style.opacity = '1';
  });
})();

// Service Status Checker
(function() {
  // Determine the appropriate status service URL
  const STATUS_SERVICE_URL = location.hostname === 'localhost' || 
                              ['5500', '5501', '5502'].includes(location.port)
    ? 'http://localhost:8082/status'   // Local development
    : 'https://status.rankin.works/status';  // Production

  const serviceCards = document.querySelectorAll('.service-card');
  const RECHECK_INTERVAL = 30000; // 30 seconds
  
  function updateStatusIndicator(card, status) {
    const indicator = card.querySelector('.status-indicator');
    const statusText = card.querySelector('.status-text');
    
    if (!indicator || !statusText) return;
    
    indicator.setAttribute('data-status', status);
    
    switch (status) {
      case 'online':
        statusText.textContent = 'Online';
        break;
      case 'offline':
        statusText.textContent = 'Offline';
        break;
      case 'checking':
        statusText.textContent = 'Checking...';
        break;
      default:
        statusText.textContent = 'Unknown';
    }
  }
  
  async function checkAllServices() {
    try {
      // Mark all as checking initially
      serviceCards.forEach(card => {
        const indicator = card.querySelector('.status-indicator');
        const statusText = card.querySelector('.status-text');
        if (indicator && statusText) {
          indicator.setAttribute('data-status', 'checking');
          statusText.textContent = 'Checking...';
        }
      });

      // Fetch status from local service
      const response = await fetch(STATUS_SERVICE_URL);
      const serviceStatuses = await response.json();
      
      // Update each service card
      serviceCards.forEach(card => {
        const serviceName = card.querySelector('.service-name').textContent;
        const status = serviceStatuses[serviceName]?.status || 'offline';
        updateStatusIndicator(card, status);
      });
    } catch (error) {
      console.error('Failed to fetch service statuses:', error);
      
      // Fallback to marking all as offline
      serviceCards.forEach(card => {
        updateStatusIndicator(card, 'offline');
      });
    }
  }
  
  // Initial status check
  if (serviceCards.length > 0) {
    // Wait a bit for the page to fully load
    setTimeout(() => {
      checkAllServices();
      
      // Set up periodic checking
      setInterval(checkAllServices, RECHECK_INTERVAL);
    }, 2000);
  }
  
  // Manual refresh when right-clicking on a service
  serviceCards.forEach(card => {
    card.addEventListener('contextmenu', async (e) => {
      e.preventDefault();
      await checkAllServices();
    });
  });
})();