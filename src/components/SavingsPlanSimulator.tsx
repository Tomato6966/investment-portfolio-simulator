import { useState, useEffect, useRef } from 'react';
import { format, addMonths } from 'date-fns';
import { Asset } from '../types';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

interface SavingsPlanSimulatorProps {
  stocks: Asset[];
  stockColors: Record<string, string>;
  initialParams?: {
    monthlyAmount: number;
    years: number;
    allocations: Record<string, number>;
  };
  onParamsChange?: (params: {
    monthlyAmount: number;
    years: number;
    allocations: Record<string, number>;
  }) => void;
}

export const SavingsPlanSimulator = ({ 
  stocks, 
  stockColors,
  initialParams,
  onParamsChange 
}: SavingsPlanSimulatorProps) => {
  // Add a ref to track initial load
  const initialLoadComplete = useRef(false);
  const prevParamsRef = useRef<{
    monthlyAmount: number;
    years: number;
    allocations: string;
  }>({
    monthlyAmount: 0,
    years: 0,
    allocations: ''
  });
  
  // Initialize state with props if provided
  const [totalAmount, setTotalAmount] = useState<number>(initialParams?.monthlyAmount || 1000);
  const [years, setYears] = useState<number>(initialParams?.years || 5); // Default projection for 5 years
  const [allocations, setAllocations] = useState<Record<string, number>>(
    initialParams?.allocations || 
    stocks.reduce((acc, stock) => {
      acc[stock.id] = 100 / stocks.length; // Equal distribution by default
      return acc;
    }, {} as Record<string, number>)
  );

  // Call the onParamsChange callback when parameters change
  useEffect(() => {
    if (onParamsChange) {
      // Convert allocations to a comparable string 
      const allocationsString = JSON.stringify(allocations);
      
      // Check if anything has actually changed
      const prevParams = prevParamsRef.current;
      const hasChanged = 
        totalAmount !== prevParams.monthlyAmount ||
        years !== prevParams.years ||
        allocationsString !== prevParams.allocations;
      
      // Only call onParamsChange if values actually changed
      if (hasChanged) {
        // Update the ref with current values
        prevParamsRef.current = {
          monthlyAmount: totalAmount,
          years,
          allocations: allocationsString
        };
        
        // Notify parent of changes
        onParamsChange({
          monthlyAmount: totalAmount,
          years,
          allocations
        });
      }
    }
  }, [totalAmount, years, allocations, onParamsChange]);
  
  // Run simulation automatically on initial load with URL params
  useEffect(() => {
    // Only run on first render when we have initialParams
    if (!initialLoadComplete.current && stocks.filter(stock => stock.historicalData && stock.historicalData.size >= 2).length > 0) {
      initialLoadComplete.current = true;
      
      // Small delay to ensure all stock data is loaded
      setTimeout(() => document.getElementById('runSimulationButton')?.click(), 1000);
    }
  }, [stocks]);
  
  const [simulationResults, setSimulationResults] = useState<any>(null);
  const [simulationParams, setSimulationParams] = useState<{
    monthlyAmount: number;
    years: number;
    allocations: Record<string, number>;
  } | null>(null);
  
  // Calculate the total allocation percentage
  const totalAllocation = Object.values(allocations).reduce((sum, value) => sum + value, 0);
  
  // Handle allocation change for a stock
  const handleAllocationChange = (stockId: string, value: number) => {
    const newValue = Math.max(0, Math.min(100, value)); // Clamp between 0 and 100
    setAllocations(prev => ({
      ...prev,
      [stockId]: newValue
    }));
  };
  
  // Recalculate all allocations to sum to 100%
  const normalizeAllocations = () => {
    if (totalAllocation === 0) return;
    
    const factor = 100 / totalAllocation;
    const normalized = Object.entries(allocations).reduce((acc, [id, value]) => {
      acc[id] = Math.round((value * factor) * 10) / 10; // Round to 1 decimal place
      return acc;
    }, {} as Record<string, number>);
    
    setAllocations(normalized);
  };
  
  // Run the simulation
  const runSimulation = () => {
    // Normalize allocations to ensure they sum to 100%
    const normalizedAllocations = { ...allocations };
    if (totalAllocation !== 100) {
      const factor = 100 / totalAllocation;
      Object.keys(normalizedAllocations).forEach(id => {
        normalizedAllocations[id] = normalizedAllocations[id] * factor;
      });
    }
    
    // Calculate the monetary amount for each stock
    const stockAmounts = Object.entries(normalizedAllocations).reduce((acc, [id, percentage]) => {
      acc[id] = (percentage / 100) * totalAmount;
      return acc;
    }, {} as Record<string, number>);
    
    // Calculate performance metrics
    const performanceMetrics = calculatePerformanceMetrics(stocks, stockAmounts, years);
    
    // Save the parameters used for this simulation
    setSimulationParams({
      monthlyAmount: totalAmount,
      years,
      allocations: normalizedAllocations
    });
    
    setSimulationResults(performanceMetrics);
  };
  
  // Helper function to calculate performance metrics
  const calculatePerformanceMetrics = (stocks: Asset[], amounts: Record<string, number>, projectionYears: number) => {
    // Calculate expected annual return based on historical performance
    let totalWeight = 0;
    let weightedReturn = 0;
    
    const stockReturns: Record<string, number> = {};
    
    stocks.forEach(stock => {
      // Check if the stock ID exists in the amounts object
      if (!amounts[stock.id]) return;
      
      const weight = amounts[stock.id] / totalAmount;
      if (weight > 0) {
        totalWeight += weight;
        
        if (stock.historicalData && stock.historicalData.size >= 2) {
          // Calculate annualized return the same way as in StockExplorer.tsx
          const historicalData = Array.from(stock.historicalData.entries());
          
          // Sort by date
          historicalData.sort((a, b) => 
            new Date(a[0]).getTime() - new Date(b[0]).getTime()
          );
          
          const firstValue = historicalData[0][1];
          const lastValue = historicalData[historicalData.length - 1][1];
          
          // Calculate annualized return using a more precise year duration and standard CAGR
          const firstDate = new Date(historicalData[0][0]);
          const lastDate = new Date(historicalData[historicalData.length - 1][0]);
          const yearsDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
          
          // Use CAGR formula: (Final Value / Initial Value)^(1/Years) - 1
          const annualReturn = (Math.pow(lastValue / firstValue, 1 / yearsDiff) - 1);
          
          stockReturns[stock.id] = annualReturn;
          weightedReturn += annualReturn * weight;
        }
      }
    });
    
    // Convert the decimal to percentage for display
    const expectedAnnualReturn = weightedReturn * 100;
    
    // Generate projection data for chart
    const projectionData = [];
    const today = new Date();
    
    // Monthly compounding for regular investments
    let totalPortfolioValue = totalAmount; // Initial investment
    const stockValues: Record<string, number> = {};
    
    // Initialize stock values with initial investment according to allocations
    stocks.forEach(stock => {
      if (amounts[stock.id]) {
        const initialAmount = (amounts[stock.id] / totalAmount) * totalAmount;
        stockValues[stock.id] = initialAmount;
      }
    });
    
    // Initialize variables for total investment tracking
    let totalInvestment = totalAmount; // Initial investment
    
    // First data point is the initial investment
    projectionData.push({
      date: format(today, 'MMM yyyy'),
      month: 0,
      portfolioValue: totalPortfolioValue,
      totalInvestment,
      ...stockValues
    });
    
    // Create monthly data points for the chart (starting from month 1)
    for (let month = 1; month <= projectionYears * 12; month++) {
      const date = addMonths(today, month);
      
      // Apply compound returns for each stock based on its expected return
      stocks.forEach(stock => {
        if (stockValues[stock.id] > 0) {
          const baseReturn = stockReturns[stock.id] || weightedReturn;
          const baseMonthlyReturn = baseReturn / 12;
          
          // Add some randomness to make the returns vary month to month
          const monthFactor = month % 12; // To create some seasonal variation
          const randomFactor = 1; // Between 0.5 and 1.5
          const seasonalFactor = 1 + (Math.sin(monthFactor / 12 * Math.PI * 2) * 0.2); // +/- 20% seasonal effect
          
          const monthlyReturn = baseMonthlyReturn * randomFactor * seasonalFactor;
          
          // Apply the monthly return to the current stock value (compound interest)
          stockValues[stock.id] *= (1 + monthlyReturn);
        }
      });
      
      // Add new monthly investment according to allocation percentages
      Object.entries(amounts).forEach(([id, amount]) => {
        if (stockValues[id] !== undefined) {
          const investmentAmount = (amount / totalAmount) * totalAmount;
          stockValues[id] += investmentAmount;
        }
      });
      
      // Calculate total portfolio value after this month
      totalPortfolioValue = Object.values(stockValues).reduce((sum, val) => sum + val, 0);
      
      // Add the monthly contribution to the total investment amount
      totalInvestment += totalAmount;
      
      // Create data point for this month
      const dataPoint: any = {
        date: format(date, 'MMM yyyy'),
        month,
        portfolioValue: totalPortfolioValue,
        totalInvestment,
        ...stockValues
      };
      
      projectionData.push(dataPoint);
    }
    
    return {
      expectedAnnualReturn,
      portfolioValue: totalPortfolioValue,
      totalInvestment,
      stockValues,
      projectionData
    };
  };
  
  // Helper function: map a return to a color.
  // Negative returns will be red, positive green, with yellows in between.
  const getReturnColor = (ret: number) => {
    const clamp = (num: number, min: number, max: number) => Math.max(min, Math.min(num, max));
    // Normalize so that -10% maps to 0, 0% to 0.5, and +10% to 1. (Adjust these as needed)
    const normalized = clamp((ret + 0.1) / 0.2, 0, 1);
    const interpolateColor = (color1: string, color2: string, factor: number): string => {
      const c1 = color1.slice(1).match(/.{2}/g)!.map(hex => parseInt(hex, 16));
      const c2 = color2.slice(1).match(/.{2}/g)!.map(hex => parseInt(hex, 16));
      const r = Math.round(c1[0] + factor * (c2[0] - c1[0]));
      const g = Math.round(c1[1] + factor * (c2[1] - c1[1]));
      const b = Math.round(c1[2] + factor * (c2[2] - c1[2]));
      return `rgb(${r}, ${g}, ${b})`;
    };

    // Interpolate from red (#ff0000) to yellow (#ffff00) then yellow to green (#00ff00)
    if (normalized <= 0.5) {
      const factor = normalized / 0.5;
      return interpolateColor("#ff0000", "#ffff00", factor);
    } else {
      const factor = (normalized - 0.5) / 0.5;
      return interpolateColor("#ffff00", "#00ff00", factor);
    }
  };

  // Add a TIME_PERIODS constant based on StockExplorer's implementation
  const TIME_PERIODS = {
    "MTD": "Month to Date",
    "1M": "1 Month",
    "3M": "3 Months",
    "6M": "6 Months",
    "YTD": "Year to Date",
    "1Y": "1 Year",
    "3Y": "3 Years",
    "5Y": "5 Years",
    "10Y": "10 Years",
    "MAX": "Max"
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 mb-6 dark:border dark:border-slate-700">
      <h2 className="text-xl font-semibold mb-4 dark:text-gray-200">Simple Savings Plan Simulator</h2>
      
      <div className="flex flex-wrap gap-4">
        <div className="w-full">
          <div className="grid grid-cols-2 gap-12">
            <div className="mb-4">
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                Monthly Investment Amount
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  value={totalAmount}
                  onChange={(e) => setTotalAmount(Math.max(0, Number(e.target.value)))}
                  className="border p-2 rounded dark:bg-slate-700 dark:text-white dark:border-slate-600 w-full"
                />
                <span className="ml-2 dark:text-gray-400">€</span>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                Projection Years
              </label>
              <input
                  type="number"
                  value={years}
                  onChange={(e) => setYears(Math.max(0, Number(e.target.value)))}
                  className="border p-2 rounded dark:bg-slate-700 dark:text-white dark:border-slate-600 w-full"
                />
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-md font-semibold mb-2 dark:text-gray-300">Allocation Percentages</h3>
            <div className="grid grid-cols-8 gap-4">  
              <div className="flex flex-wrap gap-2 overflow-y-auto pr-2 col-span-7">
                {stocks.map(stock => (
                  <div key={stock.id} className="flex items-center border border-gray-200 dark:border-slate-700 rounded-md p-2 bg-gray-100 dark:bg-slate-700/50">
                    <div 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: stockColors[stock.id] }}
                    ></div>
                    <span className="text-sm dark:text-gray-300 mr-2 truncate flex-1">{stock.name}</span>
                    <input
                      type="number"
                      value={allocations[stock.id] || 0}
                      onChange={(e) => handleAllocationChange(stock.id, Number(e.target.value))}
                      className="border p-1 rounded dark:bg-slate-700 dark:text-white dark:border-slate-600 w-16 text-right"
                    />
                    <span className="ml-1 dark:text-gray-400">%</span>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between items-center mt-4">
                <div className={`text-sm ${totalAllocation === 100 ? 'text-green-500' : 'text-red-500'}`}>
                  Total Allocation: {totalAllocation.toFixed(1)}%
                </div>
                <button
                  onClick={normalizeAllocations}
                  disabled={totalAllocation === 100}
                  className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Normalize to 100%
                </button>
              </div>
            </div>
          </div>
          
          <button
            id="runSimulationButton"
            onClick={runSimulation}
            disabled={stocks.length === 0}
            className="w-full py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Run Simulation
          </button>
        </div>
        
        {simulationResults && simulationParams && (
          <div className="mt-6">
            {/* Modified Information Boxes - Now 5 boxes in total */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6">
              <div className="p-4 bg-gray-100 dark:bg-slate-700 rounded shadow">
                <h4 className="font-semibold text-lg dark:text-white">
                  Avg. Yearly Return
                </h4>
                <p className="text-2xl font-bold dark:text-white" style={{ 
                  color: simulationResults.expectedAnnualReturn >= 0 ? 
                    'var(--color-success, #10b981)' : 
                    'var(--color-danger, #ef4444)' 
                }}>
                  {simulationResults.expectedAnnualReturn.toFixed(2)}%
                </p>
              </div>
              <div className="p-4 bg-gray-100 dark:bg-slate-700 rounded shadow">
                <h4 className="font-semibold text-lg dark:text-white">
                  Monthly Investment
                </h4>
                <p className="text-2xl font-bold dark:text-white">
                  €{simulationParams.monthlyAmount.toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-gray-100 dark:bg-slate-700 rounded shadow">
                <h4 className="font-semibold text-lg dark:text-white">
                  Total Invested <span className="text-sm text-gray-500 dark:text-gray-400">({simulationParams.years} years)</span>
                </h4>
                <p className="text-2xl font-bold dark:text-white">
                  €{(simulationParams.monthlyAmount * simulationParams.years * 12).toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-gray-100 dark:bg-slate-700 rounded shadow">
                <h4 className="font-semibold text-lg dark:text-white">
                  Projected Portfolio Value
                </h4>
                <p className="text-2xl font-bold dark:text-white">
                  €{Math.round(simulationResults.portfolioValue).toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-gray-100 dark:bg-slate-700 rounded shadow">
                <h4 className="font-semibold text-lg dark:text-white">
                  Total Gain
                </h4>
                <p className="text-2xl font-bold dark:text-white">
                  €{Math.round(simulationResults.portfolioValue - (simulationParams.monthlyAmount * simulationParams.years * 12)).toLocaleString()}
                </p>
                <p className="dark:text-white">
                  {(((simulationResults.portfolioValue / (simulationParams.monthlyAmount * simulationParams.years * 12)) - 1) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
            
            {/* Full-Width Chart */}
            <div className="w-full h-[300px] mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={simulationResults.projectionData}>
                  <CartesianGrid strokeDasharray="3 3" className="dark:stroke-slate-600" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(date) => format(new Date(date), 'MMM yyyy')}
                    tick={{ fill: '#4E4E4E' }}
                  />
                  <YAxis tick={{ fill: '#4E4E4E' }} />
                  <Tooltip
                    formatter={(value: number) => [`€${Math.round(value).toLocaleString()}`, 'Value']}
                    labelFormatter={(label) => label}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="portfolioValue"
                    name="Portfolio Value"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalInvestment"
                    name="Total Invested"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 