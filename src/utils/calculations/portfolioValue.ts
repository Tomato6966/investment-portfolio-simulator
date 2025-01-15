import { addDays, isAfter, isBefore, isSameDay } from "date-fns";

import { formatDateToISO } from "../formatters";
import { calculateAssetValueAtDate } from "./assetValue";

import type { Asset, DateRange, DayData } from "../../types";
interface WeightedPercent {
    percent: number;
    weight: number;
}


export const calculatePortfolioValue = (assets: Asset[], dateRange: DateRange) => {
    const { startDate, endDate } = dateRange;
    const data: DayData[] = [];

    let currentDate = startDate;
    const end = endDate;

    const beforeValue: { [assetId: string]: number } = {};

    while (isBefore(currentDate, end)) {
        const dayData: DayData = {
            date: currentDate,
            total: 0,
            invested: 0,
            percentageChange: 0,
            assets: {},
        };

        const weightedPercents: WeightedPercent[] = [];

        for (const asset of assets) {
            // calculate the invested kapital
            for (const investment of asset.investments) {
                const invDate = new Date(investment.date!);
                if (!isAfter(invDate, currentDate) && !isSameDay(invDate, currentDate)) dayData.invested += investment.amount;
            }

            const currentValueOfAsset = asset.historicalData.get(formatDateToISO(dayData.date)) || beforeValue[asset.id];
            beforeValue[asset.id] = currentValueOfAsset;

            if (currentValueOfAsset !== undefined) {
                const { investedValue, avgBuyIn } = calculateAssetValueAtDate(
                    asset,
                    currentDate,
                    currentValueOfAsset
                );

                dayData.total += investedValue || 0;
                dayData.assets[asset.id] = currentValueOfAsset;

                let performancePercentage = 0;
                if (investedValue > 0) {
                    performancePercentage = ((currentValueOfAsset - avgBuyIn) / avgBuyIn) * 100;
                }

                weightedPercents.push({
                    percent: performancePercentage,
                    weight: investedValue
                });
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

        const totalInvested = dayData.invested; // Total invested amount for the day
        const totalCurrentValue = dayData.total; // Total current value for the day

        if (totalInvested > 0 && totalCurrentValue > 0) {
            dayData.percentageChange = ((totalCurrentValue - totalInvested) / totalInvested) * 100;
        } else {
            dayData.percentageChange = 0;
        }


        currentDate = addDays(currentDate, 1);
        data.push(dayData);
    }

    // Filter out days with incomplete asset data
    return data.filter(
        (dayData) => {
            const vals = Object.values(dayData.assets);
            if (!vals.length) return false;
            return !vals.some((value) => value === 0);
        }
    );
};
