import { BarChart2, Eye, EyeOff } from "lucide-react";
import { memo } from "react";
import { Asset } from "../../types";

interface ChartLegendProps {
    payload: any[];
    hideAssets: boolean;
    hiddenAssets: Set<string>;
    toggleAsset: (assetId: string) => void;
    toggleAllAssets: () => void;
    isCompact?: boolean;
    assetColors?: Record<string, string>;
    assets?: Asset[];
}

export const ChartLegend = memo(({ 
    payload, 
    hideAssets, 
    hiddenAssets, 
    toggleAsset, 
    toggleAllAssets, 
    isCompact = false,
    assetColors,
    assets
}: ChartLegendProps) => {
    // Determine which data source to use
    let legendItems: any[] = [];
    
    // If we have a valid recharts payload, use that
    if (payload && payload.length > 0 && payload[0].dataKey) {
        legendItems = payload;

        const hasInvestments = assets && assets.some(asset => asset.investments && asset.investments.length > 0);

        if(!hasInvestments && legendItems.some(item => item.dataKey === "ttwor" )) {
            const investmentKeys = [
                "total",
                "invested",
                "ttwor",
                "percentageChange"
            ];
            legendItems = legendItems.filter(item => !investmentKeys.includes(item.dataKey));
        }
    }
    // Otherwise, if we have assets and assetColors, create our own items
    else if (assets && assets.length > 0 && assetColors) {
        // Add asset items
        legendItems = assets.map(asset => ({
            dataKey: `${asset.id}_percent`,
            value: `${asset.name} (%)`,
            color: assetColors[asset.id] || '#000'
        }));
        const hasInvestments = assets.some(asset => asset.investments && asset.investments.length > 0);
        // Add special items
        legendItems = [
            ...legendItems,
            hasInvestments && { dataKey: "total", value: "Portfolio-Value", color: "#000" },
            hasInvestments && { dataKey: "invested", value: "Invested Capital", color: "#666" },
            hasInvestments && { dataKey: "ttwor", value: "TTWOR", color: "#a64c79" },
            hasInvestments && { dataKey: "percentageChange", value: "avg. Portfolio % gain", color: "#a0a0a0" }
        ];
    }

    return (
        <div className={`flex flex-col gap-2 ${isCompact ? 'p-2' : 'p-4'} rounded-lg ${isCompact ? '' : 'shadow-md dark:shadow-black/60'}`}>
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
                            {!isCompact && "Show All"}
                        </>
                    ) : (
                        <>
                            <EyeOff className="w-4 h-4" />
                            {!isCompact && "Hide All"}
                        </>
                    )}
                </button>
            </div>
            <div className={`flex ${isCompact ? 'flex-col' : 'flex-wrap'} ${isCompact ? 'gap-1' : 'gap-4'}`}>
                {legendItems.map((entry: any, index: number) => {
                    if (!entry.dataKey) {
                        return null;
                    }
                    
                    const assetId = entry.dataKey.split('_')[0];
                    const isHidden = hideAssets || hiddenAssets.has(assetId);
                    
                    return (
                        <div key={`asset-${index}`} className={`flex items-center ${isCompact ? 'w-full' : ''}`}>
                            <button
                                onClick={() => toggleAsset(assetId)}
                                className={`flex items-center ${isCompact ? 'px-1 py-0.5 text-xs w-full' : 'px-2 py-1'} rounded transition-opacity duration-200 ${
                                    isHidden ? 'opacity-40' : ''
                                } bg-gray-200/20 dark:bg-gray-700/20 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600`}
                            >
                                <div className="flex items-center w-full justify-between">
                                    <div className="flex items-center space-x-2 pr-2">
                                        <div
                                            className={`w-4 h-2 rounded-full`}
                                            style={{ backgroundColor: entry.color }}
                                        />
                                        <span className={isCompact ? 'text-xs' : 'text-sm'}>
                                            {entry.value.replace(' (%)', '')}
                                        </span>
                                    </div>
                                    <div>
                                        {isHidden ? (
                                            <Eye className={`${isCompact ? 'w-2 h-2' : 'w-3 h-3'} text-gray-400 dark:text-gray-600`} />
                                        ) : (
                                            <EyeOff className={`${isCompact ? 'w-2 h-2' : 'w-3 h-3'} text-gray-400 dark:text-gray-600`} />
                                        )}
                                    </div>
                                </div>
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
