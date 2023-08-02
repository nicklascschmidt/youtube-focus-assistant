// This content script is invoked when the extension is switched on.
// It switches the autoplay button to OFF and disables user actions.

(() => {
  console.log('initiating content autoplay script');

  // Disable autoplay
  const autoplayButtonEl = document.querySelector(
    "[data-tooltip-target-id='ytp-autonav-toggle-button']"
  );
  const isAutoplayOn = autoplayButtonEl.getAttribute('aria-label') === 'Autoplay is on';
  if (isAutoplayOn) {
    autoplayButtonEl.click();
  }
  autoplayButtonEl.setAttribute('disabled', true);

  // Show autoplay cursor as disabled
  autoplayButtonEl.style.cursor = 'not-allowed';
  const autoplayButtonDivEl = document.querySelector('.ytp-autonav-toggle-button');
  if (autoplayButtonDivEl) {
    autoplayButtonDivEl.style.cursor = 'not-allowed';
  }
})();
