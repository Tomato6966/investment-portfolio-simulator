import { isSameDay } from "date-fns";
import { BarChart as BarChartIcon, LineChart as LineChartIcon, Loader2, X } from "lucide-react";
import { useCallback, useState } from "react";
import {
	Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";

import { usePortfolioSelector } from "../../hooks/usePortfolio";
import { calculateFutureProjection } from "../../utils/calculations/futureProjection";
import { formatCurrency } from "../../utils/formatters";

import type { ProjectionData, SustainabilityAnalysis, WithdrawalPlan } from "../../types";
interface FutureProjectionModalProps {
    performancePerAnno: number;
    bestPerformancePerAnno: { percentage: number, year: number }[];
    worstPerformancePerAnno: { percentage: number, year: number }[];
    onClose: () => void;
}

export type ChartType = 'line' | 'bar';

type ScenarioCalc = { projection: ProjectionData[], sustainability: SustainabilityAnalysis | null, avaragedAmount: number, percentage: number, percentageAveraged: number };

export const FutureProjectionModal = ({
    performancePerAnno,
    bestPerformancePerAnno,
    worstPerformancePerAnno,
    onClose
}: FutureProjectionModalProps) => {
    const [years, setYears] = useState('10');
    const [isCalculating, setIsCalculating] = useState(false);
    const [chartType, setChartType] = useState<ChartType>('line');
    const [projectionData, setProjectionData] = useState<ProjectionData[]>([]);
    const [scenarios, setScenarios] = useState<{ best: ScenarioCalc, worst: ScenarioCalc }>({
        best: { projection: [], sustainability: null, avaragedAmount: 0, percentage: 0, percentageAveraged: 0 },
        worst: { projection: [], sustainability: null, avaragedAmount: 0, percentage: 0, percentageAveraged: 0 },
    });
    const [withdrawalPlan, setWithdrawalPlan] = useState<WithdrawalPlan>({
        amount: 0,
        interval: 'monthly',
        startTrigger: 'auto',
        startDate: new Date(),
        startPortfolioValue: 0,
        enabled: false,
        autoStrategy: {
            type: 'maintain',
            targetYears: 30,
            targetGrowth: 2,
        },
    });
    const [sustainabilityAnalysis, setSustainabilityAnalysis] = useState<SustainabilityAnalysis | null>(null);

    const { assets } = usePortfolioSelector((state) => ({
        assets: state.assets,
    }));

    const calculateProjection = useCallback(async () => {
        setIsCalculating(true);
        try {
            const { projection, sustainability } = await calculateFutureProjection(
                assets,
                parseInt(years),
                performancePerAnno,
                withdrawalPlan.enabled ? withdrawalPlan : undefined,
            );
            setProjectionData(projection);
            setSustainabilityAnalysis(sustainability);
            const slicedBestCase = bestPerformancePerAnno.slice(0, bestPerformancePerAnno.length > 1 ? Math.floor(bestPerformancePerAnno.length / 2) : 1);
            const slicedWorstCase = worstPerformancePerAnno.slice(0, worstPerformancePerAnno.length > 1 ? Math.floor(worstPerformancePerAnno.length / 2) : 1);
            const bestCase = slicedBestCase.reduce((acc, curr) => acc + curr.percentage, 0) / slicedBestCase.length || 0;
            const worstCase = slicedWorstCase.reduce((acc, curr) => acc + curr.percentage, 0) / slicedWorstCase.length || 0;

            const bestCaseAvaraged = (bestCase + performancePerAnno) / 2;
            const worstCaseAvaraged = (worstCase + performancePerAnno) / 2;
            setScenarios({
                best: {
                    ...await calculateFutureProjection(
                        assets,
                        parseInt(years),
                        bestCaseAvaraged,
                        withdrawalPlan.enabled ? withdrawalPlan : undefined
                    ),
                    avaragedAmount: slicedBestCase.length,
                    percentageAveraged: bestCaseAvaraged,
                    percentage: bestCase
                },
                worst: {
                    ...await calculateFutureProjection(
                        assets,
                        parseInt(years),
                        worstCaseAvaraged,
                        withdrawalPlan.enabled ? withdrawalPlan : undefined
                    ),
                    avaragedAmount: slicedWorstCase.length,
                    percentage: worstCase,
                    percentageAveraged: worstCaseAvaraged
                }
            });
        } catch (error) {
            console.error('Error calculating projection:', error);
        } finally {
            setIsCalculating(false);
        }
    }, [assets, years, withdrawalPlan, performancePerAnno, bestPerformancePerAnno, worstPerformancePerAnno]);

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const value = payload[0].value;
            const invested = payload[1].value;
            const withdrawn = payload[2]?.value || 0;
            const totalWithdrawn = payload[3]?.value || 0;
            const percentageGain = ((value - invested) / invested) * 100;

            return (
                <div className="bg-white dark:bg-slate-800 p-4 border rounded shadow-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        {new Date(label).toLocaleDateString('de-DE')}
                    </p>
                    <p className="font-bold text-indigo-600 dark:text-indigo-400">
                        Value: {formatCurrency(value)}
                    </p>
                    <p className="text-purple-600 dark:text-purple-400">
                        Invested: {formatCurrency(invested)}
                    </p>
                    {withdrawn > 0 && (
                        <>
                            <p className="text-orange-500">
                                Monthly Withdrawal: {formatCurrency(withdrawn)}
                            </p>
                            <p className="text-orange-600 font-bold">
                                Total Withdrawn: {formatCurrency(totalWithdrawn)}
                            </p>
                        </>
                    )}
                    <p className={`font-bold ${percentageGain >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        Return: {percentageGain.toFixed(2)}%
                    </p>
                </div>
            );
        }
        return null;
    };


    const CustomScenarioTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const bestCase = payload.find((p: any) => p.dataKey === 'bestCase')?.value || 0;
            const baseCase = payload.find((p: any) => p.dataKey === 'baseCase')?.value || 0;
            const worstCase = payload.find((p: any) => p.dataKey === 'worstCase')?.value || 0;
            const invested = payload.find((p: any) => p.dataKey === 'invested')?.value || 0;

            return (
                <div className="bg-white dark:bg-slate-800 p-4 border rounded shadow-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        {new Date(label).toLocaleDateString('de-DE')}
                    </p>
                    <p className="font-bold text-green-600 dark:text-green-400">
                        Best-Case: {formatCurrency(bestCase)} {((bestCase - invested) / invested * 100).toFixed(2)}%
                    </p>
                    <p className="font-bold text-indigo-600 dark:text-indigo-400">
                        Avg. Base-Case: {formatCurrency(baseCase)} {((baseCase - invested) / invested * 100).toFixed(2)}%
                    </p>
                    <p className="font-bold text-red-600 dark:text-red-400">
                        Worst-Case: {formatCurrency(worstCase)} {((worstCase - invested) / invested * 100).toFixed(2)}%
                    </p>
                </div>
            );
        }
        return null;
    };



    const renderChart = () => {
        if (isCalculating) {
            return (
                <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="animate-spin" size={48} />
                </div>
            );
        }

        if (!projectionData.length) {
            return (
                <div className="flex items-center justify-center text-red-500 dark:text-red-400">
                    Click calculate to see the projection
                </div>
            );
        }

        return (
            <ResponsiveContainer width="100%" height="100%">
                {chartType === 'line' ? (
                    <LineChart data={projectionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="date"
                            tickFormatter={(date) => new Date(date).toLocaleDateString('de-DE', {
                                year: 'numeric',
                                month: 'numeric'
                            })}
                        />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#4f46e5"
                            name="Portfolio Value"
                        />
                        <Line
                            type="monotone"
                            dataKey="invested"
                            stroke="#9333ea"
                            name="Invested Amount"
                        />
                        {withdrawalPlan.enabled && (
                            <>
                                <Line
                                    type="step"
                                    dataKey="withdrawals"
                                    stroke="#f97316"
                                    strokeDasharray="5 5"
                                    name="Monthly Withdrawal"
                                />
                                <Line
                                    type="monotone"
                                    dataKey="totalWithdrawn"
                                    stroke="#ea580c"
                                    name="Total Withdrawn"
                                />
                            </>
                        )}
                    </LineChart>
                ) : (
                    <BarChart data={projectionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="date"
                            tickFormatter={(date) => new Date(date).toLocaleDateString('de-DE', {
                                year: 'numeric',
                                month: 'numeric'
                            })}
                        />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                            type="monotone"
                            dataKey="value"
                            stroke="#4f46e5"
                            name="Portfolio Value"
                        />
                        <Bar
                            type="monotone"
                            dataKey="invested"
                            stroke="#9333ea"
                            name="Invested Amount"
                        />
                        {withdrawalPlan.enabled && (
                            <>
                                <Bar
                                    type="step"
                                    dataKey="withdrawals"
                                    stroke="#f97316"
                                    strokeDasharray="5 5"
                                    name="Monthly Withdrawal"
                                />
                                <Bar
                                    type="monotone"
                                    dataKey="totalWithdrawn"
                                    stroke="#ea580c"
                                    name="Total Withdrawn"
                                />
                            </>
                        )}
                    </BarChart>
                )}
            </ResponsiveContainer>
        );
    };

    const renderScenarioDescription = () => {
        if (!scenarios.best.projection.length) return null;

        const getLastValue = (projection: ProjectionData[]) => {
            const lastPoint = projection[projection.length - 1];
            return {
                value: lastPoint.value,
                invested: lastPoint.invested,
                returnPercentage: ((lastPoint.value - lastPoint.invested) / lastPoint.invested) * 100
            };
        };

        const baseCase = getLastValue(projectionData);
        const bestCase = getLastValue(scenarios.best.projection);
        const worstCase = getLastValue(scenarios.worst.projection);

        return (
            <div className="mb-4 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg text-sm">
                <h4 className="font-semibold mb-2 dark:text-gray-200">Scenario Calculations</h4>
                <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                    <li>
                        <span className="font-medium text-indigo-600 dark:text-indigo-400">Avg. Base Case:</span> Using historical average return of{' '}
                        <span className="font-bold underline">{performancePerAnno.toFixed(2)}%</span>
                        <i className="block text-gray-300 dark:text-gray-500">
                            After {years} years you'd have{' '}
                            <span className="font-bold">{formatCurrency(baseCase.value)}</span> from {formatCurrency(baseCase.invested)} invested,{' '}
                            that's a total return of <span className="font-bold">{baseCase.returnPercentage.toFixed(2)}%</span>
                        </i>
                    </li>
                    <li>
                        <span className="font-medium text-green-600 dark:text-green-400">Best Case:</span> Average of top 50% performing years ({scenarios.best.avaragedAmount} years) at {scenarios.best.percentage.toFixed(2)}%,
                        averaged with base case to <span className="font-semibold underline">{scenarios.best.percentageAveraged.toFixed(2)}%</span>.{' '}
                        <i className="block text-gray-300 dark:text-gray-500">
                            After {years} years you'd have <span className="font-bold">{formatCurrency(bestCase.value)}</span> from {formatCurrency(bestCase.invested)} invested,{' '}
                            that's a total return of <span className="font-bold">{bestCase.returnPercentage.toFixed(2)}%</span>
                        </i>
                    </li>
                    <li>
                        <span className="font-medium text-red-600 dark:text-red-400">Worst Case:</span> Average of bottom 50% performing years ({scenarios.worst.avaragedAmount} years) at {scenarios.worst.percentage.toFixed(2)}%,
                        averaged with base case to <span className="font-semibold underline">{scenarios.worst.percentageAveraged.toFixed(2)}%</span>.{' '}
                        <i className="block text-gray-300 dark:text-gray-500">
                        After {years} years you'd have <span className="font-bold">{formatCurrency(worstCase.value)}</span> from {formatCurrency(worstCase.invested)} invested,{' '}
                        that's a total return of <span className="font-bold">{worstCase.returnPercentage.toFixed(2)}%</span>
                        </i>
                    </li>
                </ul>
            </div>
        );
    };

    const renderScenarioChart = () => {
        if (!scenarios.best.projection.length) return null;

        // Create a merged and sorted dataset for consistent x-axis
        const mergedData = projectionData.map(basePoint => {
            const date = basePoint.date;
            const bestPoint = scenarios.best.projection.find(p => isSameDay(p.date, date));
            const worstPoint = scenarios.worst.projection.find(p => isSameDay(p.date, date));

            return {
                date,
                bestCase: bestPoint?.value || 0,
                baseCase: basePoint.value,
                worstCase: worstPoint?.value || 0,
                invested: basePoint.invested
            };
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return (
            <div className="mt-6">
                <h4 className="font-semibold mb-4 dark:text-gray-200">Scenario Comparison</h4>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={mergedData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="date"
                                tickFormatter={(date) => new Date(date).toLocaleDateString('de-DE', {
                                    year: 'numeric',
                                    month: 'numeric'
                                })}
                            />
                            <YAxis />
                            <Tooltip content={<CustomScenarioTooltip />}/>
                            <Line
                                type="monotone"
                                dataKey="bestCase"
                                stroke="#22c55e"
                                name="Best Case"
                                strokeWidth={2}
                            />
                            <Line
                                type="monotone"
                                dataKey="baseCase"
                                stroke="#4f46e5"
                                name="Base Case"
                                strokeWidth={2}
                            />
                            <Line
                                type="monotone"
                                dataKey="worstCase"
                                stroke="#ef4444"
                                name="Worst Case"
                                strokeWidth={2}
                            />
                            <Line
                                type="monotone"
                                dataKey="invested"
                                stroke="#9333ea"
                                name="Invested Amount"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 lg:p-4">
            <div className="bg-white dark:bg-slate-800 rounded-none lg:rounded-lg w-full lg:w-[80vw] max-w-4xl h-screen lg:h-[75dvh] flex flex-col">
                <div className="p-4 lg:p-6 border-b dark:border-slate-700 flex-shrink-0">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold dark:text-gray-200">Future Portfolio Projection</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-lg font-semibold mb-3 dark:text-gray-200">Projection Settings</h3>
                            <i className="block text-sm font-medium mb-1 dark:text-gray-300">
                                Project for next {years} years
                            </i>
                            <div className="flex gap-4">
                                <div>
                                    <input
                                        type="number"
                                        value={years}
                                        onChange={(e) => setYears(e.target.value)}
                                        min="1"
                                        max="50"
                                        className="w-24 p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                                    />
                                </div>
                                <button
                                    onClick={calculateProjection}
                                    disabled={isCalculating}
                                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isCalculating ? (
                                        <Loader2 className="animate-spin" size={16} />
                                    ) : (
                                        'Calculate'
                                    )}
                                </button>
                                <div className="flex gap-2 ml-auto">
                                    <button
                                        onClick={() => setChartType('line')}
                                        className={`p-2 rounded ${chartType === 'line' ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                                        title="Line Chart"
                                    >
                                        <LineChartIcon size={20} />
                                    </button>
                                    <button
                                        onClick={() => setChartType('bar')}
                                        className={`p-2 rounded ${chartType === 'bar' ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-slate-700'}`}
                                        title="Bar Chart"
                                    >
                                        <BarChartIcon size={20} />
                                    </button>
                                </div>
                            </div>
                            <div className="mt-10 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-slate-700/50 p-3 rounded">
                                <p>
                                    Future projections are calculated with your portfolio's average annual return rate of{' '}
                                    <span className="font-semibold underline">{performancePerAnno.toFixed(2)}%</span>.
                                </p>
                                <div className="mt-1">
                                    Strategy explanations:
                                    <ul className="list-disc ml-5 mt-1">
                                        <li><span className="font-semibold">Maintain:</span> Portfolio value stays constant, withdrawing only the returns</li>
                                        <li><span className="font-semibold">Deplete:</span> Portfolio depletes to zero over specified years</li>
                                        <li><span className="font-semibold">Grow:</span> Portfolio continues to grow at target rate while withdrawing</li>
                                    </ul>
                                </div>
                            </div>
                            {renderScenarioDescription()}
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="text-lg font-semibold dark:text-gray-200">Withdrawal Plan</h3>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={withdrawalPlan.enabled}
                                        onChange={(e) => setWithdrawalPlan(prev => ({
                                            ...prev,
                                            enabled: e.target.checked
                                        }))}
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            <div className={`space-y-4 ${!withdrawalPlan.enabled && 'opacity-50 pointer-events-none'}`}>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                                        Withdrawal Amount (€)
                                    </label>
                                    <input
                                        type="number"
                                        value={withdrawalPlan.amount}
                                        onChange={(e) => setWithdrawalPlan(prev => ({
                                            ...prev,
                                            amount: parseFloat(e.target.value)
                                        }))}
                                        min="0"
                                        step="100"
                                        className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                                        Withdrawal Interval
                                    </label>
                                    <select
                                        value={withdrawalPlan.interval}
                                        onChange={(e) => setWithdrawalPlan(prev => ({
                                            ...prev,
                                            interval: e.target.value as 'monthly' | 'yearly'
                                        }))}
                                        className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                                    >
                                        <option value="monthly">Monthly</option>
                                        <option value="yearly">Yearly</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                                        Start Trigger
                                    </label>
                                    <select
                                        value={withdrawalPlan.startTrigger}
                                        onChange={(e) => setWithdrawalPlan(prev => ({
                                            ...prev,
                                            startTrigger: e.target.value as 'date' | 'portfolioValue' | 'auto'
                                        }))}
                                        className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                                    >
                                        <option value="date">Specific Date</option>
                                        <option value="portfolioValue">Portfolio Value Threshold</option>
                                        <option value="auto" >Auto-Finder</option>
                                    </select>
                                </div>

                                {withdrawalPlan.startTrigger === 'date' ? (
                                    <div>
                                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                                            Start Date
                                        </label>
                                        <input
                                            type="date"
                                            value={withdrawalPlan.startDate?.toISOString().split('T')[0]}
                                            onChange={(e) => setWithdrawalPlan(prev => ({
                                                ...prev,
                                                startDate: new Date(e.target.value)
                                            }))}
                                            min={new Date().toISOString().split('T')[0]}
                                            className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                                        />
                                    </div>
                                ) : withdrawalPlan.startTrigger === 'portfolioValue' ? (
                                    <div>
                                        <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                                            Start at Portfolio Value (€)
                                        </label>
                                        <input
                                            type="number"
                                            value={withdrawalPlan.startPortfolioValue}
                                            onChange={(e) => setWithdrawalPlan(prev => ({
                                                ...prev,
                                                startPortfolioValue: parseFloat(e.target.value)
                                            }))}
                                            min="0"
                                            step="1000"
                                            className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                                        />
                                    </div>
                                ) : null}

                                {withdrawalPlan.startTrigger === 'auto' && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                                                Desired {withdrawalPlan.interval} Withdrawal (€)
                                            </label>
                                            <input
                                                type="number"
                                                value={withdrawalPlan.amount}
                                                onChange={(e) => setWithdrawalPlan(prev => ({
                                                    ...prev,
                                                    amount: parseFloat(e.target.value)
                                                }))}
                                                min="0"
                                                step="100"
                                                className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                                                Strategy
                                            </label>
                                            <select
                                                value={withdrawalPlan.autoStrategy?.type}
                                                onChange={(e) => setWithdrawalPlan(prev => ({
                                                    ...prev,
                                                    autoStrategy: {
                                                        ...prev.autoStrategy!,
                                                        type: e.target.value as 'maintain' | 'deplete' | 'grow'
                                                    }
                                                }))}
                                                className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                                            >
                                                <option value="maintain">Maintain Portfolio Value</option>
                                                <option value="deplete">Planned Depletion</option>
                                                <option value="grow">Sustainable Growth</option>
                                            </select>
                                        </div>

                                        {withdrawalPlan.autoStrategy?.type === 'deplete' && (
                                            <div>
                                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                                                    Years to Deplete After Starting
                                                </label>
                                                <input
                                                    type="number"
                                                    value={withdrawalPlan.autoStrategy.targetYears}
                                                    onChange={(e) => setWithdrawalPlan(prev => ({
                                                        ...prev,
                                                        autoStrategy: {
                                                            ...prev.autoStrategy!,
                                                            targetYears: parseInt(e.target.value)
                                                        }
                                                    }))}
                                                    min="1"
                                                    max="100"
                                                    className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                                                />
                                            </div>
                                        )}

                                        {withdrawalPlan.autoStrategy?.type === 'grow' && (
                                            <div>
                                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                                                    Annual Growth After Starting (%)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={withdrawalPlan.autoStrategy.targetGrowth}
                                                    onChange={(e) => setWithdrawalPlan(prev => ({
                                                        ...prev,
                                                        autoStrategy: {
                                                            ...prev.autoStrategy!,
                                                            targetGrowth: parseFloat(e.target.value)
                                                        }
                                                    }))}
                                                    min="0.1"
                                                    max="10"
                                                    step="0.1"
                                                    className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                                                />
                                            </div>
                                        )}

                                        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded text-sm">
                                            <p className="text-blue-800 dark:text-blue-200">
                                                {withdrawalPlan.autoStrategy?.type === 'maintain' && (
                                                    "The calculator will determine when your portfolio can sustain this withdrawal amount while maintaining its value."
                                                )}
                                                {withdrawalPlan.autoStrategy?.type === 'deplete' && (
                                                    "The calculator will determine when you can start withdrawing this amount to deplete the portfolio over your specified timeframe."
                                                )}
                                                {withdrawalPlan.autoStrategy?.type === 'grow' && (
                                                    "The calculator will determine when you can start withdrawing this amount while maintaining the target growth rate."
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {sustainabilityAnalysis && withdrawalPlan.enabled && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Withdrawal Analysis</h4>
                            <p className="text-blue-800 dark:text-blue-200">
                                To withdraw {formatCurrency(withdrawalPlan.amount)} {withdrawalPlan.interval}, you need to invest for{' '}
                                <span className="font-bold">{sustainabilityAnalysis.yearsToReachTarget} years</span> until your portfolio reaches{' '}
                                <span className="font-bold">{formatCurrency(sustainabilityAnalysis.targetValue)}</span>.
                            </p>
                            <p className="text-blue-800 dark:text-blue-200 mt-2">
                                With this withdrawal plan, your portfolio will{' '}
                                {sustainabilityAnalysis.sustainableYears === 'infinite' ? (
                                    <span className="font-bold">remain sustainable indefinitely</span>
                                ) : (
                                    <>
                                        last for{' '}
                                        <span className="font-bold">
                                            {sustainabilityAnalysis.sustainableYears} years
                                        </span>{' '}
                                        {sustainabilityAnalysis.sustainableYears > parseInt(years) && (
                                            <span className="text-sm">
                                                (extends beyond the current chart view of {years} years)
                                            </span>
                                        )}
                                    </>
                                )}
                                .
                            </p>
                        </div>
                    )}

                    <div className="space-y-6">
                        <div className="h-[500px]">
                            {renderChart()}
                        </div>
                        {renderScenarioChart()}
                    </div>
                </div>
            </div>
        </div>
    );
};
