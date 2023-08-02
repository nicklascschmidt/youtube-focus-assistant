// This is a mutation observer for detecting when the video end screen appears
// When it's active, hide the end screen content (which are recommendations
//  since we automatically disable autoplay)

(async () => {
  console.log('initiating content end_mode script');

  const END_SCREEN_EL_SELECTOR = '.html5-endscreen';

  // Select the node that will be observed for mutations
  const endScreenObserveEl = document.querySelector(END_SCREEN_EL_SELECTOR);

  // Options for the observer (which mutations to observe)
  const observedMutations = {attributeFilter: ['style']};

  // Callback function to execute when mutations are observed
  const callback = (_mutationList, _observer) => {
    const endscreenEl = document.querySelector(END_SCREEN_EL_SELECTOR);
    endscreenEl.style.display = 'none';

    // Note we are not calling observer.disconnect() bc we're constantly watching if the miniplayer is active.
  };

  // Create an observer instance linked to the callback function
  const observer = new MutationObserver(callback);

  // Start observing the target node for configured mutations
  observer.observe(endScreenObserveEl, observedMutations);
})();
