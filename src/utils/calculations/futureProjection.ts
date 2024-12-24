import { addMonths, differenceInYears } from "date-fns";

import type {
    ProjectionData, SustainabilityAnalysis, WithdrawalPlan, Asset, Investment
} from "../../types";

const findOptimalStartingPoint = (
    currentPortfolioValue: number,
    monthlyGrowth: number,
    desiredWithdrawal: number,
    strategy: WithdrawalPlan['autoStrategy'],
    interval: 'monthly' | 'yearly'
): { startDate: Date; requiredPortfolioValue: number } => {
    const monthlyWithdrawal = interval === 'yearly' ? desiredWithdrawal / 12 : desiredWithdrawal;
    let requiredPortfolioValue = 0;

    // Declare variables outside switch
    const months = (strategy?.targetYears || 30) * 12;
    const r = monthlyGrowth;
    const targetGrowth = (strategy?.targetGrowth || 2) / 100;
    const targetMonthlyGrowth = Math.pow(1 + targetGrowth, 1 / 12) - 1;

    switch (strategy?.type) {
        case 'maintain':
            requiredPortfolioValue = monthlyWithdrawal / monthlyGrowth;
            break;
        case 'deplete':
            requiredPortfolioValue = (monthlyWithdrawal * (Math.pow(1 + r, months) - 1)) / (r * Math.pow(1 + r, months));
            break;
        case 'grow':
            requiredPortfolioValue = monthlyWithdrawal / (monthlyGrowth - targetMonthlyGrowth);
            break;
    }

    // Calculate when we'll reach the required value
    const monthsToReach = Math.ceil(
        Math.log(requiredPortfolioValue / currentPortfolioValue) /
        Math.log(1 + monthlyGrowth)
    );

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() + Math.max(0, monthsToReach));

    return {
        startDate,
        requiredPortfolioValue,
    };
};

