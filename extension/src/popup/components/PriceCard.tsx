import type { PriceResult } from '../../shared/types.js';

interface Props {
  result: PriceResult;
  currentPrice: number | null;
}

export function PriceCard({ result, currentPrice }: Props) {
  const hasPrice = result.price != null;
  const saving = currentPrice != null && result.price != null ? currentPrice - result.price : null;
  const savingPct = saving != null && currentPrice ? Math.round((saving / currentPrice) * 100) : null;

  let badgeClass = 'price-card__badge--same';
  let badgeText = 'Same price';
  if (saving !== null) {
    if (saving > 0.01) {
      badgeClass = 'price-card__badge--save';
      badgeText = `Save ${result.currencySymbol}${saving.toFixed(2)}${savingPct ? ` (${savingPct}%)` : ''}`;
    } else if (saving < -0.01) {
      badgeClass = 'price-card__badge--expensive';
      badgeText = `+${result.currencySymbol}${Math.abs(saving).toFixed(2)} more`;
    }
  }

  return (
    <a
      href={result.url}
      target="_blank"
      rel="noopener noreferrer"
      className="price-card"
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="price-card__retailer">{result.retailer}</div>
        <div className="price-card__domain">{result.retailerDomain}</div>
        {result.inStock === false && (
          <div className="price-card__stock">Out of stock</div>
        )}
      </div>

      <div className="price-card__price-col">
        {hasPrice ? (
          <>
            <div className="price-card__price">
              {result.currencySymbol}{result.price!.toFixed(2)}
            </div>
            {currentPrice != null && (
              <div className={`price-card__badge ${badgeClass}`}>{badgeText}</div>
            )}
          </>
        ) : (
          <div className="price-card__unavailable">No price found</div>
        )}
      </div>

      <div className="price-card__arrow">›</div>
    </a>
  );
}
