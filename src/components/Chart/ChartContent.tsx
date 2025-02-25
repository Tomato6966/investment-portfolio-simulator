import { format } from "date-fns";
import { Maximize2, RefreshCcw } from "lucide-react";
import {
	CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";

import { Asset, DateRange } from "../../types";
import { DateRangePicker } from "../utils/DateRangePicker";
import { ChartLegend } from "./ChartLegend";

interface ChartContentProps {
    dateRange: DateRange;
    handleUpdateDateRange: (range: DateRange) => void;
    handleReRender: () => void;
    isFullscreen: boolean;
    setIsFullscreen: (value: boolean) => void;
    renderKey: number;
    isDarkMode: boolean;
    hideAssets: boolean;
    hiddenAssets: Set<string>;
    processedData: any[];
    assets: Asset[];
    assetColors: Record<string, string>;
    toggleAsset: (assetId: string) => void;
    toggleAllAssets: () => void;
    removeAsset?: (assetId: string) => void;
}

export const ChartContent = ({
    dateRange,
    handleUpdateDateRange,
    handleReRender,
    isFullscreen,
    setIsFullscreen,
    renderKey,
    isDarkMode,
    hideAssets,
    hiddenAssets,
    processedData,
    assets,
    assetColors,
    toggleAsset,
    toggleAllAssets,
    removeAsset
}: ChartContentProps) => (
    <>
        <div className="flex justify-between items-center mb-4 p-5">
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
                    />
                    <Legend content={<ChartLegend
                        payload={assets}
                        hideAssets={hideAssets}
                        hiddenAssets={hiddenAssets}
                        toggleAsset={toggleAsset}
                        toggleAllAssets={toggleAllAssets}
                        removeAsset={removeAsset}
                    />} />
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
                    {assets.map((asset) => (
                        <Line
                            key={asset.id}
                            type="basis"
                            hide={hideAssets || hiddenAssets.has(asset.id)}
                            dataKey={`${asset.id}_percent`}
                            name={`${asset.name} (%)`}
                            stroke={assetColors[asset.id] || "red"}
                            dot={false}
                            yAxisId="right"
                            connectNulls={true}
                        />
                    ))}
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
);
