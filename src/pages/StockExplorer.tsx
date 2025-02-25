import { format, subYears } from "date-fns";
import { ChevronDown, ChevronLeft, Filter, Plus, RefreshCw, Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import {
	CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";

import { useDarkMode } from "../hooks/useDarkMode";
import { EQUITY_TYPES, getHistoricalData, searchAssets } from "../services/yahooFinanceService";
import { Asset } from "../types";
import { getHexColor } from "../utils/formatters";

// Time period options
const TIME_PERIODS = {
    YTD: "Year to Date",
    "1Y": "1 Year",
    "3Y": "3 Years",
    "5Y": "5 Years",
    "10Y": "10 Years",
    "15Y": "15 Years",
    "20Y": "20 Years",
    MAX: "Maximum",
    CUSTOM: "Custom Range"
};

// Equity type options
const EQUITY_TYPESMAP: Record<keyof typeof EQUITY_TYPES, string> = {
    all: "All Types",
    ETF: "ETFs",
    Stock: "Stocks",
    "Etf or Stock": "ETF or Stock",
    Mutualfund: "Mutual Funds",
    Index: "Indices",
    Currency: "Currencies",
    Cryptocurrency: "Cryptocurrencies",
    Future: "Futures",
};

const StockExplorer = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Asset[]>([]);
    const [selectedStocks, setSelectedStocks] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [timePeriod, setTimePeriod] = useState<keyof typeof TIME_PERIODS>("1Y");
    const [equityType, setEquityType] = useState<keyof typeof EQUITY_TYPESMAP>("all");
    const [showEquityTypeDropdown, setShowEquityTypeDropdown] = useState(false);
    const [dateRange, setDateRange] = useState({
        startDate: subYears(new Date(), 1),
        endDate: new Date()
    });
    const [customDateRange, setCustomDateRange] = useState({
        startDate: subYears(new Date(), 1),
        endDate: new Date()
    });
    const [stockData, setStockData] = useState<any[]>([]);
    const [stockColors, setStockColors] = useState<Record<string, string>>({});
    const { isDarkMode } = useDarkMode();

    // Handle search
    const handleSearch = useCallback(async () => {
        if (!searchQuery || searchQuery.length < 2) {
            // Clear results if query is too short
            setSearchResults([]);
            return;
        }

        setSearchLoading(true);
        try {
            // Convert the equity type to a comma-separated string for the API
            const typeParam = EQUITY_TYPES[equityType];

            console.log(`Searching for "${searchQuery}" with type "${typeParam}"`);

            const results = await searchAssets(searchQuery, typeParam);

            console.log("Search results:", results);

            // Filter out stocks already in the selected list
            const filteredResults = results.filter(
                result => !selectedStocks.some(stock => stock.symbol === result.symbol)
            );

            setSearchResults(filteredResults);

            if (filteredResults.length === 0 && results.length > 0) {
                toast.custom((t: any) => (
                    <div className={`${t.visible ? 'animate-in' : 'animate-out'}`}>
                        All matching results are already in your comparison
                    </div>
                ));
            } else if (filteredResults.length === 0) {
                toast.error(`No ${equityType === 'all' ? '' : EQUITY_TYPESMAP[equityType]} results found for "${searchQuery}"`);
            }
        } catch (error) {
            console.error("Search error:", error);
            toast.error("Failed to search for stocks");
        } finally {
            setSearchLoading(false);
        }
    }, [searchQuery, equityType, selectedStocks]);

    // Handle enter key press in search input
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    // Add stock to comparison
    const addStock = useCallback(async (stock: Asset) => {
        // Check if the stock is already selected
        if (selectedStocks.some(s => s.symbol === stock.symbol)) {
            toast.error(`${stock.name} is already in your comparison`);
            return;
        }

        setLoading(true);
        try {
            const { historicalData, longName } = await getHistoricalData(
                stock.symbol,
                dateRange.startDate,
                dateRange.endDate
            );

            if (historicalData.size === 0) {
                toast.error(`No historical data available for ${stock.name}`);
                return;
            }

            const stockWithHistory = {
                ...stock,
                name: longName || stock.name,
                historicalData,
                investments: [] // Empty as we're just exploring
            };

            // Update selected stocks without causing an extra refresh
            setSelectedStocks(prev => [...prev, stockWithHistory]);

            // Assign a color
            setStockColors(prev => {
                const usedColors = new Set(Object.values(prev));
                const color = getHexColor(usedColors, isDarkMode);
                return { ...prev, [stockWithHistory.id]: color };
            });

            // Don't clear results, so users can add multiple stocks
            // Just clear the specific stock that was added
            setSearchResults(prev => prev.filter(result => result.symbol !== stock.symbol));

            toast.success(`Added ${stockWithHistory.name} to comparison`);
        } catch (error) {
            console.error("Error adding stock:", error);
            toast.error(`Failed to add ${stock.name}`);
        } finally {
            setLoading(false);
        }
    }, [dateRange, isDarkMode, selectedStocks]);

    // Remove stock from comparison
    const removeStock = useCallback((stockId: string) => {
        setSelectedStocks(prev => prev.filter(stock => stock.id !== stockId));
    }, []);

    // Update time period and date range
    const updateTimePeriod = useCallback((period: keyof typeof TIME_PERIODS) => {
        setTimePeriod(period);

        const endDate = new Date();
        let startDate;

        switch (period) {
            case "YTD":
                startDate = new Date(endDate.getFullYear(), 0, 1); // Jan 1 of current year
                break;
            case "1Y":
                startDate = subYears(endDate, 1);
                break;
            case "3Y":
                startDate = subYears(endDate, 3);
                break;
            case "5Y":
                startDate = subYears(endDate, 5);
                break;
            case "10Y":
                startDate = subYears(endDate, 10);
                break;
            case "15Y":
                startDate = subYears(endDate, 15);
                break;
            case "20Y":
                startDate = subYears(endDate, 20);
                break;
            case "MAX":
                startDate = new Date(1970, 0, 1); // Very early date for "max"
                break;
            case "CUSTOM":
                // Keep the existing custom range
                startDate = customDateRange.startDate;
                break;
            default:
                startDate = subYears(endDate, 1);
        }

        if (period !== "CUSTOM") {
            setDateRange({ startDate, endDate });
        } else {
            setDateRange(customDateRange);
        }
    }, [customDateRange]);

    // Process the stock data for display
    const processStockData = useCallback((stocks: Asset[]) => {
        // Create a combined dataset with data points for all dates
        const allDates = new Set<string>();
        const stockValues: Record<string, Record<string, number>> = {};

        // First gather all dates and initial values
        stocks.forEach(stock => {
            stockValues[stock.id] = {};

            stock.historicalData.forEach((value, dateStr) => {
                allDates.add(dateStr);
                stockValues[stock.id][dateStr] = value;
            });
        });

        // Convert to array of data points
        const sortedDates = Array.from(allDates).sort();
        return sortedDates.map(dateStr => {
            const dataPoint: Record<string, any> = { date: dateStr };

            // Add base value for each stock
            stocks.forEach(stock => {
                if (stockValues[stock.id][dateStr] !== undefined) {
                    dataPoint[stock.id] = stockValues[stock.id][dateStr];
                }
            });

            // Calculate percentage change for each stock
            stocks.forEach(stock => {
                // Find first available value for this stock
                const firstValue = Object.values(stockValues[stock.id])[0];
                const currentValue = stockValues[stock.id][dateStr];

                if (firstValue && currentValue) {
                    dataPoint[`${stock.id}_percent`] =
                        ((currentValue - firstValue) / firstValue) * 100;
                }
            });

            return dataPoint;
        });
    }, []);

    // Refresh stock data when stocks or date range changes
    const refreshStockData = useCallback(async () => {
        if (selectedStocks.length === 0) return;

        setLoading(true);
        try {
            // Fetch updated data for each stock
            const updatedStocks = await Promise.all(
                selectedStocks.map(async stock => {
                    const { historicalData, longName } = await getHistoricalData(
                        stock.symbol,
                        dateRange.startDate,
                        dateRange.endDate
                    );

                    return {
                        ...stock,
                        name: longName || stock.name,
                        historicalData
                    };
                })
            );

            // Update chart data
            setStockData(processStockData(updatedStocks));

            // Unconditionally update selectedStocks so the table refreshes
            setSelectedStocks(updatedStocks);

            toast.success("Stock data refreshed");
        } catch (error) {
            console.error("Error refreshing data:", error);
            toast.error("Failed to refresh stock data");
        } finally {
            setLoading(false);
        }
    }, [dateRange, processStockData]);

    // Calculate performance metrics for each stock with best/worst year
    const calculatePerformanceMetrics = useCallback((stock: Asset) => {
        const historicalData = Array.from(stock.historicalData.entries());
        if (historicalData.length < 2) return {
            ytd: "N/A",
            total: "N/A",
            annualized: "N/A",
        };

        // Sort by date
        historicalData.sort((a, b) =>
            new Date(a[0]).getTime() - new Date(b[0]).getTime()
        );

        const firstValue = historicalData[0][1];
        const lastValue = historicalData[historicalData.length - 1][1];

        // Calculate total return
        const totalPercentChange = ((lastValue - firstValue) / firstValue) * 100;

        // Calculate annualized return using a more precise year duration (365.25 days) and standard CAGR
        const firstDate = new Date(historicalData[0][0]);
        const lastDate = new Date(historicalData[historicalData.length - 1][0]);
        const yearsDiff = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        const annualizedReturn = (Math.pow(lastValue / firstValue, 1 / yearsDiff) - 1) * 100;

        return {
            total: `${totalPercentChange.toFixed(2)}%`,
            annualized: `${annualizedReturn.toFixed(2)}%/year`,
        };
    }, []);

    // Effect to refresh data when time period or stocks change
    useEffect(() => {
        // Only refresh when stocks are added/removed or dateRange changes
        refreshStockData();
        // Don't include refreshStockData in dependencies
    }, [selectedStocks.length, dateRange]);

    // Update custom date range
    const handleCustomDateChange = useCallback((start: Date, end: Date) => {
        const newRange = { startDate: start, endDate: end };
        setCustomDateRange(newRange);
        if (timePeriod === "CUSTOM") {
            setDateRange(newRange);
        }
    }, [timePeriod]);

    // Add debugging for chart display
    useEffect(() => {
        if (selectedStocks.length > 0) {
            console.log("Selected stocks:", selectedStocks);
            console.log("Stock data for chart:", stockData);
        }
    }, [selectedStocks, stockData]);

    // Ensure processStockData is called immediately when selectedStocks changes
    useEffect(() => {
        if (selectedStocks.length > 0) {
            const processedData = processStockData(selectedStocks);
            setStockData(processedData);
        }
    }, [selectedStocks, processStockData]);

    return (
        <div className="dark:bg-slate-900 min-h-screen w-full">
            <div className="container mx-auto p-4">
                <div className="flex items-center mb-6">
                    <Link
                        to="/"
                        className="flex items-center gap-1 text-blue-500 hover:text-blue-700 mr-4"
                    >
                        <ChevronLeft size={20} />
                        <span>Back to Home</span>
                    </Link>
                    <h1 className="text-2xl font-bold dark:text-white">Stock Explorer</h1>
                </div>

                {/* Search and add stocks */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 mb-6 dark:border dark:border-slate-700">
                    <h2 className="text-lg font-semibold mb-4 dark:text-gray-200">Add Assets to Compare</h2>

                    <div className="flex flex-col md:flex-row gap-2 mb-4">
                        <div className="flex-grow relative">
                            <input
                                type="text"
                                value={searchQuery}
                                disabled={searchLoading}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Search for stocks, ETFs, indices..."
                                className="w-full p-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed dark:bg-slate-700 dark:text-white dark:border-slate-600"
                            />
                            {searchLoading && (
                                <div className="absolute right-3 top-2.5">
                                    <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                                </div>
                            )}
                        </div>

                        {/* Equity Type Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowEquityTypeDropdown(!showEquityTypeDropdown)}
                                className="flex items-center gap-2 border p-2 rounded dark:bg-slate-700 dark:text-white dark:border-slate-600 min-w-[140px]"
                            >
                                <Filter size={16} />
                                {EQUITY_TYPESMAP[equityType]}
                                <ChevronDown size={16} className="ml-auto" />
                            </button>

                            {showEquityTypeDropdown && (
                                <div className="absolute top-full left-0 mt-1 bg-white dark:bg-slate-700 border dark:border-slate-600 rounded shadow-lg z-10 w-full">
                                    {Object.entries(EQUITY_TYPESMAP).map(([key, label]) => (
                                        <button
                                            key={key}
                                            onClick={() => {
                                                setEquityType(key as keyof typeof EQUITY_TYPESMAP);
                                                setShowEquityTypeDropdown(false);
                                            }}
                                            className={`block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-slate-600 dark:text-white ${equityType === key ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                                                }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleSearch}
                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={searchLoading}
                        >
                            <Search size={16} />
                            Search
                        </button>
                    </div>

                    {/* Search results */}
                    {searchResults.length > 0 && (
                        <div className="border rounded mb-4 max-h-[500px] overflow-y-auto dark:border-slate-600">
                            <div className="sticky top-0 bg-gray-100 dark:bg-slate-700 p-2 border-b dark:border-slate-600">
                                <span className="text-sm text-gray-500 dark:text-gray-300">
                                    {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found for "{searchQuery}"
                                </span>
                            </div>
                            {searchResults.map(result => (
                                <div
                                    key={result.id}
                                    className="p-3 border-b flex justify-between items-center hover:bg-gray-50 dark:hover:bg-slate-700 dark:border-slate-600 dark:text-gray-200"
                                >
                                    <div>
                                        <div className="font-medium">{result.name}</div>
                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                            {result.symbol} | {result.quoteType?.toUpperCase() || "Unknown"}
                                            {result.isin && ` | ${result.isin}`}
                                            {result.price && ` | ${result.price}`}
                                            {result.priceChangePercent && ` | ${result.priceChangePercent}`}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => addStock(result)}
                                            className="bg-green-500 text-white p-1 rounded hover:bg-green-600"
                                            title="Add to comparison"
                                        >
                                            <Plus size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Selected stocks */}
                    <div>
                        <h3 className="font-medium mb-2 dark:text-gray-300">Selected Stocks</h3>
                        {selectedStocks.length === 0 ? (
                            <p className="text-gray-500 dark:text-gray-400 italic">No stocks selected for comparison</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {selectedStocks.map(stock => {
                                    const metrics = calculatePerformanceMetrics(stock);
                                    return (
                                        <div
                                            key={stock.id}
                                            className="bg-gray-100 dark:bg-slate-700 rounded p-2 flex items-center gap-2"
                                        >
                                            <div
                                                className="w-3 h-3 rounded-full"
                                                style={{ backgroundColor: stockColors[stock.id] }}
                                            ></div>
                                            <span className="dark:text-white">{stock.name}</span>
                                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                                ({metrics.total})
                                            </span>
                                            <button
                                                onClick={() => removeStock(stock.id)}
                                                className="text-red-500 hover:text-red-700"
                                                title="Remove"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Time period selector */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 mb-6 dark:border dark:border-slate-700">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold dark:text-gray-200">Time Period</h2>
                        <button
                            onClick={refreshStockData}
                            className="flex items-center gap-1 text-blue-500 hover:text-blue-700"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                            ) : (
                                <RefreshCw size={16} />
                            )}
                            Refresh{loading && "ing"} Data
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4">
                        {Object.entries(TIME_PERIODS).map(([key, label]) => (
                            <button
                                key={key}
                                onClick={() => updateTimePeriod(key as keyof typeof TIME_PERIODS)}
                                className={`px-3 py-1 rounded ${timePeriod === key
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200'
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Custom date range selector (only visible when CUSTOM is selected) */}
                    {timePeriod === "CUSTOM" && (
                        <div className="flex gap-4 mb-4">
                            <div>
                                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={format(customDateRange.startDate, 'yyyy-MM-dd')}
                                    onChange={(e) => handleCustomDateChange(
                                        new Date(e.target.value),
                                        customDateRange.endDate
                                    )}
                                    className="border p-2 rounded dark:bg-slate-700 dark:text-white dark:border-slate-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={format(customDateRange.endDate, 'yyyy-MM-dd')}
                                    onChange={(e) => handleCustomDateChange(
                                        customDateRange.startDate,
                                        new Date(e.target.value)
                                    )}
                                    max={format(new Date(), 'yyyy-MM-dd')}
                                    className="border p-2 rounded dark:bg-slate-700 dark:text-white dark:border-slate-600"
                                />
                            </div>
                        </div>
                    )}

                    <div className="text-sm text-gray-500 dark:text-gray-400">
                        Showing data from {format(dateRange.startDate, 'MMM d, yyyy')} to {format(dateRange.endDate, 'MMM d, yyyy')}
                    </div>
                </div>

                {/* Chart */}
                {selectedStocks.length > 0 && stockData.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 mb-6 dark:border dark:border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold dark:text-gray-200">Performance Comparison</h2>
                        </div>

                        <div className="h-[500px] mb-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={stockData}>
                                    <CartesianGrid strokeDasharray="3 3" className="dark:stroke-slate-600" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(date) => format(new Date(date), 'dd.MM.yyyy')}
                                        tick={{ fill: isDarkMode ? '#D8D8D8' : '#4E4E4E' }}
                                    />
                                    <YAxis
                                        tick={{ fill: isDarkMode ? '#D8D8D8' : '#4E4E4E' }}
                                        tickFormatter={(value) => `${value.toFixed(2)}%`}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                                            border: 'none',
                                            color: isDarkMode ? '#d1d5d1' : '#000000',
                                            boxShadow: '0 0 10px 0 rgba(0, 0, 0, 0.5)',
                                        }}
                                        formatter={(value: number, name: string, props: any) => {
                                            const stockId = name.replace('_percent', '');
                                            const price = props.payload[stockId] || 0;
                                            const stockName = selectedStocks.find(s => s.id === stockId)?.name || name;
                                            return [
                                                `${value.toFixed(2)}% (€${price.toFixed(2)})`,
                                                stockName
                                            ];
                                        }}
                                        labelFormatter={(date) => format(new Date(date), 'dd.MM.yyyy')}
                                    />
                                    <Legend />

                                    {/* Only percentage lines */}
                                    {selectedStocks.map(stock => (
                                        <Line
                                            key={`${stock.id}_percent`}
                                            type="monotone"
                                            dataKey={`${stock.id}_percent`}
                                            name={stock.name}
                                            stroke={stockColors[stock.id]}
                                            dot={false}
                                        />
                                    ))}
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Performance metrics table */}
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 dark:bg-slate-700">
                                        <th className="p-2 text-left dark:text-gray-200">Stock</th>
                                        <th className="p-2 text-right dark:text-gray-200">Total Return</th>
                                        <th className="p-2 text-right dark:text-gray-200">Annualized Return</th>
                                        <th className="p-2 text-right dark:text-gray-200">Current Price</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {selectedStocks.map(stock => {
                                        const metrics = calculatePerformanceMetrics(stock);
                                        const historicalData = Array.from(stock.historicalData.entries());
                                        const currentPrice = historicalData.length > 0
                                            ? historicalData[historicalData.length - 1][1]
                                            : 0;

                                        return (
                                            <tr key={stock.id} className="border-b dark:border-slate-600">
                                                <td className="p-2 dark:text-gray-200">
                                                    <div className="flex items-center gap-2">
                                                        <div
                                                            className="w-3 h-3 rounded-full"
                                                            style={{ backgroundColor: stockColors[stock.id] }}
                                                        ></div>
                                                        {stock.name}
                                                    </div>
                                                </td>
                                                <td className="p-2 text-right dark:text-gray-200">{metrics.total}</td>
                                                <td className="p-2 text-right dark:text-gray-200">{metrics.annualized}</td>
                                                <td className="p-2 text-right dark:text-gray-200">€{currentPrice.toFixed(2)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockExplorer;
