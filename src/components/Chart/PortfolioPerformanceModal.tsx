import { X } from "lucide-react";
import { memo, useEffect } from "react";
import {
	CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";

interface PortfolioPerformanceModalProps {
    performances: { year: number; percentage: number; }[];
    onClose: () => void;
}

export const PortfolioPerformanceModal = memo(({ performances, onClose }: PortfolioPerformanceModalProps) => {
    const sortedPerformances = [...performances].sort((a, b) => a.year - b.year);

    // Prevent body scroll when modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

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
        <div className="fixed inset-0 bg-black/50 z-50 md:flex md:items-center md:justify-center">
            <div className="h-full md:h-auto w-full md:w-[80vw] bg-white dark:bg-slate-800 md:rounded-lg overflow-hidden">
                {/* Header - Fixed */}
                <div className="sticky top-0 z-10 bg-white dark:bg-slate-800 p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold dark:text-gray-300">Portfolio Performance History</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
                    >
                        <X className="w-6 h-6 dark:text-gray-300" />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="overflow-y-auto h-[calc(100vh-64px)] md:h-[calc(80vh-64px)] p-6">
                    {/* Chart */}
                    <div className="h-[400px] mb-6">
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
                                    tickFormatter={(value) => `€${value.toLocaleString()}`}
                                />
                                <Tooltip
                                    formatter={(value: number, name: string) => {
                                        if (name === 'Performance') return [`${value.toFixed(2)}%`, name];
                                        return [`€${value.toLocaleString()}`, 'Portfolio Value'];
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
                                <defs>
                                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#22c55e" />
                                        <stop offset="100%" stopColor="#ef4444" />
                                    </linearGradient>
                                </defs>
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Performance Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 dark:text-gray-300">
                        {sortedPerformances.map(({ year, percentage }) => (
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
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
});
