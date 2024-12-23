import { format } from "date-fns";
import {
	Download, FileDown, LineChart, Loader2, Pencil, RefreshCw, ShoppingBag, Trash2
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { usePortfolioSelector } from "../hooks/usePortfolio";
import { Investment } from "../types";
import { calculateInvestmentPerformance } from "../utils/calculations/performance";
import { downloadTableAsCSV, generatePortfolioPDF } from "../utils/export";
import { EditInvestmentModal } from "./Modals/EditInvestmentModal";
import { FutureProjectionModal } from "./Modals/FutureProjectionModal";
import { Tooltip } from "./utils/ToolTip";

export default function PortfolioTable() {
    const { assets, removeInvestment, clearInvestments } = usePortfolioSelector((state) => ({
        assets: state.assets,
        removeInvestment: state.removeInvestment,
        clearInvestments: state.clearInvestments,
    }));

    const [editingInvestment, setEditingInvestment] = useState<{
        investment: Investment;
        assetId: string;
    } | null>(null);
    const [showSavingsPlans, setShowSavingsPlans] = useState(true);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    const performance = useMemo(() => calculateInvestmentPerformance(assets), [assets]);

    const averagePerformance = useMemo(() => {
        return ((performance.investments.reduce((sum, inv) => sum + inv.performancePercentage, 0) / performance.investments.length) || 0).toFixed(2);
    }, [performance.investments]);

    const handleDelete = useCallback((investmentId: string, assetId: string) => {
        if (window.confirm("Are you sure you want to delete this investment?")) {
            removeInvestment(assetId, investmentId);
        }
    }, [removeInvestment]);

    const handleClearAll = useCallback(() => {
        if (window.confirm("Are you sure you want to clear all investments?")) {
            clearInvestments();
        }
    }, [clearInvestments]);

    const performanceTooltip = useMemo(() => (
        <div className="space-y-2">
            <p>The performance of your portfolio is {performance.summary.performancePercentage.toFixed(2)}%</p>
            <p>The average (acc.) performance of all positions is {averagePerformance}%</p>
            <p>The average (p.a.) performance of every year is {performance.summary.performancePerAnnoPerformance.toFixed(2)}%</p>
            <p>Best p.a.: {performance.summary.bestPerformancePerAnno?.[0]?.percentage?.toFixed(2) || "0.00"}% ({performance.summary.bestPerformancePerAnno?.[0]?.year || "N/A"})</p>
            <p>Worst p.a.: {performance.summary.worstPerformancePerAnno?.[0]?.percentage?.toFixed(2) || "0.00"}% ({performance.summary.worstPerformancePerAnno?.[0]?.year || "N/A"})</p>
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
        const performance = [];
        for (const asset of assets) {
            const savingsPlans = asset.investments.filter(inv => inv.type === 'periodic');
            if (savingsPlans.length > 0) {
                const assetPerformance = calculateInvestmentPerformance([{
                    ...asset,
                    investments: savingsPlans
                }]);
                performance.push({
                    assetName: asset.name,
                    amount: savingsPlans[0].amount,
                    ...assetPerformance.summary
                });
            }
        }
        return performance;
    }, [assets, isSavingsPlanOverviewDisabled]);

    const handleGeneratePDF = async () => {
        setIsGeneratingPDF(true);
        try {
            await generatePortfolioPDF(
                assets,
                performance,
                savingsPlansPerformance,
                performance.summary.performancePerAnnoPerformance
            );
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    return (
        <div className="space-y-4">
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
                            onClick={() => setShowSavingsPlans(prev => !prev)}
                            disabled={isSavingsPlanOverviewDisabled}
                            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <RefreshCw size={16} />
                            {showSavingsPlans ? 'Hide' : 'Show'} Savings Plans Performance
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
                    </div>
                </div>

                {!isSavingsPlanOverviewDisabled && showSavingsPlans && savingsPlansPerformance.length > 0 && (
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
                                    <th className="px-4 py-2">Total Invested</th>
                                    <th className="px-4 py-2">Current Value</th>
                                    <th className="px-4 py-2">Performance (%)</th>
                                    <th className="px-4 py-2 last:rounded-tr-lg">Performance (p.a.)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {savingsPlansPerformance.map((plan) => (
                                    <tr key={plan.assetName} className="border-t border-gray-200 dark:border-slate-600">
                                        <td className="px-4 py-2">{plan.assetName}</td>
                                        <td className="px-4 py-2">{plan.amount}</td>
                                        <td className="px-4 py-2">€{plan.totalInvested.toFixed(2)}</td>
                                        <td className="px-4 py-2">€{plan.currentValue.toFixed(2)}</td>
                                        <td className="px-4 py-2">{plan.performancePercentage.toFixed(2)}%</td>
                                        <td className="px-4 py-2">{plan.performancePerAnnoPerformance.toFixed(2)}%</td>
                                    </tr>
                                ))}
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
                                    performancePercentage: `${performance.summary.performancePercentage.toFixed(2)}% (avg. acc. ${averagePerformance}%) (avg. p.a. ${performance.summary.performancePerAnnoPerformance.toFixed(2)}%)`,
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
                                                    <li className="text-xs text-gray-500 dark:text-gray-400"> (avg. acc. {averagePerformance}%)</li>
                                                    <li className="text-xs text-gray-500 dark:text-gray-400"> (avg. p.a. {performance.summary.performancePerAnnoPerformance.toFixed(2)}%)</li>
                                                    <li className="text-xs text-gray-500 dark:text-gray-400"> (best p.a. {performance.summary.bestPerformancePerAnno?.[0]?.percentage?.toFixed(2) || "0.00"}% {performance.summary.bestPerformancePerAnno?.[0]?.year || "N/A"})</li>
                                                    <li className="text-xs text-gray-500 dark:text-gray-400"> (worst p.a. {performance.summary.worstPerformancePerAnno?.[0]?.percentage?.toFixed(2) || "0.00"}% {performance.summary.worstPerformancePerAnno?.[0]?.year || "N/A"})</li>
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
                                {performance.investments.sort((a, b) => a.date.localeCompare(b.date)).map((inv, index) => {
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
        </div>
    );
};
