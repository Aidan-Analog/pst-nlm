import type { ExtensionMessage, ProductInfo } from '../shared/types.js';

const STORAGE_KEY = 'productCache';

async function getCache(): Promise<Record<string, ProductInfo>> {
  const result = await chrome.storage.session.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as Record<string, ProductInfo>) ?? {};
}

async function setCache(tabId: number, product: ProductInfo) {
  const cache = await getCache();
  cache[String(tabId)] = product;
  await chrome.storage.session.set({ [STORAGE_KEY]: cache });
}

async function getProduct(tabId: number): Promise<ProductInfo | null> {
  const cache = await getCache();
  return cache[String(tabId)] ?? null;
}

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    if (message.type === 'PRODUCT_DETECTED' && sender.tab?.id != null) {
      const tabId = sender.tab.id;
      const product = message.payload;
      setCache(tabId, product).then(() => {
        if (product.price != null) {
          const priceStr = `${product.currencySymbol}${product.price.toFixed(0)}`;
          chrome.action.setBadgeText({ text: priceStr, tabId });
          chrome.action.setBadgeBackgroundColor({ color: '#0069D9', tabId });
        }
      });
    }

    if (message.type === 'GET_PRODUCT') {
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        const tabId = tabs[0]?.id ?? null;
        const product = tabId != null ? await getProduct(tabId) : null;
        sendResponse({ type: 'PRODUCT_RESPONSE', payload: product });
      });
      return true; // keep response channel open for async sendResponse
    }
  }
);

// Clean up session cache when tab closes
chrome.tabs.onRemoved.addListener(async (tabId) => {
  const cache = await getCache();
  delete cache[String(tabId)];
  await chrome.storage.session.set({ [STORAGE_KEY]: cache });
});
