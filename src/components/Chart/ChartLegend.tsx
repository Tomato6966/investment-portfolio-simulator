import { BarChart2, Eye, EyeOff, Trash2 } from "lucide-react";
import { memo } from "react";

interface ChartLegendProps {
    payload: any[];
    hideAssets: boolean;
    hiddenAssets: Set<string>;
    toggleAsset: (assetId: string) => void;
    toggleAllAssets: () => void;
    removeAsset?: (assetId: string) => void;
}

export const ChartLegend = memo(({ payload, hideAssets, hiddenAssets, toggleAsset, toggleAllAssets, removeAsset }: ChartLegendProps) => {
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
                        <div key={`asset-${index}`} className="flex items-center">
                            <button
                                onClick={() => toggleAsset(assetId)}
                                className={`flex items-center gap-2 px-2 py-1 rounded transition-opacity duration-200 ${
                                    isHidden ? 'opacity-40' : ''
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

                            {removeAsset && !['total', 'invested', 'percentageChange', 'ttwor'].includes(assetId) && (
                                <button
                                    onClick={() => {
                                        if (confirm(`Are you sure you want to remove ${entry.value.replace(' (%)', '')}?`)) {
                                            removeAsset(assetId);
                                        }
                                    }}
                                    className="p-1 ml-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                                    title="Remove asset"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
});
