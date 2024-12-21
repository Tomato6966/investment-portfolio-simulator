import { addDays, isAfter, isBefore } from "date-fns";

import { Asset, DateRange } from "../../types";
import { calculateAssetValueAtDate } from "./assetValue";

type DayData = {
    date: string;
    total: number;
    invested: number;
    percentageChange: number;
    /* Current price of asset */
    assets: { [key: string]: number };
};
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
        // this should contain the percentage gain of all investments till now
        const pPercents: number[] = [];

        for(const asset of assets) {
            // calculate the invested kapital
            for(const investment of asset.investments) {
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
                if(!Number.isNaN(percent)) pPercents.push(percent);
            }
        }


        // Calculate average percentage change if percentages array is not empty
        if (pPercents.length > 0) {
            dayData.percentageChange = pPercents.reduce((a, b) => a + b, 0) / pPercents.length;
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
