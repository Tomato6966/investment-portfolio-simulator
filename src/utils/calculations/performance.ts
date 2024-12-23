import { differenceInDays, isAfter, isBefore } from "date-fns";

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

    // Finde das früheste Investmentdatum
    for (const asset of assets) {
        for (const investment of asset.investments) {
            const investmentDate = new Date(investment.date!);
            if (!earliestDate || isBefore(investmentDate, earliestDate)) {
                earliestDate = investmentDate;
            }
        }
    }

    // Calculate portfolio-level annual performances
    const annualPerformances: { year: number; percentage: number }[] = [];

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
            const startPrice = asset.historicalData.filter(d =>
                new Date(d.date).getFullYear() === year &&
                new Date(d.date).getMonth() === 0
            ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).find(d => d.price !== 0)?.price || 0;

            const endPrice = asset.historicalData.filter(d =>
                new Date(d.date).getFullYear() === year
            ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).find(d => d.price !== 0)?.price || 0;

            if (startPrice === 0 || endPrice === 0) {
                console.warn(`Skipping asset for year ${year} due to missing start or end price`);
                continue;
            }

            // Get all investments made before or during this year
            const relevantInvestments = asset.investments.filter(inv =>
                new Date(inv.date!) <= yearEnd && new Date(inv.date!) >= yearStart
            );

            for (const investment of relevantInvestments) {
                const investmentPrice = asset.historicalData.find(
                    (data) => data.date === investment.date
                )?.price || 0;

                const previousPrice = investmentPrice || asset.historicalData.filter(
                    (data) => isBefore(new Date(data.date), new Date(investment.date!))
                ).reverse().find((v) => v.price !== 0)?.price || 0;

                const buyInPrice = investmentPrice || previousPrice || asset.historicalData.filter(
                    (data) => isAfter(new Date(data.date), new Date(investment.date!))
                ).find((v) => v.price !== 0)?.price || 0;

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
        const currentPrice = asset.historicalData[asset.historicalData.length - 1]?.price || 0;

        for (const investment of asset.investments) {
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

    // Berechne die jährliche Performance
    const performancePerAnnoPerformance = (() => {
        if (!earliestDate || totalInvested === 0) return 0;

        const years = differenceInDays(new Date(), earliestDate) / 365;
        if (years < 0.01) return 0; // Verhindere Division durch sehr kleine Zahlen

        // Formel: (1 + r)^n = FV/PV
        // r = (FV/PV)^(1/n) - 1
        const totalReturn = totalCurrentValue / totalInvested;
        const annualizedReturn = Math.pow(totalReturn, 1 / years) - 1;

        return annualizedReturn * 100;
    })();

    return {
        investments,
        summary: {
            totalInvested,
            currentValue: totalCurrentValue,
            performancePercentage: totalInvested > 0
                ? ((totalCurrentValue - totalInvested) / totalInvested) * 100
                : 0,
            performancePerAnnoPerformance,
            ttworValue,
            ttworPercentage,
            worstPerformancePerAnno: worstPerformancePerAnno,
            bestPerformancePerAnno: bestPerformancePerAnno
        },
    };
};
