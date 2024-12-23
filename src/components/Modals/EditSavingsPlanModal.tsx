import { Loader2, X } from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

import { usePortfolioSelector } from "../../hooks/usePortfolio";
import { generatePeriodicInvestments } from "../../utils/calculations/assetValue";

interface EditSavingsPlanModalProps {
    assetId: string;
    groupId: string;
    amount: number;
    dayOfMonth: number;
    interval: number;
    dynamic?: {
        type: 'percentage' | 'fixed';
        value: number;
        yearInterval: number;
    };
    onClose: () => void;
}

export const EditSavingsPlanModal = ({
    assetId,
    groupId,
    amount: initialAmount,
    dayOfMonth: initialDayOfMonth,
    interval: initialInterval,
    dynamic: initialDynamic,
    onClose
}: EditSavingsPlanModalProps) => {
    const [amount, setAmount] = useState(initialAmount.toString());
    const [dayOfMonth, setDayOfMonth] = useState(initialDayOfMonth.toString());
    const [interval, setInterval] = useState(initialInterval.toString());
    const [isDynamic, setIsDynamic] = useState(!!initialDynamic);
    const [dynamicType, setDynamicType] = useState<'percentage' | 'fixed'>(initialDynamic?.type || 'percentage');
    const [dynamicValue, setDynamicValue] = useState(initialDynamic?.value.toString() || '');
    const [yearInterval, setYearInterval] = useState(initialDynamic?.yearInterval.toString() || '1');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { dateRange, addInvestment, removeInvestment, assets } = usePortfolioSelector((state) => ({
        dateRange: state.dateRange,
        addInvestment: state.addInvestment,
        removeInvestment: state.removeInvestment,
        assets: state.assets,
    }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsSubmitting(true);

        setTimeout(async () => {
            try {
                // First, remove all existing investments for this savings plan
                const asset = assets.find(a => a.id === assetId)!;
                const investments = asset.investments.filter(inv => inv.periodicGroupId === groupId);
                const startDate = investments[0].date!; // Keep original start date

                investments.forEach(inv => {
                    removeInvestment(assetId, inv.id);
                });

                // Generate and add new investments
                const periodicSettings = {
                    startDate,
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

                const newInvestments = generatePeriodicInvestments(
                    periodicSettings,
                    dateRange.endDate,
                    assetId
                );

                addInvestment(assetId, newInvestments);
                toast.success('Savings plan updated successfully');
                onClose();
            } catch (error:any) {
                toast.error('Failed to update savings plan: ' + String(error?.message || error));
            } finally {
                setIsSubmitting(false);
            }
        }, 10);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 w-full max-w-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold dark:text-gray-200">Edit Savings Plan</h2>
                    <button onClick={onClose} className="p-2">
                        <X className="w-6 h-6 dark:text-gray-200" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                            Investment Amount
                        </label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:outline-none dark:text-gray-300"
                            step="0.01"
                            min="0"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                            Day of Month
                        </label>
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
                        <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                            Interval (days)
                        </label>
                        <input
                            type="number"
                            value={interval}
                            onChange={(e) => setInterval(e.target.value)}
                            className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:outline-none dark:text-gray-300"
                            min="1"
                            required
                        />
                    </div>

                    <div>
                        <label className="flex items-center gap-2 dark:text-gray-200">
                            <input
                                type="checkbox"
                                checked={isDynamic}
                                onChange={(e) => setIsDynamic(e.target.checked)}
                                className="rounded"
                            />
                            <span className="text-sm font-medium">Dynamic Investment Growth</span>
                        </label>
                    </div>

                    {isDynamic && (
                        <>
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-200">
                                    Growth Type
                                </label>
                                <select
                                    value={dynamicType}
                                    onChange={(e) => setDynamicType(e.target.value as 'percentage' | 'fixed')}
                                    className="w-full p-2 border rounded dark:bg-slate-800 dark:border-slate-700 dark:outline-none dark:text-gray-300"
                                >
                                    <option value="percentage">Percentage</option>
                                    <option value="fixed">Fixed Amount</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-200">
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
                                <label className="block text-sm font-medium mb-1 dark:text-gray-200">
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

                    <div className="flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border rounded hover:bg-gray-100 dark:hover:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="animate-spin" size={16} />
                                    Updating...
                                </>
                            ) : (
                                'Update Plan'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
