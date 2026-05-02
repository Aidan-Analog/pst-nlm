import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type { CompareResponse, ProductInfo } from '../shared/types.js';
import { PriceCard } from './components/PriceCard.js';
import { LoadingSpinner } from './components/LoadingSpinner.js';
import './popup.css';

const API_BASE_URL = (import.meta.env.API_BASE_URL as string | undefined) ?? 'http://localhost:3001';

type UIState =
  | { phase: 'loading-product' }
  | { phase: 'no-product' }
  | { phase: 'fetching'; product: ProductInfo }
  | { phase: 'results'; product: ProductInfo; data: CompareResponse }
  | { phase: 'error'; product: ProductInfo | null; message: string };

const REGION_LABELS: Record<string, string> = {
  us: 'United States',
  uk: 'UK / Ireland',
  europe: 'Europe',
};

function App() {
  const [state, setState] = useState<UIState>({ phase: 'loading-product' });

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_PRODUCT' }, (response) => {
      if (chrome.runtime.lastError) {
        setState({ phase: 'error', product: null, message: 'Could not connect to extension background.' });
        return;
      }
      const product: ProductInfo | null = response?.payload ?? null;
      if (!product) {
        setState({ phase: 'no-product' });
        return;
      }
      setState({ phase: 'fetching', product });
    });
  }, []);

  useEffect(() => {
    if (state.phase !== 'fetching') return;
    const { product } = state;

    const controller = new AbortController();
    fetch(`${API_BASE_URL}/api/price-compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: product.name, price: product.price, region: product.region }),
      signal: controller.signal,
    })
      .then(r => r.json() as Promise<CompareResponse>)
      .then(data => {
        if (data.error && !data.results?.length) {
          setState({ phase: 'error', product, message: data.error });
        } else {
          setState({ phase: 'results', product, data });
        }
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setState({ phase: 'error', product, message: err.message ?? 'Request failed' });
        }
      });

    return () => controller.abort();
  }, [state.phase]);

  if (state.phase === 'loading-product') {
    return (
      <>
        <Header />
        <LoadingSpinner message="Detecting product on this page…" />
      </>
    );
  }

  if (state.phase === 'no-product') {
    return (
      <>
        <Header />
        <div className="empty-state">
          <div className="empty-state__icon">🛍️</div>
          <div className="empty-state__title">No product detected</div>
          <div className="empty-state__desc">
            Navigate to a product page on Amazon, Currys, Argos, John Lewis, or another retailer.
          </div>
        </div>
      </>
    );
  }

  const product = state.phase === 'fetching' || state.phase === 'results' || state.phase === 'error'
    ? state.product
    : null;

  return (
    <>
      <Header region={product?.region} />
      {product && <ProductCard product={product} />}
      {state.phase === 'fetching' && <LoadingSpinner />}
      {state.phase === 'error' && (
        <div className="error-banner">⚠ {state.message}</div>
      )}
      {state.phase === 'results' && (
        <>
          <div className="section-label">Compare prices</div>
          {state.data.results.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__desc">No price data found for other retailers.</div>
            </div>
          ) : (
            state.data.results.map(r => (
              <PriceCard key={r.retailerDomain} result={r} currentPrice={product?.price ?? null} />
            ))
          )}
        </>
      )}
      <div className="footer">Powered by Price Companion</div>
    </>
  );
}

function Header({ region }: { region?: string }) {
  return (
    <div className="header">
      <span className="header__logo">💰 Price Companion</span>
      {region && <span className="header__badge">{REGION_LABELS[region] ?? region}</span>}
    </div>
  );
}

function ProductCard({ product }: { product: ProductInfo }) {
  return (
    <div className="product-card">
      <div className="product-card__name">{product.name}</div>
      <div className="product-card__meta">
        {product.price != null ? (
          <span className="product-card__price">
            {product.currencySymbol}{product.price.toFixed(2)}
          </span>
        ) : (
          <span>Price not detected</span>
        )}
        <span className="product-card__source">{product.source}</span>
      </div>
    </div>
  );
}

const root = document.getElementById('popup-root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
