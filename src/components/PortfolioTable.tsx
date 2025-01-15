import { format, isBefore } from "date-fns";
import {
	BarChart, BarChart2, Download, FileDown, LineChart, Loader2, Pencil, RefreshCw, ShoppingBag,
	Trash2, TrendingDown, TrendingUp
} from "lucide-react";
import { memo, useCallback, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { usePortfolioSelector } from "../hooks/usePortfolio";
import { Investment } from "../types";
import { calculateInvestmentPerformance } from "../utils/calculations/performance";
import { downloadTableAsCSV, generatePortfolioPDF } from "../utils/export";
import { AssetPerformanceModal } from "./Chart/AssetPerformanceModal";
import { PortfolioPerformanceModal } from "./Chart/PortfolioPerformanceModal";
import { EditInvestmentModal } from "./Modals/EditInvestmentModal";
import { EditSavingsPlanModal } from "./Modals/EditSavingsPlanModal";
import { FutureProjectionModal } from "./Modals/FutureProjectionModal";
import { Tooltip } from "./utils/ToolTip";

interface SavingsPlanPerformance {
    assetName: string;
    amount: number;
    totalInvested: number;
    currentValue: number;
    performancePercentage: number;
    performancePerAnnoPerformance: number;
    allocation?: number;
}

export default memo(function PortfolioTable() {
    const { assets, removeInvestment, clearInvestments } = usePortfolioSelector((state) => ({
        assets: state.assets,
        removeInvestment: state.removeInvestment,
        clearInvestments: state.clearInvestments,
    }));

    const [editingInvestment, setEditingInvestment] = useState<{
        investment: Investment;
        assetId: string;
    } | null>(null);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [isUpdatingSavingsPlan, setIsUpdatingSavingsPlan] = useState(false);
    const [editingSavingsPlan, setEditingSavingsPlan] = useState<{
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
    } | null>(null);
    const [showPortfolioPerformance, setShowPortfolioPerformance] = useState(false);

    const performance = useMemo(() => calculateInvestmentPerformance(assets), [assets]);

    const averagePerformance = useMemo(() => {
        return ((performance.investments.reduce((sum, inv) => sum + inv.performancePercentage, 0) / performance.investments.length) || 0).toFixed(2);
    }, [performance.investments]);

    const handleDelete = useCallback((investmentId: string, assetId: string) => {
        if (window.confirm("Are you sure you want to delete this investment?")) {
            try {
                removeInvestment(assetId, investmentId);
                toast.success('Investment deleted successfully');
            } catch (error:any) {
                toast.error('Failed to delete investment' + String(error?.message || error));
            }
        }
    }, [removeInvestment]);

    const handleClearAll = useCallback(() => {
        if (window.confirm("Are you sure you want to clear all investments?")) {
            try {
                clearInvestments();
                toast.success('All investments cleared successfully');
            } catch (error:any) {
                toast.error('Failed to clear investments' + String(error?.message || error));
            }
        }
    }, [clearInvestments]);

    const performanceTooltip = useMemo(() => (
        <div className="space-y-2">
            <p>The performance of your portfolio is {performance.summary.performancePercentage.toFixed(2)}%</p>
            <p>The average (acc.) performance of all positions is {averagePerformance}%</p>
            <p>The average (p.a.) performance of every year is {(performance.summary.performancePerAnnoPerformance || 0)?.toFixed(2)}%</p>
            <p>Best p.a.: {(performance.summary.bestPerformancePerAnno?.[0]?.percentage || 0)?.toFixed(2)}% ({performance.summary.bestPerformancePerAnno?.[0]?.year || "N/A"})</p>
            <p>Worst p.a.: {(performance.summary.worstPerformancePerAnno?.[0]?.percentage || 0)?.toFixed(2)}% ({performance.summary.worstPerformancePerAnno?.[0]?.year || "N/A"})</p>
            <p className="text-xs mt-2">
                Note: An average performance of positions doesn't always match your entire portfolio's average,
                especially with single investments or investments on different time ranges.
            </p>
        </div>
    ), [performance.summary.performancePercentage, averagePerformance, performance.summary.performancePerAnnoPerformance, performance.summary.bestPerformancePerAnno, performance.summary.worstPerformancePerAnno]);

    const buyInTooltip = useMemo(() => (
        <div className="space-y-2">
            <p>"Buy-in" shows the asset's price when that position was bought.</p>
            <p>"Avg" shows the average buy-in price across all positions for that asset.</p>
        </div>
    ), []);

    const currentAmountTooltip = useMemo(() => (
        "The current value of your investment based on the latest market price."
    ), []);

    const ttworTooltip = useMemo(() => (
        <div className="space-y-2">
            <p>Time Travel Without Risk (TTWOR) shows how your portfolio would have performed if all investments had been made at the beginning of the period.</p>
            <p className="text-xs mt-2">
                It helps to evaluate the impact of your investment timing strategy compared to a single early investment.
            </p>
        </div>
    ), []);

    const [showProjection, setShowProjection] = useState(false);

    const isSavingsPlanOverviewDisabled = useMemo(() => {
        return !assets.some(asset => asset.investments.some(inv => inv.type === 'periodic'));
    }, [assets]);

    const savingsPlansPerformance = useMemo(() => {
        if(isSavingsPlanOverviewDisabled) return [];
        const performance: SavingsPlanPerformance[] = [];
        const totalSavingsPlansAmount = assets
            .map(v => v.investments)
            .flat()
            .filter(inv => inv.type === 'periodic')
            .reduce((sum, inv) => sum + inv.amount, 0);

        // Second pass to calculate individual performances with allocation
        for (const asset of assets) {
            const savingsPlans = asset.investments.filter(inv => inv.type === 'periodic');
            const amount = savingsPlans.reduce((sum, inv) => sum + inv.amount, 0);
            if (savingsPlans.length > 0) {
                const assetPerformance = calculateInvestmentPerformance([{
                    ...asset,
                    investments: savingsPlans
                }]);
                performance.push({
                    assetName: asset.name,
                    amount: savingsPlans[0].amount,
                    ...assetPerformance.summary,
                    allocation: amount / totalSavingsPlansAmount * 100
                });
            }
        }
        return performance;
    }, [assets, isSavingsPlanOverviewDisabled]);

    const savingsPlansSummary = useMemo(() => {
        if (savingsPlansPerformance.length === 0) return null;

        const totalCurrentValue = savingsPlansPerformance.reduce((sum, plan) => sum + plan.currentValue, 0);
        const totalInvested = savingsPlansPerformance.reduce((sum, plan) => sum + plan.totalInvested, 0);
        const weightedPerformance = savingsPlansPerformance.reduce((sum, plan) => {
            return sum + (plan.performancePercentage * (plan.currentValue / totalCurrentValue));
        }, 0);
        const weightedPerformancePA = savingsPlansPerformance.reduce((sum, plan) => {
            return sum + (plan.performancePerAnnoPerformance * (plan.currentValue / totalCurrentValue));
        }, 0);

        return {
            totalAmount: savingsPlansPerformance.reduce((sum, plan) => sum + plan.amount, 0),
            totalInvested,
            totalCurrentValue,
            weightedPerformance,
            weightedPerformancePA,
        };
    }, [savingsPlansPerformance]);

    const handleGeneratePDF = async () => {
        setIsGeneratingPDF(true);
        try {
            await generatePortfolioPDF(
                assets,
                performance,
                savingsPlansPerformance,
                performance.summary.performancePerAnnoPerformance
            );
            toast.success('PDF generated successfully');
        } catch (error:any) {
            toast.error('Failed to generate PDF' + String(error?.message || error));
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const handleDeleteSavingsPlan = useCallback((assetId: string, groupId: string) => {
        if (window.confirm("Are you sure you want to delete this savings plan? All related investments will be removed.")) {
            try {
                setIsUpdatingSavingsPlan(true);
                setTimeout(() => {
                    try {
                        const asset = assets.find(a => a.id === assetId);
                        if (!asset) throw new Error('Asset not found');
                        const investments = asset.investments.filter(inv => inv.periodicGroupId === groupId);
                        investments.forEach(inv => {
                            removeInvestment(assetId, inv.id);
                        });
                        toast.success('Savings plan deleted successfully');
                    } catch (error:any) {
                        toast.error('Failed to delete savings plan: ' + String(error?.message || error));
                    } finally {
                        setIsUpdatingSavingsPlan(false);
                    }
                }, 10);
            } catch (error:any) {
                toast.error('Failed to delete savings plan: ' + String(error?.message || error));
            }
        }
    }, [assets, removeInvestment]);

    const [selectedAsset, setSelectedAsset] = useState<{
        name: string;
        performances: { year: number; percentage: number }[];
    } | null>(null);

    return (
        <div className="space-y-4">
            <div className="overflow-x-auto dark:text-gray-300 p-4 border-gray-300 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-800 shadow-lg dark:shadow-black/60">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <BarChart className="w-6 h-6" />
                    Assets Performance Overview
                </h2>
                <i>Calculated performance of each asset as of "paper"</i>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assets.map(asset => {
                        const datas = Array.from(asset.historicalData.values());
                        const startPrice = datas.shift();
                        const endPrice = datas.pop();
                        const avgPerformance = performance.summary.annualPerformancesPerAsset.get(asset.id);
                        const averagePerf = ((avgPerformance?.reduce?.((acc, curr) => acc + curr.percentage, 0) || 0) / (avgPerformance?.length || 1));

                        return (
                            <div
                                key={asset.id}
                                className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
                            >
                                <h3 className="text-lg font-bold mb-2 text-nowrap">{asset.name}</h3>
                                <div className="space-y-2">
                                    <table className="w-full">
                                        <thead>
                                            <tr>
                                                <th>Start Price:</th>
                                                <th>Current Price:</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="text-center">€{startPrice?.toFixed(2) || 'N/A'}</td>
                                                <td className="text-center">€{endPrice?.toFixed(2) || 'N/A'}
                                                <i className="pl-2 text-xs">({endPrice && startPrice && endPrice - startPrice > 0 ? '+' : ''}{endPrice && startPrice && ((endPrice - startPrice) / startPrice * 100).toFixed(2)}%)</i>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <button
                                        onClick={() => avgPerformance && setSelectedAsset({
                                            name: asset.name,
                                            performances: avgPerformance
                                        })}
                                        className="w-full mt-2 p-3 border bg-gray-100 border-gray-500 dark:border-gray-500 dark:bg-slate-800 rounded-lg flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                                    >
                                        <span className="text-gray-500 dark:text-gray-400">Avg. Performance:</span>
                                        <span className={`flex items-center gap-1 font-bold ${
                                            averagePerf >= 0 ? 'text-green-500' : 'text-red-500'
                                        }`}>
                                            {averagePerf.toFixed(2)}%
                                            {averagePerf >= 0 ? (
                                                <TrendingUp className="w-4 h-4" />
                                            ) : (
                                                <TrendingDown className="w-4 h-4" />
                                            )}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
                {selectedAsset && (
                    <AssetPerformanceModal
                        assetName={selectedAsset.name}
                        performances={selectedAsset.performances}
                        onClose={() => setSelectedAsset(null)}
                    />
                )}
            </div>
            <div className="overflow-x-auto min-h-[500px] dark:text-gray-300 p-4 border-gray-300 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-800 shadow-lg dark:shadow-black/60">
                <div className="flex flex-wrap justify-between items-center mb-4">
                    <h2 className="text-xl font-bold dark:text-gray-100">Portfolio's <u>Positions</u> Overview</h2>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={handleClearAll}
                            disabled={performance.investments.length === 0}
                            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Clear All Investments
                        </button>
                        <button
                            onClick={() => setShowProjection(true)}
                            disabled={performance.investments.length === 0}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <LineChart size={16} />
                            Future Projection
                        </button>

                        <button
                            onClick={handleGeneratePDF}
                            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={performance.investments.length === 0 || isGeneratingPDF}
                        >
                            {isGeneratingPDF ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <FileDown size={16} />
                            )}
                            {isGeneratingPDF ? 'Generating...' : 'Save Analysis'}
                        </button>

                        <button
                            onClick={() => setShowPortfolioPerformance(true)}
                            disabled={performance.investments.length === 0}
                            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <BarChart2 size={16} />
                            Portfolio Performance History
                        </button>
                    </div>
                </div>

                {!isSavingsPlanOverviewDisabled && savingsPlansPerformance.length > 0 && (
                    <div className="overflow-x-auto mb-4 dark:text-gray-300 p-4 border-gray-300 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-800 shadow-lg dark:shadow-black/60">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold">Savings Plans Performance</h3>
                            <button
                                onClick={() => downloadTableAsCSV(savingsPlansPerformance, 'savings-plans-performance')}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                                title="Download CSV"
                            >
                                <Download size={16} />
                            </button>
                        </div>
                        <table className="min-w-full bg-white dark:bg-slate-800">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-slate-700 text-left">
                                    <th className="px-4 py-2 first:rounded-tl-lg">Asset</th>
                                    <th className="px-4 py-2">Interval Amount</th>
                                    <th className="px-4 py-2">Allocation</th>
                                    <th className="px-4 py-2">Total Invested</th>
                                    <th className="px-4 py-2">Current Value</th>
                                    <th className="px-4 py-2">Performance (%)</th>
                                    <th className="px-4 py-2">Performance (p.a.)</th>
                                    <th className="px-4 py-2 last:rounded-tr-lg">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {savingsPlansSummary && (
                                    <tr className="font-bold bg-gray-50 dark:bg-slate-700 border-t border-gray-200 dark:border-slate-600">
                                        <td className="px-4 py-2">Total</td>
                                        <td className="px-4 py-2">€{savingsPlansSummary.totalAmount.toFixed(2)}</td>
                                        <td className="px-4 py-2">100%</td>
                                        <td className="px-4 py-2">€{savingsPlansSummary.totalInvested.toFixed(2)}</td>
                                        <td className="px-4 py-2">€{savingsPlansSummary.totalCurrentValue.toFixed(2)}</td>
                                        <td className="px-4 py-2">{savingsPlansSummary.weightedPerformance.toFixed(2)}%</td>
                                        <td className="px-4 py-2">{savingsPlansSummary.weightedPerformancePA.toFixed(2)}%</td>
                                        <td className="px-4 py-2"></td>
                                    </tr>
                                )}
                                {savingsPlansPerformance.sort((a, b) => Number(b.allocation || 0) - Number(a.allocation || 0)).map((plan) => {
                                    const asset = assets.find(a => a.name === plan.assetName)!;
                                    const firstInvestment = asset.investments.find(inv => inv.type === 'periodic')!;
                                    const groupId = firstInvestment.periodicGroupId!;

                                    return (
                                        <tr key={plan.assetName} className="border-t border-gray-200 dark:border-slate-600">
                                            <td className="px-4 py-2">{plan.assetName}</td>
                                            <td className="px-4 py-2">€{plan.amount.toFixed(2)}</td>
                                            <td className="px-4 py-2">{plan.allocation?.toFixed(2)}%</td>
                                            <td className="px-4 py-2">€{plan.totalInvested.toFixed(2)}</td>
                                            <td className="px-4 py-2">€{plan.currentValue.toFixed(2)}</td>
                                            <td className="px-4 py-2">{plan.performancePercentage.toFixed(2)}%</td>
                                            <td className="px-4 py-2">{plan.performancePerAnnoPerformance.toFixed(2)}%</td>
                                            <td className="px-4 py-2">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setEditingSavingsPlan({
                                                            assetId: asset.id,
                                                            groupId,
                                                            amount: firstInvestment.amount,
                                                            dayOfMonth: firstInvestment.date?.getDate() || 0,
                                                            interval: 1,
                                                        })}
                                                        className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                                                    >
                                                        {isUpdatingSavingsPlan || editingSavingsPlan ? (
                                                            <Loader2 className="animate-spin" size={16} />
                                                        ) : (<Pencil className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteSavingsPlan(asset.id, groupId)}
                                                        className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-red-500 transition-colors"
                                                    >
                                                        {isUpdatingSavingsPlan || editingSavingsPlan ? (
                                                            <Loader2 className="animate-spin" size={16} />
                                                        ) : (
                                                            <Trash2 className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="overflow-x-auto dark:text-gray-300 p-4 border-gray-300 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-800 shadow-lg dark:shadow-black/60">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">Positions Overview</h3>
                        <button
                            onClick={() => downloadTableAsCSV([
                                {
                                    id: "",
                                    assetName: "Total Portfolio",
                                    date: "",
                                    investedAmount: performance.summary.totalInvested.toFixed(2),
                                    investedAtPrice: "",
                                    currentValue: performance.summary.currentValue.toFixed(2),
                                    performancePercentage: `${performance.summary.performancePercentage.toFixed(2)}% (avg. acc. ${averagePerformance}%) (avg. p.a. ${(performance.summary.performancePerAnnoPerformance || 0).toFixed(2)}%)`,
                                    periodicGroupId: "",
                                },
                                {
                                    id: "",
                                    assetName: "TTWOR",
                                    date: "",
                                    investedAmount: performance.summary.totalInvested.toFixed(2),
                                    investedAtPrice: "",
                                    currentValue: performance.summary.ttworValue.toFixed(2),
                                    performancePercentage: `${performance.summary.ttworPercentage.toFixed(2)}%`,
                                    periodicGroupId: "",
                                },
                                ...performance.investments
                            ], 'portfolio-positions')}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                            title="Download CSV"
                        >
                            <Download size={16} />
                        </button>
                    </div>
                    <div className="rounded-lg">
                        <table className="min-w-full bg-white dark:bg-slate-800">
                            <thead>
                                <tr className="bg-gray-100 dark:bg-slate-700 text-left">
                                    <th className="px-4 py-2 first:rounded-tl-lg">Asset</th>
                                    <th className="px-4 py-2">Type</th>
                                    <th className="px-4 py-2">Date</th>
                                    <th className="px-4 py-2">Invested Amount</th>
                                    <th className="px-4 py-2">
                                        <Tooltip content={currentAmountTooltip}>
                                            Current Amount
                                        </Tooltip>
                                    </th>
                                    <th className="px-4 py-2">
                                        <Tooltip content={buyInTooltip}>
                                            Buy-In (avg)
                                        </Tooltip>
                                    </th>
                                    <th className="px-4 py-2">
                                        <Tooltip content={performanceTooltip}>
                                            Performance (%)
                                        </Tooltip>
                                    </th>
                                    <th className="px-4 py-2 last:rounded-tr-lg">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {performance.summary && (
                                    <>

                                        <tr className="font-bold bg-gray-50 dark:bg-slate-700 border-t border-gray-200 dark:border-slate-600">
                                            <td className="px-4 py-2">Total Portfolio</td>
                                            <td className="px-4 py-2"></td>
                                            <td className="px-4 py-2"></td>
                                            <td className="px-4 py-2">€{performance.summary.totalInvested.toFixed(2)}</td>
                                            <td className="px-4 py-2">€{performance.summary.currentValue.toFixed(2)}</td>
                                            <td className="px-4 py-2"></td>
                                            <td className="px-4 py-2">
                                                {performance.summary.performancePercentage.toFixed(2)}%
                                                <ul>
                                                    <li className="text-xs text-gray-500 dark:text-gray-400">(avg. acc. {averagePerformance}%)</li>
                                                    <li className="text-xs text-gray-500 dark:text-gray-400">(avg. p.a. {(performance.summary.performancePerAnnoPerformance || 0).toFixed(2)}%)</li>
                                                    <li className="text-[10px] text-gray-500 dark:text-gray-400 italic">(best p.a. {performance.summary.bestPerformancePerAnno?.[0]?.percentage?.toFixed(2) || "0.00"}% {performance.summary.bestPerformancePerAnno?.[0]?.year || "N/A"})</li>
                                                    <li className="text-[10px] text-gray-500 dark:text-gray-400 italic">(worst p.a. {performance.summary.worstPerformancePerAnno?.[0]?.percentage?.toFixed(2) || "0.00"}% {performance.summary.worstPerformancePerAnno?.[0]?.year || "N/A"})</li>
                                                </ul>
                                            </td>
                                            <td className="px-4 py-2"></td>
                                        </tr>


                                        <tr className="italic dark:text-gray-500 border-t border-gray-200 dark:border-slate-600 ">
                                            <td className="px-4 py-2">TTWOR</td>
                                            <td className="px-4 py-2"></td>
                                            <td className="px-4 py-2">{new Date(performance.investments[0]?.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td>
                                            <td className="px-4 py-2">€{performance.summary.totalInvested.toFixed(2)}</td>
                                            <td className="px-4 py-2">€{performance.summary.ttworValue.toFixed(2)}</td>
                                            <td className="px-4 py-2"></td>
                                            <td className="px-4 py-2"><Tooltip content={ttworTooltip}>{performance.summary.ttworPercentage.toFixed(2)}%</Tooltip></td>
                                            <td className="px-4 py-2"></td>
                                        </tr>
                                    </>
                                )}
                                {performance.investments.sort((a, b) => isBefore(a.date, b.date) ? -1 : 1).map((inv, index) => {
                                    const asset = assets.find(a => a.name === inv.assetName)!;
                                    const investment = asset.investments.find(i => i.id === inv.id)! || inv;
                                    const filtered = performance.investments.filter(v => v.assetName === inv.assetName);
                                    const avgBuyIn = filtered.reduce((acc, curr) => acc + curr.investedAtPrice, 0) / filtered.length;
                                    const isLast = index === performance.investments.length - 1;

                                    return (
                                        <tr key={inv.id} className={`border-t border-gray-200 dark:border-slate-600 ${isLast ? 'last:rounded-b-lg' : ''}`}>
                                            <td className={`px-4 py-2 ${isLast ? 'first:rounded-bl-lg' : ''}`}>{inv.assetName}</td>
                                            <td className="px-4 py-2">
                                                {investment?.type === 'periodic' ? (
                                                    <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                                                        <RefreshCw className="w-4 h-4 mr-1" />
                                                        SavingsPlan
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                                                        <ShoppingBag className="w-4 h-4 mr-1" />
                                                        OneTime
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2">{format(new Date(inv.date), 'dd.MM.yyyy')}</td>
                                            <td className="px-4 py-2">€{inv.investedAmount.toFixed(2)}</td>
                                            <td className="px-4 py-2">€{inv.currentValue.toFixed(2)}</td>
                                            <td className="px-4 py-2">€{inv.investedAtPrice.toFixed(2)} (€{avgBuyIn.toFixed(2)})</td>
                                            <td className="px-4 py-2">{inv.performancePercentage.toFixed(2)}%</td>
                                            <td className={`px-4 py-2 ${isLast ? 'last:rounded-br-lg' : ''}`}>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setEditingInvestment({ investment, assetId: asset.id })}
                                                        className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(inv.id, asset.id)}
                                                        className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded text-red-500 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {editingInvestment && (
                <EditInvestmentModal
                    investment={editingInvestment.investment}
                    assetId={editingInvestment.assetId}
                    onClose={() => setEditingInvestment(null)}
                />
            )}
            {showProjection && (
                <FutureProjectionModal
                    performancePerAnno={performance.summary.performancePerAnnoPerformance}
                    bestPerformancePerAnno={performance.summary.bestPerformancePerAnno}
                    worstPerformancePerAnno={performance.summary.worstPerformancePerAnno}
                    onClose={() => setShowProjection(false)}
                />
            )}
            {editingSavingsPlan && (
                <EditSavingsPlanModal
                    {...editingSavingsPlan}
                    onClose={() => setEditingSavingsPlan(null)}
                />
            )}
            {showPortfolioPerformance && (
                <PortfolioPerformanceModal
                    performances={performance.summary.annualPerformances}
                    onClose={() => setShowPortfolioPerformance(false)}
                />
            )}
        </div>
    );
});
