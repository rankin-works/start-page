// DEV-ONLY SVG CACHE BUSTING (Live Server behind /proxy/550x)
// -----------------------------------------------------------
(function () {
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

  window.addEventListener("load", () => {
    const stamp = Date.now();
    console.log("[cache-bust] applying stamp", stamp);

    // Bust all SVG <img> tags
    document.querySelectorAll("img").forEach((img) => {
      const srcAttr = img.getAttribute("src");
      if (!srcAttr) return;
      if (!srcAttr.match(/\.svg(\?|$)/)) return; // only SVGs

      const cleanSrc = srcAttr.split("?")[0];
      const newSrc = `${cleanSrc}?v=${stamp}`;
      img.setAttribute("src", newSrc);

      console.log("[cache-bust] img ->", newSrc);
    });

    // Bust the favicon too (it's an SVG)
    const icon = document.querySelector('link[rel="icon"][href$=".svg"]');
    if (icon) {
      const iconHref = icon.getAttribute("href");
      const cleanIcon = iconHref.split("?")[0];
      const newIconHref = `${cleanIcon}?v=${stamp}`;
      icon.setAttribute("href", newIconHref);
      console.log("[cache-bust] favicon ->", newIconHref);
    }
  });
})();
