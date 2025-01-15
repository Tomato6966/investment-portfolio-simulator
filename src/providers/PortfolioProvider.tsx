import { startOfYear } from "date-fns";
import { createContext, useMemo, useReducer } from "react";

import { Asset, DateRange, Investment } from "../types";

// State Types
interface PortfolioState {
    assets: Asset[];
    isLoading: boolean;
    dateRange: DateRange;
}

// Action Types
type PortfolioAction =
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'ADD_ASSET'; payload: Asset }
    | { type: 'REMOVE_ASSET'; payload: string }
    | { type: 'CLEAR_ASSETS' }
    | { type: 'ADD_INVESTMENT'; payload: { assetId: string; investment: Investment | Investment[] } }
    | { type: 'REMOVE_INVESTMENT'; payload: { assetId: string; investmentId: string } }
    | { type: 'UPDATE_DATE_RANGE'; payload: DateRange }
    | { type: 'UPDATE_ASSET_HISTORICAL_DATA'; payload: { assetId: string; historicalData: Asset['historicalData']; longName?: string } }
    | { type: 'UPDATE_INVESTMENT'; payload: { assetId: string; investmentId: string; investment: Investment } }
    | { type: 'CLEAR_INVESTMENTS' }
    | { type: 'SET_ASSETS'; payload: Asset[] };

// Initial State
const initialState: PortfolioState = {
    assets: [],
    isLoading: false,
    dateRange: {
        startDate: startOfYear(new Date()),
        endDate: new Date(),
    },
};

// Reducer
const portfolioReducer = (state: PortfolioState, action: PortfolioAction): PortfolioState => {
    switch (action.type) {
        case 'SET_LOADING':
            return { ...state, isLoading: action.payload };

        case 'ADD_ASSET':
            return { ...state, assets: [...state.assets, action.payload] };

        case 'REMOVE_ASSET':
            return {
                ...state,
                assets: state.assets.filter(asset => asset.id !== action.payload)
            };

        case 'CLEAR_ASSETS':
            return { ...state, assets: [] };

        case 'ADD_INVESTMENT':
            return {
                ...state,
                assets: state.assets.map(asset =>
                    asset.id === action.payload.assetId
                        ? { ...asset, investments: [...asset.investments, ...(Array.isArray(action.payload.investment) ? action.payload.investment : [action.payload.investment])] }
                        : asset
                )
            };

        case 'REMOVE_INVESTMENT':
            return {
                ...state,
                assets: state.assets.map(asset =>
                    asset.id === action.payload.assetId
                        ? {
                            ...asset,
                            investments: asset.investments.filter(inv => inv.id !== action.payload.investmentId)
                        }
                        : asset
                )
            };

        case 'UPDATE_DATE_RANGE':
            return { ...state, dateRange: action.payload };

        case 'UPDATE_ASSET_HISTORICAL_DATA':
            return {
                ...state,
                assets: state.assets.map(asset =>
                    asset.id === action.payload.assetId
                        ? {
                            ...asset,
                            historicalData: action.payload.historicalData,
                            name: action.payload.longName || asset.name
                        }
                        : asset
                )
            };

        case 'UPDATE_INVESTMENT':
            return {
                ...state,
                assets: state.assets.map(asset =>
                    asset.id === action.payload.assetId
                        ? {
                            ...asset,
                            investments: asset.investments.map(inv =>
                                inv.id === action.payload.investmentId ? action.payload.investment : inv
                            )
                        }
                        : asset
                )
            };

        case 'CLEAR_INVESTMENTS':
            return {
                ...state,
                assets: state.assets.map(asset => ({ ...asset, investments: [] }))
            };

        case 'SET_ASSETS':
            return { ...state, assets: action.payload };

        default:
            return state;
    }
};

// Context
export interface PortfolioContextType extends PortfolioState {
    setLoading: (loading: boolean) => void;
    addAsset: (asset: Asset) => void;
    removeAsset: (assetId: string) => void;
    clearAssets: () => void;
    addInvestment: (assetId: string, investment: Investment | Investment[]) => void;
    removeInvestment: (assetId: string, investmentId: string) => void;
    updateDateRange: (dateRange: DateRange) => void;
    updateAssetHistoricalData: (assetId: string, historicalData: Asset['historicalData'], longName?: string) => void;
    updateInvestment: (assetId: string, investmentId: string, investment: Investment) => void;
    clearInvestments: () => void;
    setAssets: (assets: Asset[]) => void;
}

export const PortfolioContext = createContext<PortfolioContextType | null>(null);

// Provider Component
export const PortfolioProvider = ({ children }: { children: React.ReactNode }) => {
    const [state, dispatch] = useReducer(portfolioReducer, initialState);

    // Memoized actions
    const actions = useMemo(() => ({
        setLoading: (loading: boolean) => dispatch({ type: 'SET_LOADING', payload: loading }),
        addAsset: (asset: Asset) => dispatch({ type: 'ADD_ASSET', payload: asset }),
        removeAsset: (assetId: string) => dispatch({ type: 'REMOVE_ASSET', payload: assetId }),
        clearAssets: () => dispatch({ type: 'CLEAR_ASSETS' }),
        addInvestment: (assetId: string, investment: Investment | Investment[]) =>
            dispatch({ type: 'ADD_INVESTMENT', payload: { assetId, investment } }),
        removeInvestment: (assetId: string, investmentId: string) =>
            dispatch({ type: 'REMOVE_INVESTMENT', payload: { assetId, investmentId } }),
        updateDateRange: (dateRange: DateRange) =>
            dispatch({ type: 'UPDATE_DATE_RANGE', payload: dateRange }),
        updateAssetHistoricalData: (assetId: string, historicalData: Asset['historicalData'], longName?: string) =>
            dispatch({ type: 'UPDATE_ASSET_HISTORICAL_DATA', payload: { assetId, historicalData, longName } }),
        updateInvestment: (assetId: string, investmentId: string, investment: Investment) =>
            dispatch({ type: 'UPDATE_INVESTMENT', payload: { assetId, investmentId, investment } }),
        clearInvestments: () => dispatch({ type: 'CLEAR_INVESTMENTS' }),
        setAssets: (assets: Asset[]) => dispatch({ type: 'SET_ASSETS', payload: assets }),
    }), []);

    const value = useMemo(() => ({ ...state, ...actions }), [state, actions]);

    return (
        <PortfolioContext.Provider value={value}>
            {children}
        </PortfolioContext.Provider>
    );
};
