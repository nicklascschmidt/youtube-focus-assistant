// This is a mutation observer for detecting if the miniplayer is active
// When it's active, hide the page content (which shows the recommendations)

(() => {
  console.log('initiating content miniplayer script');

  const MINIPLAYER_IS_ACTIVE_ATTRIBUTE = 'miniplayer-is-active';

  // Select the node that will be observed for mutations
  const youtubeAppObserveEl = document.querySelector('ytd-app');

  // Options for the observer (which mutations to observe)
  const observedMutations = {attributeFilter: [MINIPLAYER_IS_ACTIVE_ATTRIBUTE]};

  const updatePageStylingFromMiniplayer = (el) => {
    const isMiniplayerActive = el.getAttribute(MINIPLAYER_IS_ACTIVE_ATTRIBUTE) === '';
    const youtubePageContent = document.querySelector('ytd-page-manager#page-manager');
    if (isMiniplayerActive) {
      youtubePageContent.style.display = 'none';
    } else {
      youtubePageContent.style.display = 'flex';
    }
  };

  const cleanupStyling = () => {
    const youtubePageContent = document.querySelector('ytd-page-manager#page-manager');
    youtubePageContent.style.display = 'flex';
  };

  // Callback function to execute when mutations are observed
  const callback = (mutationList, _observer) => {
    for (const mutation of mutationList) {
      if (mutation.attributeName === MINIPLAYER_IS_ACTIVE_ATTRIBUTE) {
        updatePageStylingFromMiniplayer(mutation.target);
      }
    }

    // Note we are not calling observer.disconnect() bc we're constantly watching if the miniplayer is active.
  };

  // Create an observer instance linked to the callback function
  const observer = new MutationObserver(callback);

  // Initialization
  // - Start observing the target node for configured mutations
  // - Check the miniplayer status and update if needed (only relevant when miniplayer is active and extension is turned on)
  observer.observe(youtubeAppObserveEl, observedMutations);
  updatePageStylingFromMiniplayer(youtubeAppObserveEl);

  // Cleanup
  chrome.runtime.onMessage.addListener((request, _sender, _sendResponse) => {
    if (request.shouldCleanup) {
      cleanupStyling();
      observer.disconnect();
    }
  });
})();
