// This is a mutation observer for watching changes to the <ytd-app> element's attribute: "miniplayer-is-active".
// When it's active, hide the page content, which shows the recommendations.

// Select the node that will be observed for mutations
const targetNode = document.querySelector("ytd-app");

// Options for the observer (which mutations to observe)
const observedMutations = { attributes: true };

// Callback function to execute when mutations are observed
const callback = (mutationList, _observer) => {
  for (const mutation of mutationList) {

    if (mutation.attributeName === 'miniplayer-is-active') {
      const isMiniPlayerActive = mutation.target.getAttribute('miniplayer-is-active') === '';
      const youtubePageContent = document.querySelector('ytd-page-manager#page-manager');
      if (isMiniPlayerActive) {
        youtubePageContent.style.display = 'none';
      } else {
        youtubePageContent.style.display = 'flex';
      }
    }
  }

  // Note we are not calling observer.disconnect() bc we're constantly watching if the miniplayer is active.
};

// Create an observer instance linked to the callback function
const observer = new MutationObserver(callback);

// Start observing the target node for configured mutations
observer.observe(targetNode, observedMutations);