export const calculateFutureProjection = async (
    currentAssets: Asset[],
    yearsToProject: number,
    annualReturnRate: number,
    withdrawalPlan?: WithdrawalPlan,
): Promise<{
    projection: ProjectionData[];
    sustainability: SustainabilityAnalysis;
}> => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const projectionData: ProjectionData[] = [];
    const maxProjectionYears = 100; // Project up to 100 years to find true sustainability
    const endDateForDisplay = addMonths(new Date(), yearsToProject * 12);
    const endDateForCalculation = addMonths(new Date(), maxProjectionYears * 12);

    // Get all periodic investment patterns
    const periodicInvestments = currentAssets.flatMap(asset => {
        const patterns = new Map<string, Investment[]>();

        asset.investments.forEach(inv => {
            if (inv.type === 'periodic' && inv.periodicGroupId) {
                if (!patterns.has(inv.periodicGroupId)) {
                    patterns.set(inv.periodicGroupId, []);
                }
                patterns.get(inv.periodicGroupId)!.push(inv);
            }
        });

        return Array.from(patterns.values())
            .map(group => ({
                pattern: group.sort((a, b) =>
                    new Date(a.date!).getTime() - new Date(b.date!).getTime()
                )
            }));
    });

    // Project future investments
    const futureInvestments = periodicInvestments.flatMap(({ pattern }) => {
        if (pattern.length < 2) return [];

        const lastInvestment = pattern[pattern.length - 1];
        const secondLastInvestment = pattern[pattern.length - 2];

        const interval = new Date(lastInvestment.date!).getTime() -
            new Date(secondLastInvestment.date!).getTime();
        const amountDiff = lastInvestment.amount - secondLastInvestment.amount;

        const future: Investment[] = [];
        let currentDate = new Date(lastInvestment.date!);
        let currentAmount = lastInvestment.amount;

        while (currentDate <= endDateForCalculation) {
            currentDate = new Date(currentDate.getTime() + interval);
            currentAmount += amountDiff;

            future.push({
                ...lastInvestment,
                date: currentDate,
                amount: currentAmount,
            });
        }

        return future;
    });

    // Calculate monthly values
    let currentDate = new Date();
    let totalInvested = currentAssets.reduce(
        (sum, asset) => sum + asset.investments.reduce(
            (assetSum, inv) => assetSum + inv.amount, 0
        ), 0
    );

    let totalWithdrawn = 0;
    let yearsToReachTarget = 0;
    let targetValue = 0;
    let sustainableYears: number | 'infinite' = 'infinite';
    let portfolioValue = totalInvested; // Initialize portfolio value with current investments
    let withdrawalsStarted = false;
    let withdrawalStartDate: Date | null = null;
    let portfolioDepletionDate: Date | null = null;

    // Calculate optimal withdrawal plan if auto strategy is selected
    if (withdrawalPlan?.enabled && withdrawalPlan.startTrigger === 'auto') {
        const { startDate, requiredPortfolioValue } = findOptimalStartingPoint(
            portfolioValue,
            Math.pow(1 + annualReturnRate / 100, 1 / 12) - 1,
            withdrawalPlan.amount,
            withdrawalPlan.autoStrategy,
            withdrawalPlan.interval
        );

        withdrawalPlan.startDate = startDate;
        withdrawalPlan.startPortfolioValue = requiredPortfolioValue;
    }

    while (currentDate <= endDateForCalculation) {
        // Check if withdrawals should start
        if (!withdrawalsStarted && withdrawalPlan?.enabled) {
            withdrawalsStarted = withdrawalPlan.startTrigger === 'date'
                ? new Date(currentDate) >= new Date(withdrawalPlan.startDate!)
                : portfolioValue >= (withdrawalPlan.startPortfolioValue || 0);

            if (withdrawalsStarted) {
                withdrawalStartDate = new Date(currentDate);
            }
        }

        // Handle monthly growth if portfolio isn't depleted
        if (portfolioValue > 0) {
            const monthlyReturn = Math.pow(1 + annualReturnRate / 100, 1 / 12) - 1;
            portfolioValue *= (1 + monthlyReturn);
        }

        // Add new investments only if withdrawals haven't started
        if (!withdrawalsStarted) {
            const monthInvestments = futureInvestments.filter(
                inv => new Date(inv.date!).getMonth() === currentDate.getMonth() &&
                    new Date(inv.date!).getFullYear() === currentDate.getFullYear()
            );

            const monthlyInvestment = monthInvestments.reduce(
                (sum, inv) => sum + inv.amount, 0
            );
            totalInvested += monthlyInvestment;
            portfolioValue += monthlyInvestment;
        }


        // Handle withdrawals
        let monthlyWithdrawal = 0;
        if (withdrawalsStarted && portfolioValue > 0) {
            monthlyWithdrawal = withdrawalPlan!.interval === 'monthly'
                ? withdrawalPlan!.amount
                : (currentDate.getMonth() === 0 ? withdrawalPlan!.amount : 0);

            portfolioValue -= monthlyWithdrawal;
            if (portfolioValue < 0) {
                monthlyWithdrawal += portfolioValue; // Adjust final withdrawal
                portfolioValue = 0;
                if (sustainableYears === 'infinite') {
                    sustainableYears = differenceInYears(currentDate, withdrawalStartDate!);
                }
            }
            totalWithdrawn += monthlyWithdrawal;
        }

        // Update target metrics
        if (withdrawalsStarted && !targetValue) {
            targetValue = portfolioValue;
            yearsToReachTarget = differenceInYears(currentDate, new Date());
        }

        if (portfolioValue <= 0 && !portfolioDepletionDate) {
            portfolioDepletionDate = new Date(currentDate);
        }

        // Only add to projection data if within display timeframe
        if (currentDate <= endDateForDisplay) {
            projectionData.push({
                date: currentDate,
                value: Math.max(0, portfolioValue),
                invested: totalInvested,
                withdrawals: monthlyWithdrawal,
                totalWithdrawn,
            });
        }

        currentDate = addMonths(currentDate, 1);
    }

    // Calculate actual sustainability duration
    let actualSustainableYears: number | 'infinite' = 'infinite';
    if (portfolioDepletionDate) {
        actualSustainableYears = differenceInYears(
            portfolioDepletionDate,
            withdrawalStartDate || new Date()
        );
    } else if (portfolioValue > 0) {
        // If portfolio is still growing after maxProjectionYears, it's truly sustainable
        actualSustainableYears = 'infinite';
    }

    return {
        projection: projectionData,
        sustainability: {
            yearsToReachTarget,
            targetValue,
            sustainableYears: actualSustainableYears,
        },
    };
};
