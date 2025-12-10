// DEV-ONLY SVG & CSS CACHE BUSTING (Live Server behind /proxy/550x)
// -----------------------------------------------------------
(function () {
  try {
    const devProxyPorts = ["5500", "5501", "5502"];
    const path = location.pathname || "";
    const isProxyDev = devProxyPorts.some(
      (p) => path.startsWith(`/proxy/${p}`) || path.includes(`/proxy/${p}/`)
    );
    const isLocalDev =
      location.hostname === "localhost" ||
      location.hostname === "127.0.0.1";

    const isDev = isProxyDev || isLocalDev;

    console.log("[cache-bust] isDev =", isDev, "host =", location.hostname, "path =", path);

    if (!isDev) return;

    function addCacheBust(url, stamp) {
      if (!url) return url;
      return `${url.split("?")[0]}?v=${stamp}`;
    }

    function bustCache() {
      try {
        const stamp = Date.now();
        console.log("[cache-bust] applying stamp", stamp);

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

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bustCache);
    } else {
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
  
  document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    cursorDot.style.left = mouseX + 'px';
    cursorDot.style.top = mouseY + 'px';
  });
  
  function animateOutline() {
    outlineX += (mouseX - outlineX) * 0.15;
    outlineY += (mouseY - outlineY) * 0.15;
    cursorOutline.style.left = (outlineX - 16) + 'px';
    cursorOutline.style.top = (outlineY - 16) + 'px';
    requestAnimationFrame(animateOutline);
  }
  
  animateOutline();
  
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
  // Determine the appropriate status service URL based on environment
  function getStatusServiceUrl() {
    const hostname = location.hostname;
    const port = location.port;
    const path = location.pathname || "";
    
    // Local development scenarios
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isDevPort = ['5500', '5501', '5502'].includes(port);
    const isProxyDev = ['5500', '5501', '5502'].some(p => 
      path.startsWith(`/proxy/${p}`) || path.includes(`/proxy/${p}/`)
    );
    
    if (isLocalhost || isDevPort || isProxyDev) {
      console.log('[status] Using local development endpoint');
      return 'http://localhost:8082/status';
    }
    
    // Production - use the status subdomain
    console.log('[status] Using production endpoint');
    return 'https://status.rankin.works/status';
  }

  const STATUS_SERVICE_URL = getStatusServiceUrl();
  const serviceCards = document.querySelectorAll('.service-card');
  const RECHECK_INTERVAL = 30000; // 30 seconds
  const INITIAL_DELAY = 1000; // 1 second initial delay
  
  console.log('[status] Status service URL:', STATUS_SERVICE_URL);
  console.log('[status] Found', serviceCards.length, 'service cards');
  
  /**
   * Update the visual status indicator on a service card
   */
  function updateStatusIndicator(card, status) {
    const indicator = card.querySelector('.status-indicator');
    const statusText = card.querySelector('.status-text');
    
    if (!indicator || !statusText) {
      console.warn('[status] Missing indicator elements for card');
      return;
    }
    
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
        indicator.setAttribute('data-status', 'offline');
    }
  }
  
  /**
   * Set all cards to checking state
   */
  function setAllChecking() {
    serviceCards.forEach(card => {
      updateStatusIndicator(card, 'checking');
    });
  }
  
  /**
   * Set all cards to offline state (used on fetch failure)
   */
  function setAllOffline() {
    serviceCards.forEach(card => {
      updateStatusIndicator(card, 'offline');
    });
  }
  
  /**
   * Fetch statuses from the status service and update all cards
   */
  async function checkAllServices() {
    console.log('[status] Starting status check...');
    // setAllChecking();  // Remove or comment out this line
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
      
      const response = await fetch(STATUS_SERVICE_URL, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const serviceStatuses = await response.json();
      console.log('[status] Received statuses:', serviceStatuses);
      
      // Update each service card based on the response
      serviceCards.forEach(card => {
        const serviceNameEl = card.querySelector('.service-name');
        if (!serviceNameEl) {
          console.warn('[status] Card missing service-name element');
          return;
        }
        
        const serviceName = serviceNameEl.textContent.trim();
        const serviceData = serviceStatuses[serviceName];
        
        if (serviceData) {
          const status = serviceData.status || 'offline';
          console.log(`[status] ${serviceName}: ${status}`);
          updateStatusIndicator(card, status);
        } else {
          // Service not found in response - might be a naming mismatch
          console.warn(`[status] No status data for "${serviceName}". Available keys:`, Object.keys(serviceStatuses));
          updateStatusIndicator(card, 'offline');
        }
      });
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('[status] Request timed out');
      } else {
        console.error('[status] Failed to fetch service statuses:', error.message);
      }
      
      // On error, mark all services as offline
      setAllOffline();
    }
  }
  
  // Initialize status checking
  if (serviceCards.length > 0) {
    // Initial check after a short delay
    setTimeout(() => {
      checkAllServices();
      
      // Set up periodic checking
      setInterval(checkAllServices, RECHECK_INTERVAL);
    }, INITIAL_DELAY);
  } else {
    console.warn('[status] No service cards found on page');
  }
  
  // Manual refresh via right-click on any service card
  serviceCards.forEach(card => {
    card.addEventListener('contextmenu', async (e) => {
      e.preventDefault();
      console.log('[status] Manual refresh triggered');
      await checkAllServices();
    });
  });
  
  // Expose for debugging
  window.__statusChecker = {
    checkAllServices,
    getStatusServiceUrl,
    STATUS_SERVICE_URL
  };
})();