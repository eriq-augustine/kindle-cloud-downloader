chrome.browserAction.onClicked.addListener(function(tab) {
    // On clicking the browser action, try and download.
    chrome.tabs.sendMessage(tab.id, '');
});
