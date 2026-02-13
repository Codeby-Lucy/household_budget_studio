// src/lib/budget/types.ts

export type HouseholdType = "individual" | "couple" | "student";
export type SavingsMode = "fixed" | "percent";
export type CoupleSplitRule = "equal" | "proportional";

export type Money = number; // store as number (SEK). Later you can switch to integer öre.

export interface Bill {
    id: string;
    name: string;
    amount: Money;
}

export interface Category {
    id: string;
    name: string;
    amount: Money; // monthly budget for this category
}

export interface SavingsRule {
    mode: SavingsMode;
    value: number; // if fixed: SEK, if percent: 0–100
}

export interface CoupleSettings {
    splitRule: CoupleSplitRule;
    // future: custom splitting per-bill, per-category, etc.
}

export interface BudgetInput {
    householdType: HouseholdType;

    // incomes
    incomeA: Money; // main person
    incomeB?: Money; // partner (only for couple)

    // lists
    bills: Bill[];
    categories: Category[];

    // savings
    savings: SavingsRule;

    // settings
    couple?: CoupleSettings;
}

export interface CategoryResult {
    id: string;
    name: string;
    amount: Money;
}

export interface CoupleContribution {
    person: "A" | "B";
    income: Money;
    incomeShare: number; // 0..1
    fairBillContribution: Money; // what they "should" pay (fair split)
}

export interface BudgetResult {
    totalIncome: Money;
    totalBills: Money;
    savingsAmount: Money;

    totalCategoryBudgets: Money;
    remainingAfterBillsAndSavings: Money; // money available for categories + extra

    unallocated: Money; // remaining - categoryBudgets (positive = spare, negative = overbudget)

    safeToSpendPerWeek: Money; // simple: (remainingAfterBillsAndSavings - bufferCategory)/4.33

    categoryResults: CategoryResult[];

    couple?: {
        totalIncomeA: Money;
        totalIncomeB: Money;
        splitRule: CoupleSplitRule;
        contributions: CoupleContribution[];
    };

    warnings: string[];
}
