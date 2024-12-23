export interface Asset {
    id: string;
    isin: string;
    name: string;
    quoteType: string;
    rank: string;
    wkn: string;
    symbol: string;
    historicalData: HistoricalData[];
    investments: Investment[];
}

export interface HistoricalData {
    date: string;
    price: number;
}

export interface Investment {
    id: string;
    assetId: string;
    type: 'single' | 'periodic';
    amount: number;
    date?: string;
    periodicGroupId?: string;
}

export interface PeriodicSettings {
    dayOfMonth: number;
    interval: number;
    dynamic?: {
        type: 'percentage' | 'fixed';
        value: number;
        yearInterval: number;
    };
}

export interface InvestmentPerformance {
    id: string;
    assetName: string;
    date: string;
    investedAmount: number;
    investedAtPrice: number;
    currentValue: number;
    performancePercentage: number;
    periodicGroupId?: string;
}

export interface DateRange {
    startDate: string;
    endDate: string;
}

export interface InvestmentPerformance {
    id: string;
    assetName: string;
    date: string;
    investedAmount: number;
    investedAtPrice: number;
    currentValue: number;
    performancePercentage: number;
}

export interface PortfolioPerformance {
    investments: InvestmentPerformance[];
    summary: {
        totalInvested: number;
        currentValue: number;
        performancePercentage: number;
        performancePerAnnoPerformance: number;
        ttworValue: number;
        ttworPercentage: number;
        bestPerformancePerAnno: { percentage: number, year: number }[];
        worstPerformancePerAnno: { percentage: number, year: number }[];
    };
}

export type DayData = {
    date: string;
    total: number;
    invested: number;
    percentageChange: number;
    /* Current price of asset */
    assets: { [key: string]: number };
};

export interface WithdrawalPlan {
    amount: number;
    interval: 'monthly' | 'yearly';
    startTrigger: 'date' | 'portfolioValue' | 'auto';
    startDate?: string;
    startPortfolioValue?: number;
    enabled: boolean;
    autoStrategy?: {
        type: 'maintain' | 'deplete' | 'grow';
        targetYears?: number;
        targetGrowth?: number;
    };
}

export interface ProjectionData {
    date: string;
    value: number;
    invested: number;
    withdrawals: number;
    totalWithdrawn: number;
}

export interface SustainabilityAnalysis {
    yearsToReachTarget: number;
    targetValue: number;
    sustainableYears: number | 'infinite';
}

export interface PeriodicSettings {
    startDate: string;
    dayOfMonth: number;
    interval: number;
    amount: number;
    dynamic?: {
        type: 'percentage' | 'fixed';
        value: number;
        yearInterval: number;
    };
}

interface YahooQuoteDocument {
    symbol: string;
    shortName: string;
    rank: string;
    regularMarketPrice: {
        raw: number;
        fmt: string;
    };
    regularMarketChange: {
        raw: number;
        fmt: string;
    };
    regularMarketPercentChange: {
        raw: number;
        fmt: string;
    };
    exchange: string;
    quoteType: string;
}

export interface YahooSearchResponse {
    finance: {
        result: [{
            documents: YahooQuoteDocument[];
        }];
        error: null | string;
    };
}

export interface YahooChartResult {
    timestamp: number[];
    meta: {
        currency: string;
        symbol: string;
        exchangeName: string;
        fullExchangeName: string;
        instrumentType: string;
        firstTradeDate: number;
        regularMarketTime: number;
        hasPrePostMarketData: boolean;
        gmtoffset: number;
        timezone: string;
        exchangeTimezoneName: string;
        regularMarketPrice: number;
        fiftyTwoWeekHigh: number;
        fiftyTwoWeekLow: number;
        regularMarketDayHigh: number;
        regularMarketDayLow: number;
        regularMarketVolume: number;
        longName: string;
        shortName: string;
        chartPreviousClose: number;
        priceHint: number;
        currentTradingPeriod: {
            pre: {
                timezone: string;
                start: number;
                end: number;
                gmtoffset: number;
            };
            regular: {
                timezone: string;
                start: number;
                end: number;
                gmtoffset: number;
            };
            post: {
                timezone: string;
                start: number;
                end: number;
                gmtoffset: number;
            };
        };
        dataGranularity: string;
        range: string;
        validRanges: string[];
    }
    indicators: {
        quote: [{
            close: number[];
        }];
    };
}
