import { addDays, isBefore } from "date-fns";

import { formatDateToISO } from "../formatters";

import type { Asset, InvestmentPerformance, PortfolioPerformance } from "../../types";
export const calculateInvestmentPerformance = (assets: Asset[]): PortfolioPerformance => {
    const investments: InvestmentPerformance[] = [];
    let totalInvested = 0;
    let totalCurrentValue = 0;
    let earliestDate: Date | null = null;

    // TTWOR Berechnung
    const firstDayPrices: Record<string, number> = {};
    const currentPrices: Record<string, number> = {};
    const investedPerAsset: Record<string, number> = {};

    // Sammle erste und letzte Preise für jedes Asset
    for (const asset of assets) {
        const keys = Array.from(asset.historicalData.values());
        const firstDay = keys[0];
        const lastDay = keys[keys.length - 1];
        firstDayPrices[asset.id] = firstDay;
        currentPrices[asset.id] = lastDay;
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

    // Calculate portfolio-level annual performances
    const annualPerformances: { year: number; percentage: number }[] = [];
    const annualPerformancesPerAsset = new Map<string, { year: number; percentage: number; price: number }[]>();

    // Finde das früheste Investmentdatum
    for (const asset of assets) {
        for (const investment of asset.investments) {
            const investmentDate = new Date(investment.date!);
            if (!earliestDate || isBefore(investmentDate, earliestDate)) {
                earliestDate = investmentDate;
            }
        }
        const historicalData = Array.from(asset.historicalData.entries());
        const firstDate = new Date(historicalData[0][0]);
        const temp_assetAnnualPerformances: { year: number; percentage: number; price: number }[] = [];
        for (let year = firstDate.getFullYear(); year <= new Date().getFullYear(); year++) {
            const yearStart = new Date(year, 0, 1);
            const yearEnd = new Date(year, 11, 31);
            let startDate = yearStart;
            let endDate = yearEnd;
            let startPrice = asset.historicalData.get(formatDateToISO(startDate));
            let endPrice = asset.historicalData.get(formatDateToISO(endDate));
            while(!startPrice || !endPrice) {
                startDate = addDays(startDate, 1);
                endDate = addDays(endDate, -1);
                endPrice = endPrice || asset.historicalData.get(formatDateToISO(endDate)) || 0;
                startPrice = startPrice || asset.historicalData.get(formatDateToISO(startDate)) || 0;
                if(endDate.getTime() < yearStart.getTime() || startDate.getTime() > yearEnd.getTime()) {
                    break;
                }
            }
            if (startPrice && endPrice) {
                const percentage = ((endPrice - startPrice) / startPrice) * 100;
                temp_assetAnnualPerformances.push({
                    year,
                    percentage,
                    price: (endPrice + startPrice) / 2
                });
            }
        }
        annualPerformancesPerAsset.set(asset.id, temp_assetAnnualPerformances);
    }


    // Calculate portfolio performance for each year
    const now = new Date();
    const startYear = earliestDate ? earliestDate.getFullYear() : now.getFullYear();
    const endYear = now.getFullYear();

    for (let year = startYear; year <= endYear; year++) {
        const yearStart = new Date(year, 0, 1); // 1. Januar
        const yearEnd = year === endYear ? new Date(year, now.getMonth(), now.getDate()) : new Date(year, 11, 31); // Aktuelles Datum oder 31. Dez.

        const yearInvestments: { percent: number; weight: number }[] = [];

        for (const asset of assets) {
            // Get prices for the start and end of the year
            let startPrice = 0;
            let endPrice = 0;
            let startDate = yearStart;
            let endDate = yearEnd;
            while(!startPrice || !endPrice) {
                startDate = addDays(startDate, 1);
                endDate = addDays(endDate, -1);
                endPrice = endPrice || asset.historicalData.get(formatDateToISO(endDate)) || 0;
                startPrice = startPrice || asset.historicalData.get(formatDateToISO(startDate)) || 0;
                if(endDate.getTime() < yearStart.getTime() || startDate.getTime() > yearEnd.getTime()) {
                    break;
                }
            }

            if (startPrice === 0 || endPrice === 0) {
                console.warn(`Skipping asset for year ${year} due to missing start or end price`);
                continue;
            }


            // Get all investments made before or during this year
            const relevantInvestments = asset.investments.filter(inv =>
                new Date(inv.date!) <= yearEnd && new Date(inv.date!) >= yearStart
            );

            for (const investment of relevantInvestments) {
                const invDate = new Date(investment.date!);

                let buyInPrice = asset.historicalData.get(formatDateToISO(invDate)) || 0;

                // try to find the next closest price prior previousdates
                if(!buyInPrice) {
                    let previousDate = invDate;
                    let afterDate = invDate;
                    while(!buyInPrice) {
                        previousDate = addDays(previousDate, -1);
                        afterDate = addDays(afterDate, 1);
                        buyInPrice = asset.historicalData.get(formatDateToISO(previousDate)) || asset.historicalData.get(formatDateToISO(afterDate)) || 0;
                    }
                }

                if (buyInPrice > 0) {
                    const shares = investment.amount / buyInPrice;
                    const endValue = shares * endPrice;
                    const startValue = shares * startPrice;
                    yearInvestments.push({
                        percent: ((endValue - startValue) / startValue) * 100,
                        weight: startValue
                    });
                }
            }
        }


        // Calculate weighted average performance for the year
        if (yearInvestments.length > 0) {
            const totalWeight = yearInvestments.reduce((sum, inv) => sum + inv.weight, 0);
            const percentage = yearInvestments.reduce((sum, inv) =>
                sum + (inv.percent * (inv.weight / totalWeight)), 0);

            if (!isNaN(percentage)) {
                annualPerformances.push({ year, percentage });
            } else {
                console.warn(`Invalid percentage calculated for year ${year}`);
            }
        } else {
            console.warn(`Skipping year ${year} due to zero portfolio values`);
        }
    }

    // Get best and worst years for the entire portfolio
    const bestPerformancePerAnno = annualPerformances.length > 0
        ? Array.from(annualPerformances).sort((a, b) => b.percentage - a.percentage)
        : [];

    const worstPerformancePerAnno = Array.from(bestPerformancePerAnno).reverse()

    // Normale Performance-Berechnungen...
    for (const asset of assets) {
        const historicalVals = Array.from(asset.historicalData.values());
        const currentPrice = historicalVals[historicalVals.length - 1] || 0;

        for (const investment of asset.investments) {
            const invDate = new Date(investment.date!);
            let buyInPrice = asset.historicalData.get(formatDateToISO(invDate)) || 0;
            if(!buyInPrice) {
                let previousDate = invDate;
                let afterDate = invDate;
                while(!buyInPrice) {
                    previousDate = addDays(previousDate, -1);
                    afterDate = addDays(afterDate, 1);
                    buyInPrice = asset.historicalData.get(formatDateToISO(previousDate)) || asset.historicalData.get(formatDateToISO(afterDate)) || 0;
                }
            }

            const shares = buyInPrice > 0 ? investment.amount / buyInPrice : 0;
            const currentValue = shares * currentPrice;

            investments.push({
                id: investment.id,
                assetName: asset.name,
                date: investment.date!,
                investedAmount: investment.amount,
                investedAtPrice: buyInPrice,
                periodicGroupId: investment.periodicGroupId,
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


    const performancePerAnnoPerformance = annualPerformances.reduce((acc, curr) => acc + curr.percentage, 0) / annualPerformances.length;

    return {
        investments,
        summary: {
            totalInvested,
            currentValue: totalCurrentValue,
            annualPerformancesPerAsset,
            performancePercentage: totalInvested > 0
                ? ((totalCurrentValue - totalInvested) / totalInvested) * 100
                : 0,
            performancePerAnnoPerformance,
            ttworValue,
            ttworPercentage,
            worstPerformancePerAnno: worstPerformancePerAnno,
            bestPerformancePerAnno: bestPerformancePerAnno,
            annualPerformances: annualPerformances
        },
    };
};
