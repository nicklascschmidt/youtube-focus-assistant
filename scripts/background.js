const COLOR_GREY = '#999';
const COLOR_BLUE = 'rgba(0, 0, 255, 1)';
const COLOR_RED = 'rgba(255, 0, 0, 1)';
const YOUTUBE_VIDEO_URL = 'https://www.youtube.com';

const unregisterAllDynamicContentScripts = async () => {
  try {
    console.log(1);
    const scripts = await chrome.scripting.getRegisteredContentScripts();
    console.log(2, scripts);
    const scriptIds = scripts.map((script) => script.id);
    console.log(3, scriptIds);
    return scriptIds.length > 0 && chrome.scripting.unregisterContentScripts(scriptIds);
  } catch (error) {
    const message = 'An unexpected error occurred while unregistering dynamic content scripts.';
    throw new Error(message, {cause: error});
  }
};

const getCurrentTab = async () => {
  return await chrome.tabs.query({active: true, lastFocusedWindow: true});
};

// When extension is switched to inactive, remove the content scripts and reload the page.
const runExtensionScriptsCleanup = async (tabId) => {
  console.log('run cleanup');
  // await unregisterAllDynamicContentScripts();
  await chrome.scripting.removeCSS({
    files: ['youtube-focus-assistant.css'],
    target: {tabId},
  });
  // Reload helps reset the styles we adjusted with the content scripts
  // await chrome.scripting.executeScript({
  //   files: ['scripts/content-reload_page.js'],
  //   target: {tabId: currentTabId},
  // });
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
const runExtensionScripts = async (tabId, nextIsActiveState) => {
  if (nextIsActiveState) {
    await chrome.scripting.insertCSS({
      files: ['youtube-focus-assistant.css'],
      target: {tabId},
    });
    await chrome.scripting.executeScript({
      files: [
        'scripts/content-autoplay.js',
        'scripts/content-miniplayer.js',
        'scripts/content-end_mode.js',
      ],
      target: {tabId},
    });
  }
};

const getIsExtensionActive = async () => {
  const storageItems = await chrome.storage.sync.get();
  return storageItems.isExtensionActive;
};

const handleBadgeUpdate = async (isExtensionActive, isTabYoutube) => {
  const nextBadgeText = !isTabYoutube ? 'N/A' : isExtensionActive ? 'ON' : 'OFF';
  const nextBadgeColor = !isTabYoutube ? COLOR_GREY : isExtensionActive ? COLOR_BLUE : COLOR_RED;
  await chrome.action.setBadgeText({text: nextBadgeText});
  await chrome.action.setBadgeBackgroundColor({color: nextBadgeColor});
};

const detectIsTabYoutube = async (url) => {
  let currentUrl = url || '';
  if (!currentUrl) {
    const [currentTab] = await getCurrentTab();
    currentUrl = currentTab?.url || '';
  }
  console.log('detectIsTabYoutube URL:', currentUrl);
  return currentUrl.startsWith(YOUTUBE_VIDEO_URL);
};

// ----- MOUNT -----
// When the browser loads:
// - get the ON/OFF state from storage sync, set it if it doesn't exist
// - run the extension setup processes
chrome.runtime.onInstalled.addListener(async () => {
  console.log('onInstalled running');

  // On load, check the active state of the chrome extension
  // If there's no active state yet, then set it to false.
  const isExtensionActive = await getIsExtensionActive();
  if (isExtensionActive === undefined) {
    chrome.storage.sync.set({isExtensionActive: false});
  }

  const isTabYoutube = await detectIsTabYoutube();
  await handleBadgeUpdate(isExtensionActive, isTabYoutube);

  if (isExtensionActive && isTabYoutube) {
    const [currentTab] = await getCurrentTab();
    console.log('currentTab', currentTab);
    await runExtensionScripts(currentTab.id, isExtensionActive);
  }
});

// ----- TAB CHANGE EVENT -----
chrome.tabs.onActivated.addListener(async (activeTabInfo) => {
  console.log('tab changed', activeTabInfo);

  const isExtensionActive = await getIsExtensionActive();
  const isTabYoutube = await detectIsTabYoutube();

  await handleBadgeUpdate(isExtensionActive, isTabYoutube);

  if (isExtensionActive && isTabYoutube) {
    await runExtensionScripts(activeTabInfo.tabId, isExtensionActive);
  }
});

// ----- URL CHANGE EVENT -----
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  console.log('tab update', tabId, changeInfo, tab);

  if (changeInfo.status === 'complete') {
    const isTabYoutube = await detectIsTabYoutube(changeInfo.url);
    if (isTabYoutube) {
      const isExtensionActive = await getIsExtensionActive();
      await handleBadgeUpdate(isExtensionActive, isTabYoutube);

      if (isExtensionActive) {
        await runExtensionScripts(tabId, isExtensionActive);
      }
    }
  }
});

// ----- EXTENSION CLICK EVENT -----
chrome.action.onClicked.addListener(async (tab) => {
  console.log('tab was clicked', tab);

  const isExtensionActive = await getIsExtensionActive();
  const isTabYoutube = await detectIsTabYoutube();
  const nextExtensionActiveState = !isExtensionActive;
  if (isTabYoutube) {
    await handleBadgeUpdate(nextExtensionActiveState, isTabYoutube);
    await chrome.storage.sync.set({isExtensionActive: nextExtensionActiveState});

    if (nextExtensionActiveState) {
      await runExtensionScripts(tab.id, nextExtensionActiveState);
    } else {
      runExtensionScriptsCleanup(tab.id);
    }
  }
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
