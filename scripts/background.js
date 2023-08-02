const COLOR_GREY = '#999999';
const COLOR_BLUE = [255, 0, 0, 0];
const YOUTUBE_VIDEO_URL = 'https://www.youtube.com';

const unregisterAllDynamicContentScripts = async () => {
  try {
    console.log(1);
    const scripts = await chrome.scripting.getRegisteredContentScripts();
    console.log(2, scripts);
    const scriptIds = scripts.map((script) => script.id);
    console.log(3, scriptIds);
    return chrome.scripting.unregisterContentScripts(scriptIds);
  } catch (error) {
    const message = 'An unexpected error occurred while unregistering dynamic content scripts.';
    throw new Error(message, {cause: error});
  }
};

const getCurrentTab = async () => {
  return await chrome.tabs.query({active: true, lastFocusedWindow: true});
};

// When extension is switched to inactive, remove the content scripts and reload the page.
const handleScriptingCleanUp = async (currentTabId) => {
  await unregisterAllDynamicContentScripts();
  await chrome.scripting.removeCSS({
    files: ['youtube-focus-assistant.css'],
    target: {tabId: currentTabId},
  });
  // Reload helps reset the styles we adjusted with the content scripts
  await chrome.scripting.executeScript({
    files: ['scripts/content-reload_page.js'],
    target: {tabId: currentTabId},
  });
};

// On load and when badge is clicked
// - Switch the text displayed on the extension badge
// - Set the background color
// - Update the extension active state value in storage
const handleBadgeAndStorageUpdate = async (nextIsActiveState) => {
  await chrome.action.setBadgeText({text: nextIsActiveState ? 'ON' : 'OFF'});
  await chrome.action.setBadgeBackgroundColor({
    color: nextIsActiveState ? COLOR_BLUE : COLOR_GREY,
  });
  await chrome.storage.sync.set({isExtensionActive: nextIsActiveState});
};

// When clicked or on load, retrieve the extension active state from storage,
// then run extension scripts.
const runExtensionProcesses = async (nextIsActiveState, isInitialLoad) => {
  const [currentTab] = await getCurrentTab();
  console.log('currentTab', currentTab);

  await handleBadgeAndStorageUpdate(nextIsActiveState);

  // When the extension is switched to active, run the content scripts and update the CSS.
  if ((currentTab?.url || '').startsWith(YOUTUBE_VIDEO_URL)) {
    if (nextIsActiveState) {
      await chrome.scripting.insertCSS({
        files: ['youtube-focus-assistant.css'],
        target: {tabId: currentTab.id},
      });
      await chrome.scripting.executeScript({
        files: [
          'scripts/content-autoplay.js',
          'scripts/content-miniplayer.js',
          'scripts/content-end_mode.js',
        ],
        target: {tabId: currentTab.id},
      });
    } else if (!nextIsActiveState && !isInitialLoad) {
      handleScriptingCleanUp(currentTab.id);
    }
  }
};

// When the browser loads:
// - get the ON/OFF state from storage sync, set it if it doesn't exist
// - run the extension setup processes
chrome.runtime.onInstalled.addListener(async () => {
  console.log('onInstalled running');

  // On load, check the active state of the chrome extension
  // If there's no active state yet, then set it to false.
  const {isExtensionActive} = await chrome.storage.sync.get();
  if (isExtensionActive === undefined) {
    chrome.storage.sync.set({isExtensionActive: false});
  }

  runExtensionProcesses(isExtensionActive, true);
});

chrome.action.onClicked.addListener(async (tab) => {
  console.log('tab was clicked', tab);

  const {isExtensionActive} = await chrome.storage.sync.get();
  runExtensionProcesses(!isExtensionActive, false);
});

chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log('changes', changes);
  console.log('namespace', namespace);

  for (let [key, {oldValue, newValue}] of Object.entries(changes)) {
    console.log(
      `Storage key "${key}" in namespace "${namespace}" changed.`,
      `Old value was "${oldValue}", new value is "${newValue}".`
    );
  }
});
