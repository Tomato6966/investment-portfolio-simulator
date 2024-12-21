import React, { useState } from "react";

import { usePortfolioStore } from "../store/portfolioStore";
import { generatePeriodicInvestments } from "../utils/calculations/assetValue";

export const InvestmentFormWrapper = () => {
    const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
    const { assets, clearAssets } = usePortfolioStore((state) => ({
        assets: state.assets,
        clearAssets: state.clearAssets,
    }));

    const handleClearAssets = () => {
        if (window.confirm('Are you sure you want to delete all assets? This action cannot be undone.')) {
            clearAssets();
            setSelectedAsset(null);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow h-full dark:shadow-black/60">
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold dark:text-gray-200">Add Investment</h2>
                    {assets.length > 0 && (
                        <button
                            onClick={handleClearAssets}
                            className="px-3 py-1 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                            type="button"
                        >
                            Clear Assets
                        </button>
                    )}
                </div>
                <div className="mb-4">
                    <select
                        value={selectedAsset || ''}
                        disabled={assets.length === 0}
                        onChange={(e) => setSelectedAsset(e.target.value)}
                        className={`w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:outline-none dark:text-gray-300 ${assets.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <option value="">Select Asset</option>
                        {assets.map((asset) => (
                            <option key={asset.id} value={asset.id}>
                                {asset.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            {
                selectedAsset && (
                    <div className="overflow-y-scroll scrollbar-styled max-h-[380px] p-6 pr-3">
                        <InvestmentForm assetId={selectedAsset} />
                    </div>
                )
            }
        </div>
    );
}

const InvestmentForm = ({ assetId }: { assetId: string }) => {
    const [type, setType] = useState<'single' | 'periodic'>('single');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [dayOfMonth, setDayOfMonth] = useState('1');
    const [interval, setInterval] = useState('30');
    const [isDynamic, setIsDynamic] = useState(false);
    const [dynamicType, setDynamicType] = useState<'percentage' | 'fixed'>('percentage');
    const [dynamicValue, setDynamicValue] = useState('');
    const [yearInterval, setYearInterval] = useState('1');

    const { dateRange, addInvestment } = usePortfolioStore((state) => ({
        dateRange: state.dateRange,
        addInvestment: state.addInvestment,
    }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (type === "single") {
            const investment = {
                id: crypto.randomUUID(),
                assetId,
                type,
                amount: parseFloat(amount),
                date
            };
            addInvestment(assetId, investment);
        } else {
            const periodicSettings = {
                startDate: date,
                dayOfMonth: parseInt(dayOfMonth),
                interval: parseInt(interval),
                amount: parseFloat(amount),
                ...(isDynamic ? {
                    dynamic: {
                        type: dynamicType,
                        value: parseFloat(dynamicValue),
                        yearInterval: parseInt(yearInterval),
                    },
                } : undefined),
            };

            const investments = generatePeriodicInvestments(
                periodicSettings,
                new Date(dateRange.endDate),
                assetId,
            );

            for(const investment of investments) {
                addInvestment(assetId, investment);
            }
        }
        // Reset form
        setAmount('');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium mb-1">Investment Type</label>
                <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'single' | 'periodic')}
                    className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:outline-none dark:text-gray-300"
                >
                    <option value="single">Single Investment</option>
                    <option value="periodic">Periodic Investment</option>
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium mb-1">Amount (€)</label>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:outline-none dark:text-gray-300"
                    min="0"
                    step="0.01"
                    required
                />
            </div>

            {type === 'single' ? (
                <div>
                    <label className="block text-sm font-medium mb-1">Date</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:outline-none dark:text-gray-300 [&::-webkit-calendar-picker-indicator]:dark:invert"
                        required
                    />
                </div>
            ) : (
                <>
                    <div>
                        <label className="block text-sm font-medium mb-1">Day of Month</label>
                        <input
                            type="number"
                            value={dayOfMonth}
                            onChange={(e) => setDayOfMonth(e.target.value)}
                            className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:outline-none dark:text-gray-300"
                            min="1"
                            max="31"
                            required
                        />
                    </div>
                    <label className="block text-sm font-medium mb-1">Sparplan-Start Date</label>
                    <input
                        type="date"
                        value={date}
                        // the "dayOf the month should not be change able, due to the day of the"
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:outline-none dark:text-gray-300 [&::-webkit-calendar-picker-indicator]:dark:invert"
                        required
                    />
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Interval (days)
                        </label>
                        <input
                            type="number"
                            value={interval}
                            onChange={(e) => setInterval(e.target.value)}
                            className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:outline-none dark:text-gray-300"
                            min="14"
                            max="365"
                            required
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={isDynamic}
                            onChange={(e) => setIsDynamic(e.target.checked)}
                            id="dynamic"
                        />
                        <label htmlFor="dynamic">Enable Periodic Investment Increase</label>
                    </div>

                    {isDynamic && (
                        <>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Increase Type
                                </label>
                                <select
                                    value={dynamicType}
                                    onChange={(e) => setDynamicType(e.target.value as 'percentage' | 'fixed')}
                                    className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:outline-none dark:text-gray-300"
                                >
                                    <option value="percentage">Percentage (%)</option>
                                    <option value="fixed">Fixed Amount (€)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Increase Value
                                </label>
                                <input
                                    type="number"
                                    value={dynamicValue}
                                    onChange={(e) => setDynamicValue(e.target.value)}
                                    className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:outline-none dark:text-gray-300"
                                    min="0"
                                    step={dynamicType === 'percentage' ? '0.1' : '1'}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Year Interval for Increase
                                </label>
                                <input
                                    type="number"
                                    value={yearInterval}
                                    onChange={(e) => setYearInterval(e.target.value)}
                                    className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:outline-none dark:text-gray-300"
                                    min="1"
                                    required
                                />
                            </div>
                        </>
                    )}
                </>
            )}

            <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
                Add Investment
            </button>
        </form>
    );
};
