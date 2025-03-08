import type { Asset, YahooSearchResponse, YahooChartResult } from "../types";
import toast from "react-hot-toast";

import { formatDateToISO } from "../utils/formatters";

// this is only needed when hosted staticly without a proxy server or smt
// TODO change it to use the proxy server
const isDev = import.meta.env.DEV;
const CORS_PROXY = 'https://corsproxy.io/?url=';
const YAHOO_API = 'https://query1.finance.yahoo.com';
const API_BASE = isDev ? '/yahoo' : `${CORS_PROXY}${encodeURIComponent(YAHOO_API)}`;

export const EQUITY_TYPES = {
    all: "etf,equity,mutualfund,index,currency,cryptocurrency,future",
    ETF: "etf",
    Stock: "equity",
    "Etf or Stock": "etf,equity",
    Mutualfund: "mutualfund",
    Index: "index",
    Currency: "currency",
    Cryptocurrency: "cryptocurrency",
    Future: "future",
};

export const searchAssets = async (query: string, equityType: string): Promise<Asset[]> => {
    try {
        // Log input parameters for debugging
        console.log(`Searching for "${query}" with type "${equityType}"`);

        const params = new URLSearchParams({
            query,
            lang: 'en-US',
            type: equityType,
            longName: 'true',
        });

        const url = `${API_BASE}/v1/finance/lookup${!isDev ? encodeURIComponent(`?${params}`) : `?${params}`}`;
        console.log(`Request URL: ${url}`);

        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Network error: ${response.status} ${response.statusText}`);
            throw new Error('Network response was not ok');
        }

        const data = await response.json() as YahooSearchResponse;
        console.log("API response:", data);

        if (data.finance.error) {
            console.error(`API error: ${data.finance.error}`);
            throw new Error(data.finance.error);
        }

        if (!data.finance.result?.[0]?.documents) {
            console.log("No results found");
            return [];
        }

        const equityTypes = equityType.split(",").map(v => v.toLowerCase());

        return data.finance.result[0].documents
            .filter(quote => {
                const matches = equityTypes.includes(quote.quoteType.toLowerCase());
                if (!matches) {
                    console.log(`Filtering out ${quote.symbol} (${quote.quoteType}) as it doesn't match ${equityTypes.join(', ')}`);
                }
                return matches;
            })
            .map((quote) => ({
                id: quote.symbol,
                isin: '', // not provided by Yahoo Finance API
                wkn: '', // not provided by Yahoo Finance API
                name: quote.shortName,
                rank: quote.rank,
                symbol: quote.symbol,
                quoteType: quote.quoteType,
                price: quote.regularMarketPrice.fmt,
                priceChange: quote.regularMarketChange.fmt,
                priceChangePercent: quote.regularMarketPercentChange.fmt,
                exchange: quote.exchange,
                historicalData: new Map(),
                investments: [],
            }));
    } catch (error) {
        console.error('Error searching assets:', error);
        toast.error('Failed to search assets. Please try again later.');
        return [];
    }
};

export const getHistoricalData = async (symbol: string, startDate: Date, endDate: Date, interval: string = "1d") => {
    try {
        const start = Math.floor(startDate.getTime() / 1000);
        const end = Math.floor(endDate.getTime() / 1000);

        const params = new URLSearchParams({
            period1: start.toString(),
            period2: end.toString(),
            interval: interval,
        });

        const url = `${API_BASE}/v8/finance/chart/${symbol}${!isDev ? encodeURIComponent(`?${params}`) : `?${params}`}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Network response was not ok (${response.status} - ${response.statusText} - ${await response.text().catch(() => 'No text')})`);

        const data = await response.json();
        const { timestamp, indicators, meta } = data.chart.result[0] as YahooChartResult;
        const quotes = indicators.quote[0];

        const lessThenADay = ["60m", "1h", "90m", "45m", "30m", "15m", "5m", "2m", "1m"].includes(interval);

        return {
            historicalData: new Map(timestamp.map((time: number, index: number) => [formatDateToISO(new Date(time * 1000), lessThenADay), quotes.close[index]])),
            longName: meta.longName
        }
    } catch (error) {
        console.error('Error fetching historical data:', error);
        toast.error(`Failed to fetch historical data for ${symbol}. Please try again later.`);
        return { historicalData: new Map<string, number>(), longName: '' };
    }
};
