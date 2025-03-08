import { useState, useEffect, useRef } from 'react';
import { getHistoricalData } from '../services/yahooFinanceService';

interface LivePriceOptions {
  symbol: string;
  refreshInterval?: number; // in milliseconds, default 60000 (1 minute)
  enabled?: boolean;
}

export function useLivePrice({ symbol, refreshInterval = 60000, enabled = true }: LivePriceOptions) {
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastPrice, setLastPrice] = useState<number | null>(null);
  const [usedCurrency, setUsedCurrency] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const timerRef = useRef<number | null>(null);

  const fetchLivePrice = async () => {
    if (!symbol || !enabled) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Calculate time range for the last 10 minutes
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 10 * 60 * 1000); // 10 minutes ago
      
      const { historicalData, lastPrice, currency } = await getHistoricalData(
        symbol,
        startDate,
        endDate,
        "1m" // 1-minute interval
      );
      
      if(!usedCurrency) {
        setUsedCurrency(currency ?? null);
      }
      // Get the most recent price
      if (historicalData.size > 0) {
        const entries = Array.from(historicalData.entries());
        const latestEntry = entries[entries.length - 1];
        setLivePrice(latestEntry[1]);
        setLastUpdated(new Date());
        setLastPrice(null);
      } else {
        setLastPrice(lastPrice ?? null);
      }
    } catch (err) {
      console.error(`Error fetching live price for ${symbol}:`, err);
      setError(err instanceof Error ? err : new Error('Failed to fetch live price'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    if (enabled) {
      fetchLivePrice();
    }
    
    // Set up interval for periodic updates
    if (enabled && refreshInterval > 0) {
      timerRef.current = window.setInterval(fetchLivePrice, lastPrice ? refreshInterval : refreshInterval * 10);
    }
    
    // Cleanup
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
      }
    };
  }, [symbol, refreshInterval, enabled]);

  return {
    livePrice,
    isLoading,
    error,
    lastUpdated,
    lastPrice,
    currency: usedCurrency,
    refetch: fetchLivePrice
  };
} 