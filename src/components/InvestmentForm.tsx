import { Loader2 } from "lucide-react";
import React, { useState } from "react";
import toast from "react-hot-toast";

import { usePortfolioSelector } from "../hooks/usePortfolio";
import { generatePeriodicInvestments } from "../utils/calculations/assetValue";

export default function InvestmentFormWrapper() {
    const { assets, clearAssets } = usePortfolioSelector((state) => ({
        assets: state.assets,
        clearAssets: state.clearAssets,
    }));
    const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

    const handleClearAssets = () => {
        if (window.confirm('Are you sure you want to delete all assets? This action cannot be undone.')) {
            clearAssets();
            setSelectedAsset(null);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow h-full dark:shadow-black/60">
            <div className="p-6 pb-2">
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
                    <div className="flex-1 h-[calc(100%-120px)] overflow-hidden">
                        <div className="p-6 pr-3 pt-0">
                            <InvestmentForm assetId={selectedAsset} />
                        </div>
                    </div>
                )
            }
        </div>
    );
}

interface IntervalConfig {
    value: number;
    unit: 'days' | 'months' | 'years';
}

const InvestmentForm = ({ assetId }: { assetId: string }) => {
    const [type, setType] = useState<'single' | 'periodic'>('single');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState('');
    const [dayOfMonth, setDayOfMonth] = useState('1');
    const [isDynamic, setIsDynamic] = useState(false);
    const [dynamicType, setDynamicType] = useState<'percentage' | 'fixed'>('percentage');
    const [dynamicValue, setDynamicValue] = useState('');
    const [yearInterval, setYearInterval] = useState('1');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [intervalConfig, setIntervalConfig] = useState<IntervalConfig>({
        value: 1,
        unit: 'months'
    });

    const { dateRange, addInvestment } = usePortfolioSelector((state) => ({
        dateRange: state.dateRange,
        addInvestment: state.addInvestment,
    }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();

        setIsSubmitting(true);

        setTimeout(() => {
            try {
                if (type === "single") {
                    const investment = {
                        id: crypto.randomUUID(),
                        assetId,
                        type,
                        amount: parseFloat(amount),
                        date: new Date(date),
                    };
                    addInvestment(assetId, investment);
                    toast.success('Investment added successfully');
                } else {
                    const periodicSettings = {
                        startDate: new Date(date),
                        dayOfMonth: parseInt(dayOfMonth),
                        interval: intervalConfig.value,
                        amount: parseFloat(amount),
                        intervalUnit: intervalConfig.unit,
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
                        assetId
                    );
                    addInvestment(assetId, investments);

                    toast.success('Sparplan erfolgreich erstellt');
                }
            } catch (error:any) {
                toast.error('Fehler beim Erstellen des Investments: ' + String(error?.message || error));
            } finally {
                setIsSubmitting(false);
                setAmount('');
            }
        }, 10);
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
                    autoFocus
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
                    <div>
                        <label className="block text-sm font-medium mb-1">
                            Interval
                            <span className="ml-1 text-gray-400 hover:text-gray-600 cursor-help" title="Wählen Sie das Intervall für Ihre regelmäßigen Investitionen. Bei monatlichen Zahlungen am 1. eines Monats werden die Investments automatisch am 1. jeden Monats ausgeführt.">
                                ⓘ
                            </span>
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                value={intervalConfig.value}
                                onChange={(e) => setIntervalConfig(prev => ({
                                    ...prev,
                                    value: parseInt(e.target.value)
                                }))}
                                className="w-24 p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:outline-none dark:text-gray-300"
                                min="1"
                                required
                            />
                            <select
                                value={intervalConfig.unit}
                                onChange={(e) => setIntervalConfig(prev => ({
                                    ...prev,
                                    unit: e.target.value as IntervalConfig['unit']
                                }))}
                                className="flex-1 p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:outline-none dark:text-gray-300"
                            >
                                <option value="days">Days</option>
                                <option value="weeks">Weeks</option>
                                <option value="months">Months</option>
                                <option value="quarters">Quarters</option>
                                <option value="years">Years</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1">SavingsPlan-Start Datum</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:outline-none dark:text-gray-300 [&::-webkit-calendar-picker-indicator]:dark:invert"
                            required
                            lang="de"
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
                disabled={isSubmitting}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSubmitting ? (
                    <Loader2 className="animate-spin mx-auto" size={16} />
                ) : (
                    'Add Investment'
                )}
            </button>
        </form>
    );
};
