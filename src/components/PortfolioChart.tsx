import { format } from "date-fns";
import { X, ChevronDown, Loader2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { useDarkMode } from "../hooks/useDarkMode";
import { usePortfolioSelector } from "../hooks/usePortfolio";
import { getHistoricalData } from "../services/yahooFinanceService";
import { DateRange } from "../types";
import { calculatePortfolioValue } from "../utils/calculations/portfolioValue";
import { getHexColor } from "../utils/formatters";
import { ChartContent } from "./Chart/ChartContent";
import { DateRangePicker } from "./utils/DateRangePicker";
import { ChartLegend } from "./Chart/ChartLegend";
import { useIsMobile } from "./utils/IsMobile";
import { intervalBasedOnDateRange } from "../utils/calculations/intervalBasedOnDateRange";

export default function PortfolioChart() {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [hideAssets, setHideAssets] = useState(false);
    const [hiddenAssets, setHiddenAssets] = useState<Set<string>>(new Set());
    const [showLegendAndDateRange, setShowLegendAndDateRange] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const [isHistoricalLoading, setIsHistoricalLoading] = useState(false);
    const { isDarkMode } = useDarkMode();
    const isMobile = useIsMobile();

    const { assets, dateRange, updateDateRange, updateAssetHistoricalData } = usePortfolioSelector((state) => ({
        assets: state.assets,
        dateRange: state.dateRange,
        updateDateRange: state.updateDateRange,
        updateAssetHistoricalData: state.updateAssetHistoricalData,
    }));

    const fetchHistoricalData = useCallback(
        async (startDate: Date, endDate: Date) => {
            for (const asset of assets) {
                const { historicalData, longName } = await getHistoricalData(asset.symbol, startDate, endDate, intervalBasedOnDateRange({  startDate, endDate }));
                updateAssetHistoricalData(asset.id, historicalData, longName);
            }
        },
        [assets, updateAssetHistoricalData]
    );

    const assetColors: Record<string, string> = useMemo(() => {
        const usedColors = new Set<string>();
        return assets.reduce((colors, asset) => {
            const color = getHexColor(usedColors, isDarkMode);
            usedColors.add(color);
            return {
                ...colors,
                [asset.id]: color,
            };
        }, {});
    }, [assets, isDarkMode]);

    const data = useMemo(() => calculatePortfolioValue(assets, dateRange), [assets, dateRange]);

    const allAssetsInvestedKapitals = useMemo<Record<string, number>>(() => {
        const investedKapitals: Record<string, number> = {};

        for (const asset of assets) {
            investedKapitals[asset.id] = asset.investments.reduce((acc, curr) => acc + curr.amount, 0);
        }

        return investedKapitals;
    }, [assets]);

    // Compute the initial price for each asset as the first available value (instead of using data[0])
    const initialPrices = useMemo(() => {
        const prices: Record<string, number> = {};
        assets.forEach(asset => {
            for (let i = 0; i < data.length; i++) {
                const price = data[i].assets[asset.id];
                if (price != null) { // check if data exists
                    prices[asset.id] = price;
                    break;
                }
            }
        });
        return prices;
    }, [assets, data]);

    // Calculate percentage changes for each asset using the first available price from initialPrices
    const processedData = useMemo(() => data.map(point => {
        const processed: { date: string, total: number, invested: number, percentageChange: number, ttwor: number, ttwor_percent: number, [key: string]: number | string } = {
            date: format(point.date, 'yyyy-MM-dd'),
            total: point.total,
            invested: point.invested,
            percentageChange: point.percentageChange,
            ttwor: 0,
            ttwor_percent: 0,
        };

        for (const asset of assets) {
            const initialPrice = initialPrices[asset.id]; // use the newly computed initial price
            const currentPrice = point.assets[asset.id];
            if (initialPrice && currentPrice) {
                processed[`${asset.id}_price`] = currentPrice;
                const percentDecimal = ((currentPrice - initialPrice) / initialPrice);
                processed[`${asset.id}_percent`] = percentDecimal * 100;
                processed.ttwor += allAssetsInvestedKapitals[asset.id] + allAssetsInvestedKapitals[asset.id] * percentDecimal;
            }
        }

        processed.ttwor_percent = (processed.ttwor - Object.values(allAssetsInvestedKapitals).reduce((acc, curr) => acc + curr, 0)) / Object.values(allAssetsInvestedKapitals).reduce((acc, curr) => acc + curr, 0) * 100;
        return processed;
    }), [data, assets, allAssetsInvestedKapitals, initialPrices]);

    const toggleAsset = useCallback((assetId: string) => {
        const newHiddenAssets = new Set(hiddenAssets);
        if (newHiddenAssets.has(assetId)) {
            newHiddenAssets.delete(assetId);
        } else {
            newHiddenAssets.add(assetId);
        }
        setHiddenAssets(newHiddenAssets);
    }, [hiddenAssets]);

    const toggleAllAssets = useCallback(() => {
        setHideAssets(!hideAssets);
        setHiddenAssets(new Set());
    }, [hideAssets]);

    const handleUpdateDateRange = useCallback((newRange: DateRange) => {
        setIsHistoricalLoading(true);
        updateDateRange(newRange);
        fetchHistoricalData(newRange.startDate, newRange.endDate)
            .catch((err) => {
                console.error("Error fetching historical data:", err);
            })
            .finally(() => {
                setIsHistoricalLoading(false);
            });
    }, [updateDateRange, fetchHistoricalData]);

    if (isFullscreen) {
        return (
            <div className="fixed inset-0 bg-white dark:bg-slate-800 z-50 overflow-hidden flex flex-col">
                <div className="flex justify-between items-center p-2 border-b dark:border-slate-700">
                    <h2 className="text-lg font-bold dark:text-gray-300">Portfolio Chart</h2>
                    <div className="flex items-center gap-2">
                        {isMobile && (
                            <button
                                onClick={() => setShowLegendAndDateRange(!showLegendAndDateRange)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded flex items-center gap-1 border border-gray-300 dark:border-slate-700"
                                title="Exit Fullscreen"
                            >
                                <ChevronDown className="w-2 h-2 dark:text-gray-300" /> <span className="text-xs">Legend & Date-Range</span>
                            </button>
                        )}
                        <button
                            onClick={() => setIsFullscreen(false)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                            title="Exit Fullscreen"
                        >
                            <X className="w-4 h-4 dark:text-gray-300" />
                        </button>
                    </div>
                </div>
                {(showLegendAndDateRange && isMobile) && (
                    <>
                        {/* Legend and Date-Range as a full-screen modal */}
                        <div className="fixed inset-0 bg-white dark:bg-slate-800 z-50 overflow-hidden flex flex-col">
                            <div className="flex justify-between items-center p-2 border-b dark:border-slate-700">
                                <h2 className="text-lg font-bold dark:text-gray-300">Legend & Date-Range</h2>
                                <button
                                    onClick={() => setShowLegendAndDateRange(false)}
                                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                                    title="Exit Fullscreen"
                                >
                                    <X className="w-4 h-4 dark:text-gray-300" />
                                </button>
                            </div>
                            <div className="md:w-[15%] p-2 overflow-y-auto border-t md:border-t-0 md:border-l dark:border-slate-700">
                                <div className="mb-4">
                                    <DateRangePicker
                                        startDate={dateRange.startDate}
                                        endDate={dateRange.endDate}
                                        onDateRangeChange={handleUpdateDateRange}
                                    />
                                </div>
                                <ChartLegend
                                    payload={assets}
                                    assets={assets}
                                    hideAssets={hideAssets}
                                    hiddenAssets={hiddenAssets}
                                    toggleAsset={toggleAsset}
                                    toggleAllAssets={toggleAllAssets}
                                    isCompact={true}
                                    assetColors={assetColors}
                                />
                            </div>
                        </div>
                    </>
                )}
                <div className="flex flex-col md:flex-row h-[calc(100vh-40px)]">
                    <div className="md:w-[85%] h-full overflow-hidden">
                        <ChartContent
                            dateRange={dateRange}
                            handleUpdateDateRange={handleUpdateDateRange}
                            isFullscreen={isFullscreen}
                            setIsFullscreen={setIsFullscreen}
                            isDarkMode={isDarkMode}
                            hideAssets={hideAssets}
                            hiddenAssets={hiddenAssets}
                            processedData={processedData}
                            assets={assets}
                            assetColors={assetColors}
                            toggleAsset={toggleAsset}
                            toggleAllAssets={toggleAllAssets}
                            isMobile={isMobile}
                        />
                    </div>
                    {!isMobile && (
                        <div className="md:w-[15%] p-2 overflow-y-auto border-t md:border-t-0 md:border-l dark:border-slate-700">
                            <div className="mb-4">
                                <DateRangePicker
                                    startDate={dateRange.startDate}
                                    endDate={dateRange.endDate}
                                    onDateRangeChange={handleUpdateDateRange}
                                />
                            </div>
                            <ChartLegend
                                payload={assets}
                                assets={assets}
                                hideAssets={hideAssets}
                                hiddenAssets={hiddenAssets}
                                toggleAsset={toggleAsset}
                                toggleAllAssets={toggleAllAssets}
                                isCompact={true}
                                assetColors={assetColors}
                            />
                        </div>
                    )}
                </div>
                {showControls && (
                    <div className="fixed inset-0 bg-white dark:bg-slate-800 z-30 overflow-auto p-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold dark:text-gray-300">Chart Controls</h2>
                            <button onClick={() => setShowControls(false)}>
                                <X className="w-6 h-6 dark:text-gray-300" />
                            </button>
                        </div>
                        <div className="mt-4 space-y-4">
                            <DateRangePicker
                                startDate={dateRange.startDate}
                                endDate={dateRange.endDate}
                                onDateRangeChange={handleUpdateDateRange}
                            />
                            <ChartLegend
                                payload={[]}
                                hideAssets={hideAssets}
                                hiddenAssets={hiddenAssets}
                                toggleAsset={(id: string) => {
                                    const newHidden = new Set(hiddenAssets);
                                    newHidden.has(id) ? newHidden.delete(id) : newHidden.add(id);
                                    setHiddenAssets(newHidden);
                                }}
                                toggleAllAssets={() => {
                                    setHideAssets(!hideAssets);
                                    setHiddenAssets(new Set());
                                }}
                                isCompact={true}
                                assetColors={assetColors}
                                assets={assets}
                            />
                        </div>
                    </div>
                )}
                {isHistoricalLoading && (
                    <div className="fixed inset-0 flex items-center justify-center z-[100] bg-black bg-opacity-30">
                        <Loader2 className="animate-spin w-12 h-12 text-white" />
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="w-full bg-white dark:bg-slate-800 p-4 rounded-lg shadow dark:shadow-black/60 relative">
            <ChartContent
                dateRange={dateRange}
                handleUpdateDateRange={handleUpdateDateRange}
                isFullscreen={isFullscreen}
                setIsFullscreen={setIsFullscreen}
                isDarkMode={isDarkMode}
                hideAssets={hideAssets}
                hiddenAssets={hiddenAssets}
                processedData={processedData}
                assets={assets}
                assetColors={assetColors}
                toggleAsset={toggleAsset}
                toggleAllAssets={toggleAllAssets}
                isMobile={isMobile}
            />
            {isHistoricalLoading && (
                <div className="fixed inset-0 flex items-center justify-center z-[100] bg-black bg-opacity-30">
                    <Loader2 className="animate-spin w-12 h-12 text-white" />
                </div>
            )}
        </div>
    );
};
