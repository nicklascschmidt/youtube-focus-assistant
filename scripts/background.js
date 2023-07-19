const COLOR_GREY = '#999999';
const COLOR_BLUE = [255, 0, 0, 0];

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({
    text: "OFF",
  });
  chrome.action.setBadgeBackgroundColor({
    color: COLOR_GREY
  });
});

const youtubeVideoUrl = 'https://www.youtube.com';

chrome.action.onClicked.addListener(async (tab) => {
  if (tab.url.startsWith(youtubeVideoUrl)) {
    // Retrieve the action badge to check if the extension is 'ON' or 'OFF'
    const prevState = await chrome.action.getBadgeText({ tabId: tab.id });
    const nextState = prevState === 'ON' ? 'OFF' : 'ON';
    const nextColorState = nextState === 'ON' ? COLOR_BLUE : COLOR_GREY;

    await chrome.action.setBadgeText({
      tabId: tab.id,
      text: nextState
    });
    await chrome.action.setBadgeBackgroundColor({
      tabId: tab.id,
      color: nextColorState
    });

    if (nextState === "ON") {
      await chrome.scripting.insertCSS({
        files: ["youtube-focus-assistant.css"],
        target: { tabId: tab.id },
      });
    } else if (nextState === "OFF") {
      await chrome.scripting.removeCSS({
        files: ["youtube-focus-assistant.css"],
        target: { tabId: tab.id },
      });
    }
  }
});