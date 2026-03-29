/**
 * Load brokers.json with file:// protocol fallback.
 * Strategy:
 * 1. Try fetch() -- works over http:// (Vite dev server, production)
 * 2. If fetch fails (file:// CORS block), check window global
 * 3. Try ES module import as last resort
 * 4. Return empty array with console warning
 * @returns {Promise<Array>} Array of broker objects
 */
export async function loadBrokers() {
  try {
    const response = await fetch('./brokers.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (e) {
    if (window.__ERASUREKIT_BROKERS__) {
      return window.__ERASUREKIT_BROKERS__;
    }
    try {
      // Dynamic path prevents Rollup from failing on missing file at build time
      const path = './brokers' + '.js';
      const module = await import(/* @vite-ignore */ path);
      return module.default;
    } catch (e2) {
      console.warn('ErasureKit: Could not load brokers.json. Using empty broker list.');
      console.warn('Tip: Use a local server (e.g., "npx serve src") for full functionality.');
      return [];
    }
  }
}
