import { useContext, useMemo } from "react";

import { PortfolioContext, PortfolioContextType } from "../providers/PortfolioProvider";

// main way of how to access the context
const usePortfolio = () => {
    const context = useContext(PortfolioContext);
    if (!context) {
        throw new Error('usePortfolio must be used within a PortfolioProvider');
    }
    return context;
};

// performance optimized way of accessing the context
export const usePortfolioSelector = <T,>(selector: (state: PortfolioContextType) => T): T => {
    const context = usePortfolio();
    return useMemo(() => selector(context), [selector, context]);
};
