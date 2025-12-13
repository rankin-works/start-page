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

// Theme Toggle
(function() {
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = themeToggle.querySelector('.theme-icon');
  const themeLabel = themeToggle.querySelector('.theme-label');
  const htmlElement = document.documentElement;

  // Get saved theme or default to dark
  const savedTheme = localStorage.getItem('theme') || 'dark';

  // Apply saved theme on load
  if (savedTheme === 'light') {
    htmlElement.setAttribute('data-theme', 'light');
    themeIcon.textContent = '☀️';
    themeLabel.textContent = 'Light';
  }

  // Toggle theme on click
  themeToggle.addEventListener('click', () => {
    const currentTheme = htmlElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    if (newTheme === 'light') {
      htmlElement.setAttribute('data-theme', 'light');
      themeIcon.textContent = '☀️';
      themeLabel.textContent = 'Light';
    } else {
      htmlElement.removeAttribute('data-theme');
      themeIcon.textContent = '🌙';
      themeLabel.textContent = 'Dark';
    }

    // Save theme preference
    localStorage.setItem('theme', newTheme);
  });
})();

// Live Date and Time Display
(function() {
  function updateDateTime() {
    const dateTimeElement = document.getElementById('intro-datetime');
    if (!dateTimeElement) return;

    const now = new Date();
    const options = {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    };
    dateTimeElement.textContent = now.toLocaleString('en-US', options);
  }

  // Update immediately
  updateDateTime();

  // Update every second
  setInterval(updateDateTime, 1000);
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
    return 'https://status.rankin.works/status';
    }
    
    // Production - use the status subdomain
    console.log('[status] Using production endpoint');
    return 'https://status.rankin.works/status';
  }

  const STATUS_SERVICE_URL = getStatusServiceUrl();
  const serviceCards = document.querySelectorAll('.service-card');
  const RECHECK_INTERVAL = 5000; // 5 seconds
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
   * Format bytes to human-readable format
   */
  function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 GB';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Format uptime seconds to readable format
   */
  function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Update system metrics display
   */
  function updateSystemMetrics(systemData) {
    // Add flash animation to indicate refresh
    const metricsContainer = document.getElementById('system-metrics');
    if (metricsContainer) {
      metricsContainer.classList.add('refreshing');
      setTimeout(() => {
        metricsContainer.classList.remove('refreshing');
      }, 500);
    }

    // Update CPU usage
    const cpuElement = document.getElementById('cpu-usage');
    if (cpuElement && systemData.cpu && systemData.cpu.usage_percent !== undefined) {
      const cpuUsage = systemData.cpu.usage_percent;
      cpuElement.textContent = `${cpuUsage}%`;

      // Update progress bar if exists
      const cpuBar = document.getElementById('cpu-bar');
      if (cpuBar) {
        cpuBar.style.width = `${cpuUsage}%`;
        // Color based on usage
        if (cpuUsage > 80) {
          cpuBar.style.background = '#ef4444';
        } else if (cpuUsage > 60) {
          cpuBar.style.background = '#f59e0b';
        } else {
          cpuBar.style.background = '#22c55e';
        }
      }
    }

    // Update memory usage
    const memoryElement = document.getElementById('memory-usage');
    if (memoryElement && systemData.memory) {
      if (systemData.memory.usage_percent !== undefined) {
        const memUsage = systemData.memory.usage_percent;
        memoryElement.textContent = `${memUsage}%`;

        // Update memory total if available
        const memTotalElement = document.getElementById('memory-total');
        if (memTotalElement && systemData.memory.total_gb) {
          memTotalElement.textContent = `${systemData.memory.total_gb} GB`;
        }

        // Update progress bar
        const memBar = document.getElementById('memory-bar');
        if (memBar) {
          memBar.style.width = `${memUsage}%`;
          if (memUsage > 80) {
            memBar.style.background = '#ef4444';
          } else if (memUsage > 60) {
            memBar.style.background = '#f59e0b';
          } else {
            memBar.style.background = '#22c55e';
          }
        }
      }
    }

    // Update storage info
    if (systemData.storage && Array.isArray(systemData.storage)) {
      systemData.storage.forEach(pool => {
        if (pool.name === 'NAS') {  // Focus on main pool
          const storageUsageElement = document.getElementById('storage-usage');
          const storageFreeElement = document.getElementById('storage-free');

          if (storageUsageElement && pool.usage_percent !== undefined) {
            storageUsageElement.textContent = `${pool.usage_percent}%`;
          }

          if (storageFreeElement && pool.free_gb !== undefined) {
            storageFreeElement.textContent = `${pool.free_gb} GB free`;
          }

          // Update storage bar
          const storageBar = document.getElementById('storage-bar');
          if (storageBar && pool.usage_percent !== undefined) {
            storageBar.style.width = `${pool.usage_percent}%`;
            if (pool.usage_percent > 90) {
              storageBar.style.background = '#ef4444';
            } else if (pool.usage_percent > 75) {
              storageBar.style.background = '#f59e0b';
            } else {
              storageBar.style.background = '#22c55e';
            }
          }
        }
      });
    }

    // Update load averages
    const loadAvgElement = document.getElementById('load-avg');
    if (loadAvgElement && systemData.load_avg) {
      const oneMin = systemData.load_avg['1min'];
      if (oneMin !== undefined) {
        loadAvgElement.textContent = oneMin.toFixed(2);

        // Update detail with 5min and 15min
        const loadAvgDetail = document.getElementById('load-avg-detail');
        if (loadAvgDetail) {
          const fiveMin = systemData.load_avg['5min'] || 0;
          const fifteenMin = systemData.load_avg['15min'] || 0;
          loadAvgDetail.textContent = `5m: ${fiveMin.toFixed(2)} | 15m: ${fifteenMin.toFixed(2)}`;
        }
      }
    }

    // Update CPU temperature
    const cpuTempElement = document.getElementById('cpu-temp');
    if (cpuTempElement && systemData.temperatures) {
      if (systemData.temperatures.cpu_celsius !== undefined) {
        cpuTempElement.textContent = `${systemData.temperatures.cpu_celsius}°C`;

        // Calculate average disk temperature if available
        const diskTempAvg = document.getElementById('disk-temp-avg');
        if (diskTempAvg && systemData.temperatures.disks) {
          const diskTemps = Object.values(systemData.temperatures.disks);
          if (diskTemps.length > 0) {
            const avgTemp = diskTemps.reduce((a, b) => a + b, 0) / diskTemps.length;
            diskTempAvg.textContent = `Disks avg: ${avgTemp.toFixed(1)}°C`;
          }
        }
      }
    }

    // Update system uptime
    const uptimeElement = document.getElementById('system-uptime');
    if (uptimeElement && systemData.system) {
      if (systemData.system.uptime_seconds) {
        uptimeElement.textContent = formatUptime(systemData.system.uptime_seconds);
      }

      // Update hostname
      const hostnameElement = document.getElementById('system-hostname');
      if (hostnameElement && systemData.system.hostname) {
        hostnameElement.textContent = systemData.system.hostname;
      }

      // Update TrueNAS version in intro tags
      const versionTagElement = document.getElementById('truenas-version');
      if (versionTagElement && systemData.system.version) {
        versionTagElement.textContent = `TrueNAS ${systemData.system.version}`;
      }

      // Update processor model tag
      const processorElement = document.getElementById('processor-model');
      if (processorElement && systemData.system.model) {
        processorElement.textContent = systemData.system.model;
      }
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
      
      const data = await response.json();
      console.log('[status] Received data:', data);

      // Extract services and system data
      const serviceStatuses = data.services || data;  // Backwards compatible
      const systemData = data.system || {};

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

      // Update system metrics if available
      if (Object.keys(systemData).length > 0) {
        console.log('[status] Updating system metrics:', systemData);
        updateSystemMetrics(systemData);
      }
      
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