import { format } from "date-fns";
import { HelpCircle, Pencil, RefreshCw, ShoppingBag, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { usePortfolioStore } from "../store/portfolioStore";
import { Investment } from "../types";
import { calculateInvestmentPerformance } from "../utils/calculations/performance";
import { EditInvestmentModal } from "./EditInvestmentModal";

interface TooltipProps {
    content: string | JSX.Element;
    children: React.ReactNode;
}

const Tooltip = ({ content, children }: TooltipProps) => {
    const [show, setShow] = useState(false);

    return (
        <div className="relative inline-block">
            <div
                className="flex items-center gap-1 cursor-help"
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
            >
                {children}
                <HelpCircle className="w-4 h-4 text-gray-400" />
            </div>
            {show && (
                <div className="absolute z-50 w-64 p-2 text-sm bg-black text-white rounded shadow-lg dark:shadow-black/60 -left-20 -bottom-2 transform translate-y-full">
                    {content}
                </div>
            )}
        </div>
    );
};

export const PortfolioTable = () => {
  const { assets, removeInvestment, clearInvestments } = usePortfolioStore((state) => ({
    assets: state.assets,
    removeInvestment: state.removeInvestment,
    clearInvestments: state.clearInvestments,
  }));

  const [editingInvestment, setEditingInvestment] = useState<{
    investment: Investment;
    assetId: string;
  } | null>(null);

  const performance = useMemo(() => calculateInvestmentPerformance(assets), [assets]);

  const averagePerformance = useMemo(() => {
    return (performance.investments.reduce((sum, inv) => sum + inv.performancePercentage, 0) / performance.investments.length).toFixed(2);
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
        <p>The average performance of all positions is {averagePerformance}%</p>
        <p className="text-xs mt-2">
            Note: An average performance of positions doesn't always match your entire portfolio's average,
            especially with single investments or investments on different time ranges.
        </p>
    </div>
  ), [performance.summary.performancePercentage, averagePerformance]);

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

  return (
    <div className="overflow-x-auto min-h-[500px] dark:text-gray-300 p-4 border-gray-300 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-800 shadow-lg dark:shadow-black/60">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold dark:text-gray-100">Portfolio's <u>Positions</u> Overview</h2>
        <button
          onClick={handleClearAll}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Clear All Investments
        </button>
      </div>
      <div className="relative rounded-lg overflow-hidden">
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
                  <i className="text-xs text-gray-500 dark:text-gray-400">(avg. {averagePerformance}%)</i>
                </td>
                <td className="px-4 py-2"></td>
                </tr>


                <tr className="italic dark:text-gray-500 border-t border-gray-200 dark:border-slate-600 ">
                    <td className="px-4 py-2">TTWOR</td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2">{performance.investments[0]?.date}</td>
                    <td className="px-4 py-2">€{performance.summary.totalInvested.toFixed(2)}</td>
                    <td className="px-4 py-2">€{performance.summary.ttworValue.toFixed(2)}</td>
                    <td className="px-4 py-2"></td>
                    <td className="px-4 py-2"><Tooltip content={ttworTooltip}>{performance.summary.ttworPercentage.toFixed(2)}%</Tooltip></td>
                    <td className="px-4 py-2"></td>
                </tr>
            </>
            )}
            {performance.investments.map((inv, index) => {
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
      {editingInvestment && (
        <EditInvestmentModal
          investment={editingInvestment.investment}
          assetId={editingInvestment.assetId}
          onClose={() => setEditingInvestment(null)}
        />
      )}
    </div>
  );
};
