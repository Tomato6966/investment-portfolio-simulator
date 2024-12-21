export interface Asset {
  id: string;
  isin: string;
  name: string;
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
    avgBuyIn: number;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}
