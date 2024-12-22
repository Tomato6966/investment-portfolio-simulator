import { format, startOfYear } from "date-fns";
import { create } from "zustand";

import { Asset, DateRange, HistoricalData, Investment } from "../types";

interface PortfolioState {
  assets: Asset[];
  dateRange: DateRange;
  addAsset: (asset: Asset) => void;
  removeAsset: (assetId: string) => void;
  clearAssets: () => void;
  addInvestment: (assetId: string, investment: Investment) => void;
  removeInvestment: (assetId: string, investmentId: string) => void;
  updateDateRange: (dateRange: DateRange) => void;
  updateAssetHistoricalData: (assetId: string, historicalData: HistoricalData[]) => void;
  updateInvestment: (assetId: string, investmentId: string, updatedInvestment: Investment) => void;
  clearInvestments: () => void;
  setAssets: (assets: Asset[]) => void;
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  assets: [],
  dateRange: {
    startDate: format(startOfYear(new Date()), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  },
  addAsset: (asset) =>
    set((state) => ({ assets: [...state.assets, asset] })),
  removeAsset: (assetId) =>
    set((state) => ({
      assets: state.assets.filter((asset) => asset.id !== assetId),
    })),
  clearAssets: () =>
    set(() => ({ assets: [] })),
  addInvestment: (assetId, investment) =>
    set((state) => ({
      assets: state.assets.map((asset) =>
        asset.id === assetId
          ? { ...asset, investments: [...asset.investments, investment] }
          : asset
      ),
    })),
  removeInvestment: (assetId, investmentId) =>
    set((state) => ({
      assets: state.assets.map((asset) =>
        asset.id === assetId
          ? {
              ...asset,
              investments: asset.investments.filter((inv) => inv.id !== investmentId),
            }
          : asset
      ),
    })),
  updateDateRange: (dateRange) =>
    set(() => ({ dateRange })),
  updateAssetHistoricalData: (assetId, historicalData) =>
    set((state) => ({
      assets: state.assets.map((asset) =>
        asset.id === assetId
          ? { ...asset, historicalData }
          : asset
      ),
    })),
  updateInvestment: (assetId, investmentId, updatedInvestment) =>
    set((state) => ({
      assets: state.assets.map((asset) =>
        asset.id === assetId
          ? {
              ...asset,
              investments: asset.investments.map((inv) =>
                inv.id === investmentId ? updatedInvestment : inv
              ),
            }
          : asset
      ),
    })),
  clearInvestments: () =>
    set((state) => ({
      assets: state.assets.map((asset) => ({ ...asset, investments: [] })),
    })),
  setAssets: (assets) => set({ assets }),
}));
