import { format } from "date-fns";
import { X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

import { useDarkMode } from "../hooks/useDarkMode";
import { usePortfolioSelector } from "../hooks/usePortfolio";
import { getHistoricalData } from "../services/yahooFinanceService";
import { DateRange } from "../types";
import { calculatePortfolioValue } from "../utils/calculations/portfolioValue";
import { getHexColor } from "../utils/formatters";
import { ChartContent } from "./Chart/ChartContent";

export default function PortfolioChart() {
    const [ isFullscreen, setIsFullscreen ] = useState(false);
    const [ hideAssets, setHideAssets ] = useState(false);
    const [ hiddenAssets, setHiddenAssets ] = useState<Set<string>>(new Set());
    const { isDarkMode } = useDarkMode();

    const { assets, dateRange, updateDateRange, updateAssetHistoricalData } = usePortfolioSelector((state) => ({
        assets: state.assets,
        dateRange: state.dateRange,
        updateDateRange: state.updateDateRange,
        updateAssetHistoricalData: state.updateAssetHistoricalData,
    }));

    const fetchHistoricalData = useCallback(
        async (startDate: Date, endDate: Date) => {
            for (const asset of assets) {
                const { historicalData, longName } = await getHistoricalData(asset.symbol, startDate, endDate);
                updateAssetHistoricalData(asset.id, historicalData, longName);
            }
        },
        [assets, updateAssetHistoricalData]
    );

    const debouncedFetchHistoricalData = useDebouncedCallback(fetchHistoricalData, 1500, {
        maxWait: 5000,
    });

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

    // Calculate percentage changes for each asset
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
            const initialPrice = data[0].assets[asset.id];
            const currentPrice = point.assets[asset.id];
            if (initialPrice && currentPrice) {
                processed[`${asset.id}_price`] = currentPrice;
                const percentDecimal = ((currentPrice - initialPrice) / initialPrice);
                processed[`${asset.id}_percent`] = percentDecimal * 100;
                processed.ttwor += allAssetsInvestedKapitals[asset.id] + allAssetsInvestedKapitals[asset.id] * percentDecimal;
            }
        }

        processed.ttwor_percent = (processed.ttwor - Object.values(allAssetsInvestedKapitals).reduce((acc, curr) => acc + curr, 0)) / Object.values(allAssetsInvestedKapitals).reduce((acc, curr) => acc + curr, 0) * 100;


        // add a processed["ttwor"] ttwor is what if you invested all of the kapital of all assets at the start of the period
        return processed;
    }), [data, assets, allAssetsInvestedKapitals]);

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
        updateDateRange(newRange);
        debouncedFetchHistoricalData(newRange.startDate, newRange.endDate);
    }, [updateDateRange, debouncedFetchHistoricalData]);

    const [renderKey, setRenderKey] = useState(0);

    const handleReRender = useCallback(() => {
        setRenderKey(prevKey => prevKey + 1);
    }, []);

    if (isFullscreen) {
        return (
            <div className="fixed inset-0 bg-white dark:bg-slate-800 z-50">
                <div className="flex justify-between items-center mb-4 p-5">
                    <h2 className="text-xl font-bold dark:text-gray-300">Portfolio Chart</h2>
                    <button
                        onClick={() => setIsFullscreen(false)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                    >
                        <X className="w-6 h-6 dark:text-gray-300" />
                    </button>
                </div>
                <ChartContent
                    dateRange={dateRange}
                    handleUpdateDateRange={handleUpdateDateRange}
                    handleReRender={handleReRender}
                    isFullscreen={isFullscreen}
                    setIsFullscreen={setIsFullscreen}
                    renderKey={renderKey}
                    isDarkMode={isDarkMode}
                    hideAssets={hideAssets}
                    hiddenAssets={hiddenAssets}
                    processedData={processedData}
                    assets={assets}
                    assetColors={assetColors}
                    toggleAsset={toggleAsset}
                    toggleAllAssets={toggleAllAssets}
                />
            </div>
        );
    }

    return (
        <div className="w-full bg-white dark:bg-slate-800 p-4 rounded-lg shadow dark:shadow-black/60">
            <ChartContent
                dateRange={dateRange}
                handleUpdateDateRange={handleUpdateDateRange}
                handleReRender={handleReRender}
                isFullscreen={isFullscreen}
                setIsFullscreen={setIsFullscreen}
                renderKey={renderKey}
                isDarkMode={isDarkMode}
                hideAssets={hideAssets}
                hiddenAssets={hiddenAssets}
                processedData={processedData}
                assets={assets}
                assetColors={assetColors}
                toggleAsset={toggleAsset}
                toggleAllAssets={toggleAllAssets}
            />
        </div>
    );
};
