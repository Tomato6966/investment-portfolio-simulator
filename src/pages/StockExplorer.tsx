import { format, subYears, subMonths } from "date-fns";
import { ChevronDown, ChevronLeft, Circle, Filter, Heart, Plus, RefreshCw, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Link, useSearchParams } from "react-router-dom";
import {
    CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";

import { useDarkMode } from "../hooks/useDarkMode";
import { EQUITY_TYPES, getHistoricalData, searchAssets } from "../services/yahooFinanceService";
import { Asset } from "../types";
import { formatCurrency, getHexColor } from "../utils/formatters";
import { intervalBasedOnDateRange } from "../utils/calculations/intervalBasedOnDateRange";
import { useLivePrice } from '../hooks/useLivePrice';
import { SortableTable } from '../components/SortableTable';
import { SavingsPlanSimulator } from '../components/SavingsPlanSimulator';

// Extended time period options
const TIME_PERIODS: { [key: string]: string } = {
    "MTD": "Month To Date",
    "1M": "1 Month",
    "3M": "3 Months",
    "6M": "6 Months",
    "YTD": "Year To Date",
    "1Y": "1 Year",
    "3Y": "3 Years",
    "5Y": "5 Years",
    "10Y": "10 Years",
    "15Y": "15 Years",
    "20Y": "20 Years",
    "MAX": "Max",
    "CUSTOM": "Custom",
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
    const initialFetch = useRef(false);
    const parsedAllocationsRef = useRef<Record<string, number>>({});
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<Asset[]>([]);
    const [selectedStocks, setSelectedStocks] = useState<(Asset & { currency?: string | null })[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [timePeriod, setTimePeriod] = useState<keyof typeof TIME_PERIODS>("YTD");
    const [equityType, setEquityType] = useState<keyof typeof EQUITY_TYPESMAP>("all");
    const [showEquityTypeDropdown, setShowEquityTypeDropdown] = useState(false);
    const [dateRange, setDateRange] = useState<{ startDate: Date; endDate: Date }>({
        startDate: new Date(new Date().getFullYear(), 0, 1),
        endDate: new Date()
    });
    const [customDateRange, setCustomDateRange] = useState({
        startDate: subYears(new Date(), 1),
        endDate: new Date()
    });
    const [stockData, setStockData] = useState<any[]>([]);
    const [stockColors, setStockColors] = useState<Record<string, string>>({});
    const { isDarkMode } = useDarkMode();
    const [showSearchBar, setShowSearchBar] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();
    const previousParamsRef = useRef<{
        stocks: string[];
        period: string;
        monthlyAmount: number;
        projectionYears: number;
        allocations: string;
    }>({
        stocks: [],
        period: '',
        monthlyAmount: 0,
        projectionYears: 0,
        allocations: ''
    });
    const [savingsPlanParams, setSavingsPlanParams] = useState({
        monthlyAmount: 1000,
        years: 5,
        allocations: {} as Record<string, number>
    });

    // On mount: Read URL query params and update states if found.
    useEffect(() => {
        if (initialFetch.current) return;
        initialFetch.current = true;

        const periodParam = searchParams.get("period");
        if (periodParam && Object.keys(TIME_PERIODS).includes(periodParam)) {
            setTimePeriod(periodParam as keyof typeof TIME_PERIODS);
            updateTimePeriod(periodParam as keyof typeof TIME_PERIODS);
        }
        
        // Get savings plan params first so they're ready when stocks load
        const monthlyAmountParam = searchParams.get("monthlyAmount");
        const yearsParam = searchParams.get("projectionYears");
        const allocationsParam = searchParams.get("allocations");

        let newSavingsPlanParams = {...savingsPlanParams};

        if (monthlyAmountParam) {
            newSavingsPlanParams.monthlyAmount = Number(monthlyAmountParam);
        }

        if (yearsParam) {
            newSavingsPlanParams.years = Number(yearsParam);
        }

        // Parse allocations but don't apply them yet - we'll do that after stocks load
        let parsedAllocations: Record<string, number> = {};
        if (allocationsParam) {
            try {
                const allocationPairs = allocationsParam.split(',');
                allocationPairs.forEach(pair => {
                    const [id, percentage] = pair.split(':');
                    if (id && percentage) {
                        parsedAllocations[id] = Number(percentage);
                    }
                });
            } catch (e) {
                console.error("Failed to parse allocations param:", e);
            }
        }
        
        // Update the ref value instead of creating a new ref
        parsedAllocationsRef.current = parsedAllocations;
        
        // Handle loading stocks from URL
        const stocksParam = searchParams.get("stocks");
        if (stocksParam) {
            const symbols = stocksParam.split(",");
            if (symbols.length > 0) {
                setLoading(true);
                
                // Load all stocks first, then apply allocations
                (async () => {
                    try {
                        // Create an array to hold all loaded stocks
                        const loadedStocks: Asset[] = [];
                        
                        // Process in batches to avoid rate limiting
                        const batchSize = 3;
                        const batches = [];
                        
                        for (let i = 0; i < symbols.length; i += batchSize) {
                            batches.push(symbols.slice(i, i + batchSize));
                        }
                        
                        for (const batch of batches) {
                            // Process each batch sequentially 
                            const batchResults = await Promise.all(
                                batch.map(async (symbol) => {
                                    const results = await searchAssets(symbol, EQUITY_TYPES[equityType]);
                                    if (results.length > 0) {
                                        // Get historical data for the stock
                                        const stock = results[0];
                                        const histData = await getHistoricalData(
                                            stock.symbol,
                                            dateRange.startDate,
                                            dateRange.endDate
                                        );
                                        
                                        // Create the complete stock object
                                        return {
                                            ...stock,
                                            ...histData
                                        } as unknown as Asset;
                                    }
                                    return null;
                                })
                            );
                            
                            // Add valid results to loadedStocks
                            batchResults.filter(Boolean).forEach(stock => {
                                if (stock) loadedStocks.push(stock);
                            });
                        }
                        
                        // Now that all stocks are loaded, set them all at once
                        if (loadedStocks.length > 0) {
                            setSelectedStocks(loadedStocks);
                            
                            // Assign colors to the stocks
                            const colors: Record<string, string> = {};
                            loadedStocks.forEach((stock) => {
                                colors[stock.id] = getHexColor(new Set(Object.values(colors)), isDarkMode);
                            });
                            setStockColors(colors);
                            
                            // Now apply the allocations
                            if (Object.keys(parsedAllocationsRef.current).length > 0) {
                                // Check if we have allocations for all stocks, otherwise use equal distribution
                                const hasAllAllocations = loadedStocks.every(
                                    stock => parsedAllocationsRef.current[stock.id] !== undefined
                                );
                                
                                if (hasAllAllocations) {
                                    newSavingsPlanParams.allocations = parsedAllocationsRef.current;
                                } else {
                                    // Fallback to equal distribution
                                    loadedStocks.forEach(stock => {
                                        newSavingsPlanParams.allocations[stock.id] = 100 / loadedStocks.length;
                                    });
                                }
                            } else {
                                // No allocations in URL, use equal distribution
                                loadedStocks.forEach(stock => {
                                    newSavingsPlanParams.allocations[stock.id] = 100 / loadedStocks.length;
                                });
                            }
                            
                            // Apply the final savings plan params
                            setSavingsPlanParams(newSavingsPlanParams);
                        }
                    } catch (error) {
                        console.error("Error loading stocks from URL:", error);
                        toast.error("Failed to load some stocks from URL");
                    } finally {
                        setLoading(false);
                    }
                })();
            } else {
                // No stocks to load, just set the savings plan params
                setSavingsPlanParams(newSavingsPlanParams);
            }
        } else {
            // No stocks to load, just set the savings plan params
            setSavingsPlanParams(newSavingsPlanParams);
        }
    }, []);  // Empty dependency array for mount only

    // Update URL query params when selectedStocks or timePeriod changes.
    useEffect(() => {
        // Create the new params object
        const params: Record<string, string> = {};
        const stockSymbols = selectedStocks.map(stock => stock.symbol);
        const stocksParam = stockSymbols.join(",");
        
        // Only add parameters if they have values
        if (selectedStocks.length > 0) {
            params.stocks = stocksParam;
        }
        if (timePeriod) {
            params.period = timePeriod.toString();
        }
        if (savingsPlanParams.monthlyAmount > 0) {
            params.monthlyAmount = savingsPlanParams.monthlyAmount.toString();
        }
        if (savingsPlanParams.years > 0) {
            params.projectionYears = savingsPlanParams.years.toString();
        }
        
        // Process allocations
        const allocationEntries = Object.entries(savingsPlanParams.allocations)
            .filter(([id, percentage]) => {
                return selectedStocks.some(stock => stock.id === id) && percentage > 0;
            })
            .map(([id, percentage]) => `${id}:${Math.round(percentage * 10) / 10}`);
        
        const allocationsParam = allocationEntries.join(',');
        if (allocationEntries.length > 0) {
            params.allocations = allocationsParam;
        }
        
        // Check if anything actually changed before updating URL
        const prevParams = previousParamsRef.current;
        const hasChanged = 
            stocksParam !== prevParams.stocks.join(",") ||
            timePeriod.toString() !== prevParams.period ||
            savingsPlanParams.monthlyAmount !== prevParams.monthlyAmount ||
            savingsPlanParams.years !== prevParams.projectionYears ||
            allocationsParam !== prevParams.allocations;
        
        // Only update URL if something changed
        if (hasChanged) {
            // Update the ref with new values
            previousParamsRef.current = {
                stocks: stockSymbols,
                period: timePeriod.toString(),
                monthlyAmount: savingsPlanParams.monthlyAmount,
                projectionYears: savingsPlanParams.years,
                allocations: allocationsParam
            };
            
            // Update the URL params
            setSearchParams(params);
        }
    }, [selectedStocks, timePeriod, savingsPlanParams, setSearchParams]);

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

            const results = await searchAssets(searchQuery, typeParam);

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
            // Use a more efficient date range for initial load
            const optimizedStartDate = timePeriod === "MAX" || timePeriod === "20Y" || timePeriod === "15Y" || timePeriod === "10Y"
                ? new Date(dateRange.startDate.getTime() + (365 * 24 * 60 * 60 * 1000)) // Skip first year for very long ranges
                : dateRange.startDate;

            const { historicalData, longName, currency } = await getHistoricalData(
                stock.symbol,
                optimizedStartDate,
                dateRange.endDate,
                intervalBasedOnDateRange({ startDate: optimizedStartDate, endDate: dateRange.endDate })
            );

            if (historicalData.size === 0) {
                toast.error(`No historical data available for ${stock.name}`);
                return;
            }

            const stockWithHistory = {
                ...stock,
                currency: currency,
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
            //setSearchResults(prev => prev.filter(result => result.symbol !== stock.symbol));
            setSearchResults([]);

            toast.success(`Added ${stockWithHistory.name} to comparison`);
        } catch (error) {
            console.error("Error adding stock:", error);
            toast.error(`Failed to add ${stock.name}`);
        } finally {
            setLoading(false);
        }
    }, [dateRange, isDarkMode, selectedStocks, timePeriod]);

    // Remove stock from comparison
    const removeStock = useCallback((stockId: string) => {
        setSelectedStocks(prev => prev.filter(stock => stock.id !== stockId));
    }, []);

    // Update time period and date range
    const updateTimePeriod = useCallback((period: keyof typeof TIME_PERIODS) => {
        setTimePeriod(period);
        const endDate = new Date();
        let startDate: Date;
        switch (period) {
            case "MTD":
                startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
                break;
            case "1M":
                startDate = subMonths(endDate, 1);
                break;
            case "3M":
                startDate = subMonths(endDate, 3);
                break;
            case "6M":
                startDate = subMonths(endDate, 6);
                break;
            case "YTD":
                startDate = new Date(endDate.getFullYear(), 0, 1);
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

    // Helper: Interpolate missing daily data so chart lines look connected
    // Assumes each data point is an object with a "date" property and one or more stock keys (e.g. "stockId_percent").
    const interpolateStockSeries = (data: any[]): any[] => {
        if (data.length === 0) return data;
        const interpolated = [...data];
        // Get all keys other than "date"
        const keys = Object.keys(data[0]).filter(key => key !== "date");
        keys.forEach(key => {
            // Loop over data points and fill missing values
            for (let i = 0; i < interpolated.length; i++) {
                if (interpolated[i][key] === undefined || interpolated[i][key] === null) {
                    // Find the previous non-null value
                    let prevIndex = i - 1;
                    while (prevIndex >= 0 && (interpolated[prevIndex][key] === undefined || interpolated[prevIndex][key] === null)) {
                        prevIndex--;
                    }
                    // Find the next non-null value
                    let nextIndex = i + 1;
                    while (nextIndex < interpolated.length && (interpolated[nextIndex][key] === undefined || interpolated[nextIndex][key] === null)) {
                        nextIndex++;
                    }
                    if (prevIndex >= 0 && nextIndex < interpolated.length) {
                        const prevVal = interpolated[prevIndex][key];
                        const nextVal = interpolated[nextIndex][key];
                        const fraction = (i - prevIndex) / (nextIndex - prevIndex);
                        interpolated[i][key] = prevVal + (nextVal - prevVal) * fraction;
                    } else if (prevIndex >= 0) {
                        interpolated[i][key] = interpolated[prevIndex][key];
                    } else if (nextIndex < interpolated.length) {
                        interpolated[i][key] = interpolated[nextIndex][key];
                    } else {
                        interpolated[i][key] = 0;
                    }
                }
            }
        });
        return interpolated;
    };

    // When stockData is ready, create an interpolated version for the chart.
    // (Assume stockData is computed elsewhere in this component.)
    const interpolatedStockData = interpolateStockSeries(stockData);

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
            // Process in batches for better performance
            const batchSize = 3;
            const batches = [];

            for (let i = 0; i < selectedStocks.length; i += batchSize) {
                batches.push(selectedStocks.slice(i, i + batchSize));
            }

            const updatedStocks = [...selectedStocks];

            for (const batch of batches) {
                await Promise.all(batch.map(async (stock) => {
                    try {
                        const { historicalData, longName } = await getHistoricalData(
                            stock.symbol,
                            dateRange.startDate,
                            dateRange.endDate,
                            intervalBasedOnDateRange({ startDate: dateRange.startDate, endDate: dateRange.endDate })
                        );

                        if (historicalData.size > 0) {
                            updatedStocks[selectedStocks.indexOf(stock)] = {
                                ...stock,
                                name: longName || stock.name,
                                historicalData
                            };
                        }
                    } catch (error) {
                        console.error(`Error refreshing ${stock.name}:`, error);
                    }
                }));
            }

            setSelectedStocks(updatedStocks);
            processStockData(updatedStocks);

        } catch (error) {
            console.error("Error refreshing data:", error);
            toast.error("Failed to refresh stock data");
        } finally {
            setLoading(false);
        }
    }, [dateRange, selectedStocks, timePeriod, processStockData]);

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
            total: `${totalPercentChange.toFixed(2)} %`,
            annualized: `${annualizedReturn.toFixed(2)} %/y`,
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

    // Ensure processStockData is called immediately when selectedStocks changes
    useEffect(() => {
        if (selectedStocks.length > 0) {
            const processedData = processStockData(selectedStocks);
            setStockData(processedData);
        }
    }, [selectedStocks, processStockData]);

    const LivePriceCell = ({ symbol }: { symbol: string }) => {
        const { livePrice, isLoading, lastUpdated, lastPrice, currency } = useLivePrice({
            symbol,
            refreshInterval: 60000, // 1 minute
            enabled: true
        });

        return (
            <div>
                {isLoading ? (
                    <span className="inline-block w-4 h-4 border-2 border-t-transparent border-blue-500 rounded-full animate-spin"></span>
                ) : livePrice ? (
                    <div>
                        <div className="flex p-2 text-right justify-end items-center gap-1">
                            <Circle size={16} className="text-green-500" />
                            <div>{formatCurrency(livePrice, currency)}</div>
                            <div className="text-xs text-gray-500">
                                {lastUpdated ? `Updated: ${format(lastUpdated, 'HH:mm:ss')}` : ''}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex p-2 text-right justify-end items-center gap-1">
                        <Circle size={16} className="text-red-500" /> Market Closed, last Price: {formatCurrency(lastPrice, currency)}
                    </div>
                )}
            </div>
        );
    };

    // Define column configurations for the sortable table
    const tableColumns = [
        {
            key: 'name',
            label: 'Stock',
            render: (value: string, row: any) => (
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: stockColors[row.id] }}
                    ></div>
                    {value}
                </div>
            )
        },
        {
            key: 'total',
            label: 'Total Return',
            sortable: true
        },
        {
            key: 'annualized',
            label: 'Annualized Return',
            sortable: true
        },
        {
            key: 'currentPrice',
            label: 'Current Price (last day)',
            sortable: true,
            render: (value: number, row: any) => formatCurrency(value, row.currency)
        },
        {
            key: 'symbol',
            label: 'Live Price',
            sortable: false,
            render: (value: string) => <LivePriceCell symbol={value} />
        }
    ];

    // Prepare data for the table
    const tableData = selectedStocks.map(stock => {
        const metrics = calculatePerformanceMetrics(stock);
        const historicalData = Array.from(stock.historicalData.entries());
        const currentPrice = historicalData.length > 0
            ? historicalData[historicalData.length - 1][1]
            : 0;

        return {
            id: stock.id,
            name: stock.name,
            symbol: stock.symbol,
            total: metrics.total,
            annualized: metrics.annualized,
            currentPrice,
            currency: stock.currency
        };
    });

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

                {/* Toggle button to show/hide the search bar */}

                {/* Conditionally render the search bar */}
                {/* Search and add stocks */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 mb-6 dark:border dark:border-slate-700">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold mb-4 dark:text-gray-200">Search & Add Assets to Compare</h2>
                        <button onClick={() => setShowSearchBar(!showSearchBar)} className="text-blue-500 hover:underline">
                            {showSearchBar ? "Collapse Search" : "Expand Search"}
                        </button>
                    </div>
                    {showSearchBar && (
                        <>
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
                                    <div className="sticky top-0 bg-gray-100 dark:bg-slate-700 p-2 border-b dark:border-slate-600 flex items-center gap-2">
                                        <button onClick={() => setSearchResults([])}>
                                            <X size={16} />
                                        </button>
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
                        </>)}
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

                    <div className="flex flex-wrap gap-2 mb-2">
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

                    {/* Custom date range selector (if CUSTOM is selected) */}
                    {timePeriod === "CUSTOM" && (
                        <div className="flex gap-4 mt-4">
                            <div>
                                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    value={format(customDateRange.startDate, 'yyyy-MM-dd')}
                                    onChange={(e) =>
                                        handleCustomDateChange(new Date(e.target.value), customDateRange.endDate)
                                    }
                                    className="border p-2 rounded dark:bg-slate-700 dark:text-white dark:border-slate-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    value={format(customDateRange.endDate, 'yyyy-MM-dd')}
                                    onChange={(e) =>
                                        handleCustomDateChange(customDateRange.startDate, new Date(e.target.value))
                                    }
                                    max={format(new Date(), 'yyyy-MM-dd')}
                                    className="border p-2 rounded dark:bg-slate-700 dark:text-white dark:border-slate-600"
                                />
                            </div>
                        </div>
                    )}

                    <div className="text-sm text-gray-500 dark:text-gray-400 italic mt-2">
                        <span className="text-red-400/50 pr-2">Data-Interval: {intervalBasedOnDateRange({ startDate: dateRange.startDate, endDate: dateRange.endDate })}</span>
                        Showing data from {format(dateRange.startDate, 'MMM d, yyyy')} to{' '}
                        {format(dateRange.endDate, 'MMM d, yyyy')}
                    </div>
                </div>

                {/* Chart */}
                {selectedStocks.length > 0 && stockData.length > 0 && (
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4 mb-6 dark:border dark:border-slate-700">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold dark:text-gray-200">
                                Performance Comparison
                            </h2>
                        </div>

                        <div className="h-[500px] mb-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={interpolatedStockData}>
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
                                            const stockName =
                                                selectedStocks.find((s) => s.id === stockId)?.name || name;
                                            return [`${value.toFixed(2)}% (€${price.toFixed(2)})`, stockName];
                                        }}
                                        labelFormatter={(date) => format(new Date(date), 'dd.MM.yyyy')}
                                    />
                                    <Legend />
                                    {/* Render one line per selected stock (using interpolated data) */}
                                    {selectedStocks.map((stock) => (
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
                            <SortableTable data={tableData} columns={tableColumns} />
                        </div>
                    </div>
                )}

                {/* Savings Plan Simulator */}
                {selectedStocks.length > 0 && (
                    <SavingsPlanSimulator stocks={selectedStocks} stockColors={stockColors} onParamsChange={setSavingsPlanParams} />
                )}
            </div>

            <a
                href="https://github.com/Tomato6966/investment-portfolio-simulator"
                target="_blank"
                rel="noopener noreferrer"
                className="fixed bottom-4 left-4 text-xs sm:text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1 transition-colors"
            >
                Built with <Heart className="w-3 h-3 sm:w-4 sm:h-4 text-red-500 inline animate-pulse" /> by Tomato6966
            </a>
        </div>
    );
};

export default StockExplorer;
