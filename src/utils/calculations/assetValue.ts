import { addDays, isAfter, isBefore, isSameDay } from "date-fns";

import { Asset, Investment } from "../../types";

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

export const calculateAssetValueAtDate = (asset: Asset, date: Date, currentPrice: number) => {
    let totalShares = 0;

    const buyIns:number[] = [];
    // Calculate shares for each investment up to the given date
    for(const investment of asset.investments) {
        const invDate = new Date(investment.date!);
        if (isAfter(invDate, date) || isSameDay(invDate, date)) continue;

        // Find price at investment date
        const investmentPrice = asset.historicalData.find(
            (data) => data.date === investment.date
        )?.price || 0;

        // if no investment price found, use the previous price
        const previousInvestmentPrice = investmentPrice || asset.historicalData
            .filter(({ date }) => isAfter(new Date(date), invDate) || isSameDay(new Date(date), invDate))
            .find(({ price }) => price !== 0)?.price || 0;

        const investmentPriceToUse = investmentPrice || previousInvestmentPrice || asset.historicalData
            .filter(({ date }) => isBefore(new Date(date), invDate) || isSameDay(new Date(date), invDate))
            .reverse()
            .find(({ price }) => price !== 0)?.price || 0;

        if (investmentPriceToUse > 0) {
            totalShares += investment.amount / investmentPriceToUse;
            buyIns.push(investmentPriceToUse);
        }
    }

    // Return current value of all shares
    return {
        investedValue: totalShares * currentPrice,
        avgBuyIn: buyIns.reduce((a, b) => a + b, 0) / buyIns.length,
    }
};

export const generatePeriodicInvestments = (settings: PeriodicSettings, endDate: Date, assetId: string): Investment[] => {
    const investments: Investment[] = [];
    let currentDate = new Date(settings.startDate);
    let currentAmount = settings.amount;
    const periodicGroupId = crypto.randomUUID();

    while (isBefore(currentDate, endDate)) {
        if (currentDate.getDate() === settings.dayOfMonth) {
            // Handle dynamic increases if configured
            if (settings.dynamic) {
                const yearsSinceStart =
                    (currentDate.getTime() - new Date(settings.startDate).getTime()) /
                    (1000 * 60 * 60 * 24 * 365);

                if (yearsSinceStart >= settings.dynamic.yearInterval) {
                    if (settings.dynamic.type === 'percentage') {
                        currentAmount *= (1 + settings.dynamic.value / 100);
                    } else {
                        currentAmount += settings.dynamic.value;
                    }
                }
            }
            // Create investment for this date
            investments.push({
                id: crypto.randomUUID(),
                type: 'periodic',
                amount: currentAmount,
                date: currentDate.toISOString().split('T')[0],
                periodicGroupId,
                assetId
            });

            // Move to next interval
            currentDate = addDays(currentDate, settings.interval);
        } else {
            // Move to next day if not the investment day
            currentDate = addDays(currentDate, 1);
        }
    }

    return investments;
};
