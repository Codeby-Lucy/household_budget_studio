// src/lib/budget/calc.ts

import { BudgetInput, BudgetResult, Money } from "./types";

// Budget calculation engine (pure functions).
// can be reused across web + mobile.
const clamp = (x: number, min: number, max: number) => Math.min(max, Math.max(min, x));
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);

// Savings can be fixed (SEK) or percent of total income.
function computeSavings(totalIncome: Money, mode: "fixed" | "percent", value: number): Money {
    if (mode === "fixed") return Math.max(0, value);
    const pct = clamp(value, 0, 100);
    return round2((totalIncome * pct) / 100);
}

function findBufferAmount(input: BudgetInput): Money {
    const buffer = input.categories.find(c => c.name.toLowerCase() === "buffer");
    return buffer?.amount ?? 0;
}

export function calculateBudget(input: BudgetInput): BudgetResult {
    const warnings: string[] = [];

    // Normalized incomes to avoid negative values affecting totals.
    const incomeA = Math.max(0, input.incomeA || 0);
    const incomeB = Math.max(0, input.incomeB || 0);
    const totalIncome = incomeA + (input.householdType === "couple" ? incomeB : 0);

    const totalBills = sum(input.bills.map(b => Math.max(0, b.amount || 0)));
    const savingsAmount = computeSavings(totalIncome, input.savings.mode, input.savings.value);

    const remainingAfterBillsAndSavings = round2(totalIncome - totalBills - savingsAmount);

    const totalCategoryBudgets = sum(input.categories.map(c => Math.max(0, c.amount || 0)));
    const unallocated = round2(remainingAfterBillsAndSavings - totalCategoryBudgets);

    // Weekly safe-to-spend: monthly remaining minus buffer, spread across ~4.33 weeks/month.
    const bufferAmount = findBufferAmount(input);
    const safeToSpendPerWeek = round2((remainingAfterBillsAndSavings - bufferAmount) / 4.33);

    // Warnings for edge cases
    if (totalIncome <= 0) warnings.push("Income is 0. Add income to calculate a plan.");
    if (totalBills > totalIncome) warnings.push("Bills exceed income. You’re in a deficit before savings/categories.");
    if (remainingAfterBillsAndSavings < 0) warnings.push("After bills and savings, you have negative remaining.");
    if (unallocated < 0) warnings.push("Your category budgets exceed what’s available after bills and savings.");

    // Couple contributions (fair split of bills only, v1)
    let couple: BudgetResult["couple"] = undefined;
    if (input.householdType === "couple") {
        const splitRule = input.couple?.splitRule ?? "proportional";

        if (incomeA === 0 && incomeB === 0) {
            warnings.push("Both incomes are 0 for couple mode.");
        }

        if (splitRule === "equal") {
            couple = {
                totalIncomeA: incomeA,
                totalIncomeB: incomeB,
                splitRule,
                contributions: [
                    {
                        person: "A",
                        income: incomeA,
                        incomeShare: 0.5,
                        fairBillContribution: round2(totalBills / 2),
                    },
                    {
                        person: "B",
                        income: incomeB,
                        incomeShare: 0.5,
                        fairBillContribution: round2(totalBills / 2),
                    },
                ],
            };
        } else {
            // proportional
            const denom = incomeA + incomeB;
            const shareA = denom > 0 ? incomeA / denom : 0.5;
            const shareB = denom > 0 ? incomeB / denom : 0.5;

            couple = {
                totalIncomeA: incomeA,
                totalIncomeB: incomeB,
                splitRule,
                contributions: [
                    {
                        person: "A",
                        income: incomeA,
                        incomeShare: round2(shareA),
                        fairBillContribution: round2(totalBills * shareA),
                    },
                    {
                        person: "B",
                        income: incomeB,
                        incomeShare: round2(shareB),
                        fairBillContribution: round2(totalBills * shareB),
                    },
                ],
            };
        }
    }

    return {
        totalIncome: round2(totalIncome),
        totalBills: round2(totalBills),
        savingsAmount: round2(savingsAmount),

        totalCategoryBudgets: round2(totalCategoryBudgets),
        remainingAfterBillsAndSavings: round2(remainingAfterBillsAndSavings),
        unallocated: round2(unallocated),

        safeToSpendPerWeek: round2(safeToSpendPerWeek),

        categoryResults: input.categories.map(c => ({
            id: c.id,
            name: c.name,
            amount: round2(Math.max(0, c.amount || 0)),
        })),

        couple,
        warnings,
    };
}
