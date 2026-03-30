/**
 * Copy text to clipboard with secure context detection and legacy fallback.
 * Works on HTTPS, localhost, AND file:// protocol (D-13 compatibility).
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Whether copy succeeded
 */
export async function copyToClipboard(text) {
  // Modern API -- only available in secure contexts (HTTPS, localhost)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fall through to legacy method
    }
  }
  // Legacy fallback -- works everywhere including file:// protocol
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    return document.execCommand('copy');
  } catch (err) {
    return false;
  } finally {
    textarea.remove();
  }
}
