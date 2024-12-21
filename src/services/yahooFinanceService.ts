import { Asset } from "../types";

interface YahooQuoteDocument {
  symbol: string;
  shortName: string;
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

interface YahooSearchResponse {
  finance: {
    result: [{
      documents: YahooQuoteDocument[];
    }];
    error: null | string;
  };
}

interface YahooChartResult {
  timestamp: number[];
  indicators: {
    quote: [{
      close: number[];
    }];
  };
}

export const searchAssets = async (query: string): Promise<Asset[]> => {
  try {
    const params = new URLSearchParams({
      query,
      lang: 'en-US',
      type: 'equity,etf',
    });

    const response = await fetch(`/yahoo/v1/finance/lookup?${params}`);
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
        symbol: quote.symbol,
        price: quote.regularMarketPrice.raw,
        priceChange: quote.regularMarketChange.raw,
        priceChangePercent: quote.regularMarketPercentChange.raw,
        exchange: quote.exchange,
        historicalData: [],
        investments: [],
      }));
  } catch (error) {
    console.error('Error searching assets:', error);
    return [];
  }
};

export const getHistoricalData = async (symbol: string, startDate: string, endDate: string) => {
  try {
    const start = Math.floor(new Date(startDate).getTime() / 1000);
    const end = Math.floor(new Date(endDate).getTime() / 1000);

    const params = new URLSearchParams({
      period1: start.toString(),
      period2: end.toString(),
      interval: '1d',
    });

    const response = await fetch(`/yahoo/v8/finance/chart/${symbol}?${params}`);
    if (!response.ok) throw new Error('Network response was not ok');

    const data = await response.json();
    const { timestamp, indicators } = data.chart.result[0] as YahooChartResult;
    const quotes = indicators.quote[0];

    return timestamp.map((time: number, index: number) => ({
      date: new Date(time * 1000).toISOString().split('T')[0],
      price: quotes.close[index],
    }));
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return [];
  }
};
