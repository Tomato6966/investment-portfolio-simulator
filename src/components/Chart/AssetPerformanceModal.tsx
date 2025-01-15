import { X } from "lucide-react";
import { memo } from "react";
import {
	CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";

interface AssetPerformanceModalProps {
    assetName: string;
    performances: { year: number; percentage: number; price?: number }[];
    onClose: () => void;
}

export const AssetPerformanceModal = memo(({ assetName, performances, onClose }: AssetPerformanceModalProps) => {
    const sortedPerformances = [...performances].sort((a, b) => a.year - b.year);

    const CustomizedDot = (props: any) => {
        const { cx, cy, payload } = props;
        return (
            <circle
                cx={cx}
                cy={cy}
                r={4}
                fill={payload.percentage >= 0 ? '#22c55e' : '#ef4444'}
            />
        );
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg w-[80vw] max-w-4xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">{assetName} - Yearly Performance</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded">
                        <X className="w-6 h-6" />
                    </button>
                </div>
                <div className="h-[400px]">
                    <ResponsiveContainer>
                        <LineChart data={sortedPerformances}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" />
                            <YAxis
                                yAxisId="left"
                                tickFormatter={(value) => `${value.toFixed(2)}%`}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                tickFormatter={(value) => `€${value.toFixed(2)}`}
                            />
                            <Tooltip
                                formatter={(value: number, name: string) => {
                                    if (name === 'Performance') return [`${value.toFixed(2)}%`, name];
                                    return [`€${value.toFixed(2)}`, name];
                                }}
                                labelFormatter={(year) => `Year ${year}`}
                            />
                            <Line
                                type="monotone"
                                dataKey="percentage"
                                name="Performance"
                                stroke="url(#colorGradient)"
                                dot={<CustomizedDot />}
                                strokeWidth={2}
                                yAxisId="left"
                            />
                            <Line
                                type="monotone"
                                dataKey="price"
                                name="Price"
                                stroke="#666"
                                strokeDasharray="5 5"
                                dot={false}
                                yAxisId="right"
                            />
                            <defs>
                                <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#22c55e" />
                                    <stop offset="100%" stopColor="#ef4444" />
                                </linearGradient>
                            </defs>
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {sortedPerformances.map(({ year, percentage, price }) => (
                        <div
                            key={year}
                            className={`p-3 rounded-lg ${
                                percentage >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                            }`}
                        >
                            <div className="text-sm font-medium">{year}</div>
                            <div className={`text-lg font-bold ${
                                percentage >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                                {percentage.toFixed(2)}%
                            </div>
                            {price && (
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    €{price.toFixed(2)}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});
