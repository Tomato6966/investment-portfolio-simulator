import { addDays, addMonths, addWeeks, addYears, isAfter, isSameDay, setDate } from "date-fns";

import { formatDateToISO } from "../formatters";

import type { Asset, Investment, PeriodicSettings } from "../../types";
export const calculateAssetValueAtDate = (asset: Asset, date: Date, currentPrice: number) => {
    let totalShares = 0;

    const buyIns: number[] = [];
    // Calculate shares for each investment up to the given date
    for (const investment of asset.investments) {
        const invDate = new Date(investment.date!);
        if (isAfter(invDate, date) || isSameDay(invDate, date)) continue;

        // Find price at investment date
        let investmentPrice = asset.historicalData.get(formatDateToISO(invDate)) || 0;
        // if no investment price found, try to find the nearest price
        if(!investmentPrice) {
            let previousDate = invDate;
            let afterDate = invDate;
            while(!investmentPrice) {
                previousDate = addDays(previousDate, -1);
                afterDate = addDays(afterDate, 1);
                investmentPrice = asset.historicalData.get(formatDateToISO(previousDate)) || asset.historicalData.get(formatDateToISO(afterDate)) || 0;
            }
        }

        if (investmentPrice > 0) {
            totalShares += investment.amount / investmentPrice;
            buyIns.push(investmentPrice);
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
    const periodicGroupId = crypto.randomUUID();

    // Create UTC dates
    let currentDate = new Date(Date.UTC(
        settings.startDate.getUTCFullYear(),
        settings.startDate.getUTCMonth(),
        settings.startDate.getUTCDate()
    ));

    const end = new Date(Date.UTC(
        endDate.getUTCFullYear(),
        endDate.getUTCMonth(),
        endDate.getUTCDate()
    ));

    let currentAmount = settings.amount;

    while (currentDate <= end) {
        // For monthly/yearly intervals, ensure we're on the correct day of month
        if (settings.intervalUnit !== 'days') {
            currentDate = setDate(currentDate, settings.dayOfMonth);
        }

        // Only add investment if we haven't passed the end date
        if (currentDate <= end) {
            // Handle dynamic increases if configured
            if (settings.dynamic) {
                const yearsSinceStart =
                    (currentDate.getTime() - settings.startDate.getTime()) /
                    (1000 * 60 * 60 * 24 * 365);

                if (yearsSinceStart > 0 && yearsSinceStart % settings.dynamic.yearInterval === 0) {
                    if (settings.dynamic.type === 'percentage') {
                        currentAmount *= (1 + (settings.dynamic.value / 100));
                    } else {
                        currentAmount += settings.dynamic.value;
                    }
                }
            }

            investments.push({
                id: crypto.randomUUID(),
                type: 'periodic',
                amount: currentAmount,
                date: currentDate,
                periodicGroupId,
                assetId
            });
        }

        // Calculate next date based on interval unit
        switch (settings.intervalUnit) {
            case 'days':
                currentDate = addDays(currentDate, settings.interval);
                break;
            case 'weeks':
                currentDate = addWeeks(currentDate, settings.interval);
                break;
            case 'months':
                currentDate = addMonths(currentDate, settings.interval);
                // Ensure we maintain the correct day of month using UTC
                if (currentDate.getUTCDate() !== settings.dayOfMonth) {
                    currentDate = setDate(currentDate, settings.dayOfMonth);
                }
                break;
            case 'quarters':
                currentDate = addMonths(currentDate, settings.interval * 3);
                break;
            case 'years':
                currentDate = addYears(currentDate, settings.interval);
                // Ensure we maintain the correct day of month using UTC
                if (currentDate.getUTCDate() !== settings.dayOfMonth) {
                    currentDate = setDate(currentDate, settings.dayOfMonth);
                }
                break;
        }
    }

    return investments;
};
