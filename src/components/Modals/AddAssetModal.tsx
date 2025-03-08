import { Loader2, Search, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";
import { useDebouncedCallback } from "use-debounce";

import { usePortfolioSelector } from "../../hooks/usePortfolio";
import { EQUITY_TYPES, getHistoricalData, searchAssets } from "../../services/yahooFinanceService";
import { Asset } from "../../types";
import { intervalBasedOnDateRange } from "../../utils/calculations/intervalBasedOnDateRange";

export default function AddAssetModal({ onClose }: { onClose: () => void }) {
    const [ search, setSearch ] = useState('');
    const [ searchResults, setSearchResults ] = useState<Asset[]>([]);
    const [ loading, setLoading ] = useState<null | "searching" | "adding">(null);
    const [ equityType, setEquityType ] = useState<string>(EQUITY_TYPES.all);
    const { addAsset, dateRange, assets } = usePortfolioSelector((state) => ({
        addAsset: state.addAsset,
        dateRange: state.dateRange,
        assets: state.assets,
    }));

    const handleSearch = (query: string) => {
        if (query.length < 2) return;
        setLoading("searching");
        setTimeout(async () => {
            try {
                const results = await searchAssets(query, equityType);
                setSearchResults(results.filter((result) => !assets.some((asset) => asset.symbol === result.symbol)));
            } catch (error) {
                console.error('Error searching assets:', error);
            } finally {
                setLoading(null);
            }
        }, 10);
    };

    const debouncedSearch = useDebouncedCallback(handleSearch, 750);

    const handleAssetSelect = (asset: Asset, keepOpen: boolean = false) => {
        setLoading("adding");
        setTimeout(async () => {
            try {
                const { historicalData, longName } = await getHistoricalData(
                    asset.symbol,
                    dateRange.startDate,
                    dateRange.endDate,
                    intervalBasedOnDateRange(dateRange),
                );

                if (historicalData.size === 0) {
                    toast.error(`No historical data available for ${asset.name}`);
                    return;
                }

                const assetWithHistory = {
                    ...asset,
                    name: longName || asset.name,
                    historicalData,
                };

                addAsset(assetWithHistory);
                toast.success(`Successfully added ${assetWithHistory.name}`);
                if (!keepOpen) {
                    onClose();
                } else {
                    setSearch("");
                    setSearchResults([]);
                }
            } catch (error) {
                console.error('Error fetching historical data:', error);
                toast.error(`Failed to add ${asset.name}. Please try again.`);
            } finally {
                setLoading(null);
            }
        }, 10);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold dark:text-gray-200">Add Asset</h2>
                    <div className="flex items-center gap-2 justify-end">
                        <label className="text-sm font-medium text-gray-800/30 dark:text-gray-200/30">Asset Type:</label>
                        <select value={equityType} onChange={(e) => {
                            setEquityType(e.target.value);
                            debouncedSearch(search);
                        }} className="w-[30%] p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:outline-none dark:text-gray-300">
                            {Object.entries(EQUITY_TYPES).map(([key, value]) => (
                                <option key={key} value={value}>{key.charAt(0).toUpperCase() + key.slice(1)}</option>
                            ))}
                        </select>
                        <button onClick={onClose} className="p-2">
                            <X className="w-6 h-6 dark:text-gray-200" />
                        </button>
                    </div>
                </div>

                <div className="relative mb-4">
                    <input
                        type="text"
                        placeholder="Search by symbol or name..."
                        className="w-full p-2 pr-10 border rounded dark:bg-slate-800 dark:border-slate-700 dark:outline-none dark:text-gray-300"
                        value={search}
                        autoFocus
                        onChange={(e) => {
                            setSearch(e.target.value);
                            debouncedSearch(e.target.value);
                        }}
                    />
                    <Search className="absolute right-3 top-2.5 w-5 h-5 text-gray-400" />
                </div>

                <div className="max-h-96 overflow-y-auto">
                    {loading ? (
                        <div className="flex items-center text-center py-4 gap-2 dark:text-slate-300">
                            <Loader2 className="animate-spin" size={16} />
                            <span>{loading === "searching" ? "Searching Assets..." : "Fetching Details & Adding..."}</span>
                        </div>
                    ) : (
                        searchResults.map((result) => (
                            <div
                                key={result.symbol}
                                className="w-full text-left p-3 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-900 rounded border-b dark:border-slate-700 border-gray-300"
                            >
                                <div className="font-medium flex justify-between">
                                    <span>{result.name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className={!result.priceChangePercent?.includes("-") ? "text-green-500/75" : "text-red-500/75"}>
                                            {!result.priceChangePercent?.includes("-") && "+"}{result.priceChangePercent}
                                        </span>
                                        {result.price}
                                    </div>
                                </div>
                                <div className="text-sm text-gray-600">
                                    Ticker-Symbol: {result.symbol} | Type: {result.quoteType?.toUpperCase() || "Unknown"} | Rank: #{result.rank || "-"}
                                </div>
                                <div className="mt-2 flex gap-2">
                                    <button
                                        onClick={() => handleAssetSelect(result, false)}
                                        disabled={loading === "adding"}
                                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                        Add
                                    </button>
                                    <button
                                        onClick={() => handleAssetSelect(result, true)}
                                        disabled={loading === "adding"}
                                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                    >
                                        Add &amp; Add Another
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
