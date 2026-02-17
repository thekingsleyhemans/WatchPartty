chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "WATCHPARRTY_SET_AUTH") {
    chrome.storage.local.set({ watchparrty_auth: message.payload }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message?.type === "WATCHPARRTY_SET_ACTIVE_ROOM") {
    chrome.storage.local.set({ watchparrty_active_room: message.payload }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message?.type === "WATCHPARRTY_GET_STATE") {
    chrome.storage.local.get(["watchparrty_auth", "watchparrty_active_room"], (result) => {
      sendResponse({ ok: true, ...result });
    });
    return true;
  }

  return false;
});

chrome.runtime.onMessageExternal.addListener((message, _sender, sendResponse) => {
  if (message?.type === "WATCHPARRTY_SET_AUTH") {
    chrome.storage.local.set({ watchparrty_auth: message.payload }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  if (message?.type === "WATCHPARRTY_SET_ACTIVE_ROOM") {
    chrome.storage.local.set({ watchparrty_active_room: message.payload }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }

  return false;
});