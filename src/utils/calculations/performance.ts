import { isAfter, isBefore } from "date-fns";

import { Asset } from "../../types";

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
        ttworValue: number;
        ttworPercentage: number;
    };
}

export const calculateInvestmentPerformance = (assets: Asset[]): PortfolioPerformance => {
    const investments: InvestmentPerformance[] = [];
    let totalInvested = 0;
    let totalCurrentValue = 0;

    // TTWOR Berechnung
    const firstDayPrices: Record<string, number> = {};
    const currentPrices: Record<string, number> = {};
    const investedPerAsset: Record<string, number> = {};

    // Sammle erste und letzte Preise für jedes Asset
    for(const asset of assets) {
        firstDayPrices[asset.id] = asset.historicalData[0]?.price || 0;
        currentPrices[asset.id] = asset.historicalData[asset.historicalData.length - 1]?.price || 0;
        investedPerAsset[asset.id] = asset.investments.reduce((sum, inv) => sum + inv.amount, 0);
    }

    // Berechne TTWOR
    const ttworValue = Object.entries(investedPerAsset).reduce((acc, [assetId, invested]) => {
        if (firstDayPrices[assetId] && currentPrices[assetId] && firstDayPrices[assetId] > 0) {
            const shares = invested / firstDayPrices[assetId];
            return acc + (shares * currentPrices[assetId]);
        }
        return acc;
    }, 0);

    // Normale Performance-Berechnungen...
    for(const asset of assets) {
        const currentPrice = asset.historicalData[asset.historicalData.length - 1]?.price || 0;

        for(const investment of asset.investments) {
            const investmentPrice = asset.historicalData.find(
                (data) => data.date === investment.date
            )?.price || 0;

            const previousPrice = investmentPrice || asset.historicalData.filter(
                (data) => isBefore(new Date(data.date), new Date(investment.date!))
            ).reverse().find((v) => v.price !== 0)?.price || 0;

            const buyInPrice = investmentPrice || previousPrice || asset.historicalData.filter(
                (data) => isAfter(new Date(data.date), new Date(investment.date!))
            ).find((v) => v.price !== 0)?.price || 0;

            const shares = buyInPrice > 0 ? investment.amount / buyInPrice : 0;
            const currentValue = shares * currentPrice;

            investments.push({
                id: investment.id,
                assetName: asset.name,
                date: investment.date!,
                investedAmount: investment.amount,
                investedAtPrice: buyInPrice,
                currentValue,
                performancePercentage: investment.amount > 0
                    ? (((currentValue - investment.amount) / investment.amount)) * 100
                    : 0,
            });

            totalInvested += investment.amount;
            totalCurrentValue += currentValue;
        }
    }

    const ttworPercentage = totalInvested > 0
        ? ((ttworValue - totalInvested) / totalInvested) * 100
        : 0;

    return {
        investments,
        summary: {
            totalInvested,
            currentValue: totalCurrentValue,
            performancePercentage: totalInvested > 0
                ? ((totalCurrentValue - totalInvested) / totalInvested) * 100
                : 0,
            ttworValue,
            ttworPercentage,
        },
    };
};
