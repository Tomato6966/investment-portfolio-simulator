import { format } from "date-fns";
import { BarChart2, Eye, EyeOff, Maximize2, RefreshCcw, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import {
	CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import { useDebouncedCallback } from "use-debounce";

import { useDarkMode } from "../hooks/useDarkMode";
import { usePortfolioSelector } from "../hooks/usePortfolio";
import { getHistoricalData } from "../services/yahooFinanceService";
import { DateRange } from "../types";
import { calculatePortfolioValue } from "../utils/calculations/portfolioValue";
import { getHexColor } from "../utils/formatters";
import { DateRangePicker } from "./utils/DateRangePicker";

export default function PortfolioChart() {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [hideAssets, setHideAssets] = useState(false);
    const [hiddenAssets, setHiddenAssets] = useState<Set<string>>(new Set());
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [assets.map(a => a.id).join(','), isDarkMode]);

    const data = useMemo(() => calculatePortfolioValue(assets, dateRange).filter(v => Object.keys(v.assets).length > 0), [assets, dateRange]);
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

    const CustomLegend = useCallback(({ payload }: any) => {
        return (
            <div className="flex flex-col gap-2 p-4 rounded-lg shadow-md dark:shadow-black/60">
                <div className="flex items-center justify-between gap-2 pb-2 border-b">
                    <div className="flex items-center gap-1">
                        <BarChart2 className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">Chart Legend</span>
                    </div>
                    <button
                        onClick={toggleAllAssets}
                        className="flex items-center gap-1 px-2 py-1 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        {hideAssets ? (
                            <>
                                <Eye className="w-4 h-4" />
                                Show All
                            </>
                        ) : (
                            <>
                                <EyeOff className="w-4 h-4" />
                                Hide All
                            </>
                        )}
                    </button>
                </div>
                <div className="flex flex-wrap gap-4">
                    {payload.map((entry: any, index: number) => {
                        const assetId = entry.dataKey.split('_')[0];
                        const isHidden = hideAssets || hiddenAssets.has(assetId);
                        return (
                            <button
                                key={`asset-${index}`}
                                onClick={() => toggleAsset(assetId)}
                                className={`flex items-center gap-2 px-2 py-1 rounded transition-opacity duration-200 ${isHidden ? 'opacity-40' : ''
                                    } hover:bg-gray-100 dark:hover:bg-gray-800`}
                            >
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-8 h-[3px]"
                                        style={{ backgroundColor: entry.color }}
                                    />
                                    <span className="text-sm">{entry.value.replace(' (%)', '')}</span>
                                    {isHidden ? (
                                        <Eye className="w-3 h-3 text-gray-400 dark:text-gray-600" />
                                    ) : (
                                        <EyeOff className="w-3 h-3 text-gray-400 dark:text-gray-600" />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    }, [hideAssets, hiddenAssets, toggleAsset, toggleAllAssets]);

    const handleUpdateDateRange = useCallback((newRange: DateRange) => {
        updateDateRange(newRange);

        debouncedFetchHistoricalData(newRange.startDate, newRange.endDate);
    }, [updateDateRange, debouncedFetchHistoricalData]);

    const [renderKey, setRenderKey] = useState(0);

    const handleReRender = useCallback(() => {
        setRenderKey(prevKey => prevKey + 1);
    }, []);

    const ChartContent = useCallback(() => (
        <>
            <div className="flex justify-between items-center mb-4">
                <DateRangePicker
                    startDate={dateRange.startDate}
                    endDate={dateRange.endDate}
                    onStartDateChange={(date) => handleUpdateDateRange({ ...dateRange, startDate: date })}
                    onEndDateChange={(date) => handleUpdateDateRange({ ...dateRange, endDate: date })}
                />
                <div className="flex items-center">
                    <button
                        onClick={handleReRender}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded ml-2 hover:text-blue-500"
                    >
                        <RefreshCcw className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded hover:text-blue-500"
                    >
                        <Maximize2 className="w-5 h-5" />
                    </button>
                </div>
            </div>
            <div className={isFullscreen ? "h-[80vh]" : "h-[400px]"} key={renderKey}>
                <ResponsiveContainer>
                    <LineChart data={processedData} className="p-3">
                        <CartesianGrid strokeDasharray="3 3" className="dark:stroke-slate-600" />
                        <XAxis
                            tick={{ fill: isDarkMode ? '#D8D8D8' : '#4E4E4E' }}
                            dataKey="date"
                            tickFormatter={(date) => format(new Date(date), 'dd.MM.yyyy')}
                        />
                        <YAxis
                            tick={{ fill: isDarkMode ? '#D8D8D8' : '#4E4E4E' }}
                            yAxisId="left"
                            tickFormatter={(value) => `${value.toFixed(2)}€`}
                        />
                        <YAxis
                            tick={{ fill: isDarkMode ? '#D8D8D8' : '#4E4E4E' }}
                            yAxisId="right"
                            orientation="right"
                            tickFormatter={(value) => `${value.toFixed(2)}%`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                                border: 'none',
                                color: isDarkMode ? '#d1d5d1' : '#000000',
                                boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.5)',
                            }}
                            formatter={(value: number, name: string, item) => {
                                const assetKey = name.split('_')[0] as keyof typeof assets;
                                const processedKey = `${assets.find(a => a.name === name.replace(" (%)", ""))?.id}_price`;

                                if (name === "avg. Portfolio % gain")
                                    return [`${value.toFixed(2)}%`, name];

                                if (name === "TTWOR")
                                    return [`${value.toLocaleString()}€ (${item.payload["ttwor_percent"].toFixed(2)}%)`, name];

                                if (name === "Portfolio-Value" || name === "Invested Capital")
                                    return [`${value.toLocaleString()}€`, name];

                                if (name.includes("(%)"))
                                    return [`${Number(item.payload[processedKey]).toFixed(2)}€ ${value.toFixed(2)}%`, name.replace(" (%)", "")];

                                return [`${value.toLocaleString()}€ (${((value - Number(assets[assetKey])) / Number(assets[assetKey]) * 100).toFixed(2)}%)`, name];
                            }}
                            labelFormatter={(date) => format(new Date(date), 'dd.MM.yyyy')}
                        >
                        </Tooltip>
                        <Legend content={<CustomLegend />} />
                        <Line
                            type="monotone"
                            dataKey="total"
                            name="Portfolio-Value"
                            hide={hideAssets || hiddenAssets.has("total")}
                            stroke="#000"
                            strokeWidth={2}
                            dot={false}
                            yAxisId="left"
                        />
                        <Line
                            type="monotone"
                            dataKey="invested"
                            name="Invested Capital"
                            hide={hideAssets || hiddenAssets.has("invested")}
                            stroke="#666"
                            strokeDasharray="5 5"
                            dot={false}
                            yAxisId="left"
                        />

                        <Line
                            type="monotone"
                            dataKey="ttwor"
                            name="TTWOR"
                            strokeDasharray="5 5"
                            stroke="#a64c79"
                            hide={hideAssets || hiddenAssets.has("ttwor")}
                            dot={false}
                            yAxisId="left"
                        />
                        {assets.map((asset) => {
                            return (
                                <Line
                                    key={asset.id}
                                    type="monotone"
                                    hide={hideAssets || hiddenAssets.has(asset.id)}
                                    dataKey={`${asset.id}_percent`}
                                    name={`${asset.name} (%)`}
                                    stroke={assetColors[asset.id] || "red"}
                                    dot={false}
                                    yAxisId="right"
                                />
                            );
                        })}
                        <Line
                            type="monotone"
                            dataKey="percentageChange"
                            hide={hideAssets || hiddenAssets.has("percentageChange")}
                            dot={false}
                            name="avg. Portfolio % gain"
                            stroke="#a0a0a0"
                            yAxisId="right"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <i className="text-xs text-gray-500">
                *Note: The YAxis on the left shows the value of your portfolio (black line) and invested capital (dotted line),
                all other assets are scaled by their % gain/loss and thus scaled to the right YAxis.
            </i>
            <p className="text-xs mt-2 text-gray-500 italic">
                **Note: The % is based on daily weighted average data, thus the percentages might alter slightly.
            </p>
        </>
    ), [assets, handleReRender, isDarkMode, assetColors, handleUpdateDateRange, hideAssets, hiddenAssets, processedData, CustomLegend, dateRange, isFullscreen, renderKey]);


    if (isFullscreen) {
        return (
            <div className="fixed inset-0 bg-white dark:bg-slate-800 z-50">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Portfolio Chart</h2>
                    <button
                        onClick={() => setIsFullscreen(false)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <ChartContent />
            </div>
        );
    }

    return (
        <div className="w-full bg-white dark:bg-slate-800 p-4 rounded-lg shadow dark:shadow-black/60">
            <ChartContent />
        </div>
    );
};
