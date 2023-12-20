// background.js
// so extension actions not enabled on every page
// chrome.action.disable();

chrome.runtime.onInstalled.addListener(async () => {
  // default values
  chrome.storage.sync.set({
    fileNameFormat: "{nick}-{word}-{timestamp}",
  });
});

chrome.runtime.onMessage.addListener(async (msg, sender) => {
  switch (msg.type) {
    case "nameFormat":
      setFileNameFormat(msg.value);
      break;
    case "takeScreenshot":
      console.log("capture screenshot");
      captureScreenshot();
      break;
    default:
      console.log("Cannot find handler for: ", msg.type);
  }
});

/* from the hotkey defined in manifest */
chrome.commands.onCommand.addListener((command) => {
  switch (command) {
    case "takeScreenshot":
      captureScreenshot();
      break;
    default:
      console.log("Cannot find handler for: ", command);
  }
});

chrome.tabs.onUpdated.addListener(checkActive);

function setFileNameFormat(value) {
  chrome.storage.sync.set({ fileNameFormat: value });
  chrome.storage.sync.get("fileNameFormat", (val) => {
    sendTabMessage({ type: "nameFormat", value: val });
  });
}

function getFileNameFormat() {
  chrome.storage.sync.get("fileNameFormat", (val) => {
    return val;
  });
}

function checkActive(tabId, changeInfo, tab) {
  if (changeInfo.status === "complete") {
    /* doesnt seem to be working atm? */
    if (tab.url.startsWith("https://skribbl.io")) {
      chrome.action.enable(tabId);
    }
  } else {
    chrome.action.disable(tabId);
    return;
  }
}

// wrapper for send message to current tab
async function sendTabMessage(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, message);
  });
}

async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}

async function captureScreenshot() {
  /* we dont have access to the page in take screenshot */
  try {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      sendTabMessage({ type: "screenshot", value: dataUrl });
    });
  } catch (err) {
    console.log(err);
  }
}
