import { watchForProduct } from '../shared/extractors.js';
import type { ProductInfo } from '../shared/types.js';

function sendProduct(product: ProductInfo) {
  chrome.runtime.sendMessage({ type: 'PRODUCT_DETECTED', payload: product });
}

watchForProduct(sendProduct);
