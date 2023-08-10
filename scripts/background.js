const COLOR_GREY = '#999';
const COLOR_BLUE = 'rgba(0, 0, 255, 1)';
const COLOR_RED = 'rgba(255, 0, 0, 1)';
const YOUTUBE_VIDEO_URL = 'https://www.youtube.com';

// When ext is active, inject the CSS file and store the tab ID so we know it's been applied.
const insertCssAndUpdateStorage = async (tabId) => {
  const storageItems = await chrome.storage.sync.get();
  if (!storageItems.tabsWithCssInjected[tabId]) {
    await chrome.scripting.insertCSS({
      files: ['youtube-focus-assistant.css'],
      target: {tabId},
    });
    const nextTabsWithCssInjected = {...storageItems.isCssInjected, [tabId]: true};
    await chrome.storage.sync.set({tabsWithCssInjected: nextTabsWithCssInjected});
  }
};

// During cleanup, remove the CSS file and clear out the tab ID from storage.
// NOTE: if we inject CSS twice and remove it once, the first CSS will still be present.
const removeCssAndUpdateStorage = async (tabId) => {
  const storageItems = await chrome.storage.sync.get();
  if (storageItems.tabsWithCssInjected[tabId]) {
    await chrome.scripting.removeCSS({
      files: ['youtube-focus-assistant.css'],
      target: {tabId},
    });
    const {[tabId]: _, ...remainingTabIds} = storageItems.tabsWithCssInjected;
    await chrome.storage.sync.set({tabsWithCssInjected: remainingTabIds});
  }
};

// When ext is switched to inactive, run the cleanup processes for each content script
//  and remove the applied CSS file.
// Content script cleanup - clear mutation observers and reverse style updates.
const runExtensionScriptsCleanup = async (tabId) => {
  await chrome.tabs.sendMessage(tabId, {shouldCleanup: true});
  await removeCssAndUpdateStorage(tabId);
};

// When ext is switched to active, run content scripts and insert the CSS file.
const runExtensionScripts = async (tabId) => {
  await insertCssAndUpdateStorage(tabId);
  await chrome.scripting.executeScript({
    target: {tabId},
    files: ['scripts/content-autoplay.js', 'scripts/content-miniplayer.js'],
  });
};

const getCurrentTab = async () => {
  return await chrome.tabs.query({active: true, lastFocusedWindow: true});
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
  return currentUrl.startsWith(YOUTUBE_VIDEO_URL);
};

// ----- MOUNT -----
// When the browser (and extension) loads:
// - Initialize the storage value for isExtensionActive (persisted across a browser refresh)
// - Initialize the storage value for the tabs with CSS applied (resets to default value)
// - Update the badge accordingly
// - If active, run the content scripts
chrome.runtime.onInstalled.addListener(async () => {
  // On load, check the active state of the chrome extension
  // If there's no active state yet, then set it to false.
  const isExtensionActive = await getIsExtensionActive();
  if (isExtensionActive === undefined) {
    await chrome.storage.sync.set({isExtensionActive: false});
  }
  await chrome.storage.sync.set({tabsWithCssInjected: {}});

  const isTabYoutube = await detectIsTabYoutube();
  await handleBadgeUpdate(isExtensionActive, isTabYoutube);

  if (isExtensionActive && isTabYoutube) {
    const [currentTab] = await getCurrentTab();
    await runExtensionScripts(currentTab.id);
  }
});

// ----- TAB CHANGE EVENT -----
chrome.tabs.onActivated.addListener(async (activeTabInfo) => {
  const isExtensionActive = await getIsExtensionActive();
  const isTabYoutube = await detectIsTabYoutube();

  await handleBadgeUpdate(isExtensionActive, isTabYoutube);

  if (isExtensionActive && isTabYoutube) {
    await runExtensionScripts(activeTabInfo.tabId);
  }
});

// ----- URL CHANGE EVENT -----
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, _tab) => {
  if (changeInfo.status === 'complete') {
    const isTabYoutube = await detectIsTabYoutube(changeInfo.url);
    if (isTabYoutube) {
      const isExtensionActive = await getIsExtensionActive();
      await handleBadgeUpdate(isExtensionActive, isTabYoutube);

      if (isExtensionActive) {
        await runExtensionScripts(tabId);
      }
    }
  }
});

// ----- EXTENSION CLICK EVENT -----
chrome.action.onClicked.addListener(async (tab) => {
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
