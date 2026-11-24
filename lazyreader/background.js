// Bam icon tren thanh cong cu -> mo/dong bang dieu khien trong trang.
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "toggle-panel" });
    await chrome.action.setBadgeText({ tabId: tab.id, text: "" });
  } catch (e) {
    // Trang mo truoc khi cai extension, hoac trang he thong (chrome://, Web Store).
    await chrome.action.setBadgeText({ tabId: tab.id, text: "!" });
    await chrome.action.setTitle({
      tabId: tab.id,
      title: "LazyReader: tải lại trang (F5) rồi bấm lại"
    });
  }
});
