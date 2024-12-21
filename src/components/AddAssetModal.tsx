import { Search, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { getHistoricalData, searchAssets } from "../services/yahooFinanceService";
import { usePortfolioStore } from "../store/portfolioStore";
import { Asset } from "../types";

export const AddAssetModal = ({ onClose }: { onClose: () => void }) => {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const { addAsset, dateRange } = usePortfolioStore((state) => ({
    addAsset: state.addAsset,
    dateRange: state.dateRange,
  }));
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const debouncedSearch = useCallback((query: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(query);
    }, 500);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const handleSearch = async (query: string) => {
    if (query.length < 2) return;
    setLoading(true);
    try {
      const results = await searchAssets(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssetSelect = async (asset: Asset) => {
    setLoading(true);
    try {
      const historicalData = await getHistoricalData(
        asset.symbol,
        dateRange.startDate,
        dateRange.endDate
      );

      const assetWithHistory = {
        ...asset,
        historicalData,
      };

      addAsset(assetWithHistory);
      onClose();
    } catch (error) {
      console.error('Error fetching historical data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold dark:text-gray-200">Add Asset</h2>
          <button onClick={onClose} className="p-2">
            <X className="w-6 h-6 dark:text-gray-200" />
          </button>
        </div>

        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search by symbol or name..."
            className="w-full p-2 pr-10 border rounded dark:bg-slate-800 dark:border-slate-700 dark:outline-none dark:text-gray-300"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              debouncedSearch(e.target.value);
            }}
          />
          <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : (
            searchResults.map((result) => (
              <button
                key={result.symbol}
                className="w-full text-left p-3 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-900 rounded"
                onClick={() => handleAssetSelect(result)}
              >
                <div className="font-medium">{result.name}</div>
                <div className="text-sm text-gray-600">
                  Symbol: {result.symbol}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
