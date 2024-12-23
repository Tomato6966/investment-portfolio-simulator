import { addDays, isAfter, isBefore } from "date-fns";

import { calculateAssetValueAtDate } from "./assetValue";

import type { Asset, DateRange, DayData } from "../../types";

export const calculatePortfolioValue = (assets: Asset[], dateRange: DateRange) => {
    const { startDate, endDate } = dateRange;
    const data: DayData[] = [];

    let currentDate = new Date(startDate);
    const end = new Date(endDate);

    const beforeValue: { [assetId: string]: number } = {};

    while (isBefore(currentDate, end)) {
        const dayData: DayData = {
            date: currentDate.toISOString().split('T')[0],
            total: 0,
            invested: 0,
            percentageChange: 0,
            assets: {},
        };

        interface WeightedPercent {
            percent: number;
            weight: number;
        }
        const weightedPercents: WeightedPercent[] = [];

        for (const asset of assets) {
            // calculate the invested kapital
            for (const investment of asset.investments) {
                if (!isAfter(new Date(investment.date!), currentDate)) {
                    dayData.invested += investment.amount;
                }
            }

            // Get historical price for the asset
            const currentValueOfAsset = asset.historicalData.find(
                (data) => data.date === dayData.date
            )?.price || beforeValue[asset.id];
            beforeValue[asset.id] = currentValueOfAsset;

            if (currentValueOfAsset !== undefined) {
                const { investedValue, avgBuyIn } = calculateAssetValueAtDate(
                    asset,
                    currentDate,
                    currentValueOfAsset
                );

                dayData.total += investedValue || 0;
                dayData.assets[asset.id] = currentValueOfAsset;

                const percent = ((currentValueOfAsset - avgBuyIn) / avgBuyIn) * 100;
                if (!Number.isNaN(percent) && investedValue && investedValue > 0) {
                    weightedPercents.push({
                        percent,
                        weight: investedValue
                    });
                }
            }
        }

        // Calculate weighted average percentage change
        if (weightedPercents.length > 0) {
            const totalWeight = weightedPercents.reduce((sum, wp) => sum + wp.weight, 0);
            dayData.percentageChange = weightedPercents.reduce((sum, wp) =>
                sum + (wp.percent * (wp.weight / totalWeight)), 0);
        } else {
            dayData.percentageChange = 0;
        }

        currentDate = addDays(currentDate, 1);
        data.push(dayData);
    }

    // Filter out days with incomplete asset data
    return data.filter(
        (dayData) => !Object.values(dayData.assets).some((value) => value === 0)
    );
};
