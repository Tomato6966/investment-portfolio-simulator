import type { Asset, YahooSearchResponse, YahooChartResult } from "../types";
import toast from "react-hot-toast";

// this is only needed when hosted staticly without a proxy server or smt
// TODO change it to use the proxy server
const isDev = import.meta.env.DEV;
const CORS_PROXY = 'https://corsproxy.io/?url=';
const YAHOO_API = 'https://query1.finance.yahoo.com';
const API_BASE = isDev ? '/yahoo' : `${CORS_PROXY}${encodeURIComponent(YAHOO_API)}`;

export const searchAssets = async (query: string): Promise<Asset[]> => {
    try {
        const params = new URLSearchParams({
            query,
            lang: 'en-US',
            type: 'equity,mutualfund,etf,index,currency,cryptocurrency', // allow searching for everything except: future
            longName: 'true',
        });

        const url = `${API_BASE}/v1/finance/lookup${!isDev ? encodeURIComponent(`?${params}`) : `?${params}`}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json() as YahooSearchResponse;

        if (data.finance.error) {
            throw new Error(data.finance.error);
        }

        if (!data.finance.result?.[0]?.documents) {
            return [];
        }

        return data.finance.result[0].documents
            .filter(quote => quote.quoteType === 'equity' || quote.quoteType === 'etf')
            .map((quote) => ({
                id: quote.symbol,
                isin: '', // not provided by Yahoo Finance API
                wkn: '', // not provided by Yahoo Finance API
                name: quote.shortName,
                rank: quote.rank,
                symbol: quote.symbol,
                quoteType: quote.quoteType,
                price: quote.regularMarketPrice.raw,
                priceChange: quote.regularMarketChange.raw,
                priceChangePercent: quote.regularMarketPercentChange.raw,
                exchange: quote.exchange,
                historicalData: [],
                investments: [],
            }));
    } catch (error) {
        console.error('Error searching assets:', error);
        toast.error('Failed to search assets. Please try again later.');
        return [];
    }
};

export const getHistoricalData = async (symbol: string, startDate: Date, endDate: Date) => {
    try {
        const start = Math.floor(startDate.getTime() / 1000);
        const end = Math.floor(endDate.getTime() / 1000);

        const params = new URLSearchParams({
            period1: start.toString(),
            period2: end.toString(),
            interval: '1d',
        });

        const url = `${API_BASE}/v8/finance/chart/${symbol}${!isDev ? encodeURIComponent(`?${params}`) : `?${params}`}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json();
        const { timestamp, indicators, meta } = data.chart.result[0] as YahooChartResult;
        const quotes = indicators.quote[0];

        return {
            historicalData: timestamp.map((time: number, index: number) => ({
                date: new Date(time * 1000),
                price: quotes.close[index],
            })),
            longName: meta.longName
        }
    } catch (error) {
        console.error('Error fetching historical data:', error);
        toast.error(`Failed to fetch historical data for ${symbol}. Please try again later.`);
        return { historicalData: [], longName: '' };
    }
};
