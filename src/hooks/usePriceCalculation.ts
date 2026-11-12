// usePriceCalculation Hook
//
// Fetches the price for a configuration from the (mocked) pricing API.
//
// Race-condition strategy: every distinct request gets a key derived from the
// pricing inputs. The effect cancels its own response on cleanup, so a slow
// response for an old configuration can never overwrite a newer one. We do NOT
// rely on server-provided ordering (the API's `timestamp` is an opaque id, not
// a clock), and `isLoading` is derived from "has the latest key settled?"
// rather than toggled by individual requests.

import { useState, useEffect, useEffectEvent } from 'react';
import type {
  Configuration,
  Product,
  PriceBreakdown,
} from '../components/ProductConfigurator/types';
import { ERROR_CODES } from '../components/ProductConfigurator/types';
import { calculatePrice } from '../services/api';
import { formatPrice } from '../utils/pricing';

interface UsePriceCalculationResult {
  price: PriceBreakdown | null;
  formattedTotal: string;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

type Outcome =
  | { key: string; status: 'success'; breakdown: PriceBreakdown; formattedTotal: string }
  | { key: string; status: 'error' };

/**
 * Custom hook for managing price calculation.
 *
 * While a newer request is in flight, the last successful price is kept so the
 * UI doesn't flash empty.
 */
export function usePriceCalculation(
  config: Configuration | null,
  product: Product,
): UsePriceCalculationResult {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Typing a draft name doesn't trigger a refetch.
  const requestKey = config
    ? JSON.stringify([product.id, config.selections, config.addOns, config.quantity, retryCount])
    : null;

  // Reads the latest config/product without making them effect dependencies.
  const requestPrice = useEffectEvent(() => calculatePrice(config!, product));

  useEffect(() => {
    if (requestKey === null) return;

    let cancelled = false;

    requestPrice()
      .then((response) => {
        if (cancelled) return;
        setOutcome({
          key: requestKey,
          status: 'success',
          breakdown: response.breakdown,
          formattedTotal: response.formattedTotal,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setOutcome({ key: requestKey, status: 'error' });
      });

    return () => {
      cancelled = true;
    };
  }, [requestKey]);

  const isCurrent = outcome !== null && outcome.key === requestKey;
  const isLoading = requestKey !== null && !isCurrent;
  const hasPrice = requestKey !== null && outcome?.status === 'success';

  return {
    price: hasPrice ? outcome.breakdown : null,
    formattedTotal: hasPrice ? outcome.formattedTotal : formatPrice(0, product.currency),
    isLoading,
    error: isCurrent && outcome.status === 'error' ? ERROR_CODES.PRICE_CALC_FAILED : null,
    refetch: () => setRetryCount((count) => count + 1),
  };
}
