import { format, differenceInDays } from "date-fns";
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
    isFullscreen: boolean;
    setIsFullscreen: (value: boolean) => void;
    isDarkMode: boolean;
    hideAssets: boolean;
    hiddenAssets: Set<string>;
    processedData: any[];
    assets: Asset[];
    assetColors: Record<string, string>;
    toggleAsset: (assetId: string) => void;
    toggleAllAssets: () => void;
    isMobile: boolean;
}

export const ChartContent = ({
    dateRange,
    handleUpdateDateRange,
    isFullscreen,
    setIsFullscreen,
    isDarkMode,
    hideAssets,
    hiddenAssets,
    processedData,
    assets,
    assetColors,
    toggleAsset,
    toggleAllAssets,
    isMobile,
}: ChartContentProps) => {
    // Calculate tick interval dynamically to prevent overlapping
    const getXAxisInterval = () => {
        const width = window.innerWidth;
        const dayDifference = differenceInDays(dateRange.endDate, dateRange.startDate);
        
        if (width < 480) {
            if (dayDifference > 90) return Math.floor(dayDifference / 4);
            return "preserveStartEnd";
        }
        if (width < 768) {
            if (dayDifference > 180) return Math.floor(dayDifference / 6);
            return "preserveStartEnd";
        }
        return "equidistantPreserveStart";
    };

    return (
        <>
            {!isFullscreen && (
                <div className="flex flex-col sm:flex-row justify-between items-start mb-4 p-3 sm:p-5 gap-2">
                    <div className="w-full">
                        <DateRangePicker
                            startDate={dateRange.startDate}
                            endDate={dateRange.endDate}
                            onDateRangeChange={handleUpdateDateRange}
                        />
                    </div>
                    <div className="absolute right-0 top-0">
                        <button
                            onClick={() => setIsFullscreen(!isFullscreen)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded hover:text-blue-500"
                        >
                            <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        </button>
                    </div>
                </div>
            )}
            <div className={isFullscreen ? "h-[calc(100vh-40px)]" : "h-[300px] sm:h-[350px] md:h-[400px]"}>
                <ResponsiveContainer>
                    <LineChart
                        data={processedData}
                        margin={{ 
                            top: 5, 
                            right: window.innerWidth < 768 ? 15 : 30, 
                            left: window.innerWidth < 768 ? 5 : 20, 
                            bottom: 5 
                        }}
                    >
                        <CartesianGrid strokeDasharray="3 3" className="dark:stroke-slate-600" />
                        <XAxis
                            dataKey="date"
                            tickFormatter={(date) => {
                                const width = window.innerWidth;
                                const dayDifference = differenceInDays(dateRange.endDate, dateRange.startDate);
                                
                                if (width < 480) {
                                    // For very small screens
                                    return format(new Date(date), dayDifference > 365 ? 'MM/yy' : 'MM/dd');
                                }
                                if (width < 768) {
                                    // For mobile
                                    return format(new Date(date), dayDifference > 365 ? 'MM/yyyy' : 'MM/dd/yy');
                                }
                                // For larger screens
                                return format(new Date(date), dayDifference > 365 ? 'MMM yyyy' : 'dd.MM.yyyy');
                            }}
                            tick={{ 
                                fontSize: window.innerWidth < 768 ? 9 : 11,
                                textAnchor: 'middle',
                                dy: 5
                            }}
                            interval={getXAxisInterval()}
                            padding={{ left: 10, right: 10 }}
                            minTickGap={window.innerWidth < 768 ? 15 : 30}
                            allowDuplicatedCategory={false}
                            allowDecimals={false}
                            axisLine={{ stroke: isDarkMode ? '#4b5563' : '#d1d5db' }}
                        />
                        <YAxis
                            yAxisId="left"
                            tickFormatter={(value) => {
                                const width = window.innerWidth;
                                if (width < 480) return `${(value/1000).toFixed(0)}k`;
                                return `${value.toLocaleString()}€`;
                            }}
                            tick={{ fontSize: window.innerWidth < 768 ? 9 : 12 }}
                            width={window.innerWidth < 480 ? 35 : 45}
                            tickCount={window.innerWidth < 768 ? 5 : 8}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            tickFormatter={(value) => `${value.toFixed(0)}%`}
                            tick={{ fontSize: window.innerWidth < 768 ? 9 : 12 }}
                            width={window.innerWidth < 480 ? 25 : 35}
                            tickCount={window.innerWidth < 768 ? 5 : 8}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                                border: 'none',
                                color: isDarkMode ? '#d1d5d1' : '#000000',
                                boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.5)',
                                fontSize: window.innerWidth < 768 ? '0.7rem' : '0.875rem',
                                padding: window.innerWidth < 768 ? '4px 6px' : '8px',
                                borderRadius: '6px',
                                maxWidth: window.innerWidth < 768 ? '220px' : '300px',
                            }}
                            formatter={(value: number, name: string, item) => {
                                // Simplify names on mobile
                                if (name === "avg. Portfolio % gain")
                                    return [`${value.toFixed(2)}%`, isMobile ? "Avg. Portfolio" : name];
                                
                                if (name === "TTWOR") {
                                    const ttworValue = item.payload["ttwor_percent"] || 0;
                                    return [
                                        `${isMobile ? '' : (value.toLocaleString() + '€ ')}(${ttworValue.toFixed(2)}%)`,
                                        "TTWOR"
                                    ];
                                }
                                
                                if (name === "Portfolio-Value")
                                    return [`${value.toLocaleString()}€`, isMobile ? "Portfolio" : name];
                                
                                if (name === "Invested Capital")
                                    return [`${value.toLocaleString()}€`, isMobile ? "Invested" : name];
                                
                                if (name.includes("(%)")) {
                                    const shortName = isMobile ? 
                                        name.replace(" (%)", "").substring(0, 8) + (name.replace(" (%)", "").length > 8 ? "..." : "") : 
                                        name.replace(" (%)", "");
                                    return [`${value.toFixed(2)}%`, shortName];
                                }
                                
                                return [`${value.toLocaleString()}€`, isMobile ? name.substring(0, 8) + "..." : name];
                            }}
                            labelFormatter={(date) => format(new Date(date), window.innerWidth < 768 ? 'MM/dd/yy' : 'dd.MM.yyyy')}
                            wrapperStyle={{ zIndex: 1000, touchAction: "none" }}
                        />
                        {!isFullscreen && (
                            <Legend content={<ChartLegend
                                payload={processedData}
                                hideAssets={hideAssets}
                                hiddenAssets={hiddenAssets}
                                toggleAsset={toggleAsset}
                                toggleAllAssets={toggleAllAssets}
                                assetColors={assetColors}
                                assets={assets}
                                isCompact={window.innerWidth < 768}
                            />} />
                        )}
                        
                        {/* Lines remain mostly the same, but with adjusted stroke width for mobile */}
                        <Line
                            type="monotone"
                            dataKey="total"
                            name="Portfolio-Value"
                            hide={hideAssets || hiddenAssets.has("total")}
                            stroke="#000"
                            strokeWidth={window.innerWidth < 768 ? 1.5 : 2}
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
                            strokeWidth={window.innerWidth < 768 ? 1 : 1.5}
                            dot={false}
                            yAxisId="left"
                        />
                        <Line
                            type="monotone"
                            dataKey="ttwor"
                            name="TTWOR"
                            strokeDasharray="5 5"
                            stroke="#a64c79"
                            strokeWidth={window.innerWidth < 768 ? 1 : 1.5}
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
                                strokeWidth={window.innerWidth < 768 ? 1 : 1.5}
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
                            strokeWidth={window.innerWidth < 768 ? 1 : 1.5}
                            yAxisId="right"
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            {!isFullscreen && (
                <div className="mt-2 px-2">
                    <p className="text-[10px] sm:text-xs text-gray-500">
                        *Note: Left axis shows portfolio value/invested capital, right axis shows percentage gains/losses.
                    </p>
                    <p className="text-[10px] sm:text-xs mt-1 text-gray-500 italic">
                        **Percentages based on daily weighted average data.
                    </p>
                </div>
            )}
        </>
    );
};
