// src/lib/budget/templates.ts

import { BudgetInput } from "./types";

// Lightweight ID generator for template items.
const uid = () => Math.random().toString(36).slice(2, 10);

export type TemplateKey =
    | "individual"
    | "couple"
    | "student"
    | "aggressive"
    | "lowincome";

// Returns a fresh BudgetInput object for the selected template.
export function getTemplate(key: TemplateKey): BudgetInput {
    switch (key) {
        case "individual":
            return individualTemplate();
        case "couple":
            return coupleTemplate();
        case "student":
            return studentTemplate();
        case "aggressive":
            return aggressiveTemplate();
        case "lowincome":
            return lowIncomeTemplate();
        default: {
            // Compile-time safety: ensures all TemplateKey values are handled
            const _never: never = key;
            return _never;
        }
    }
}

// Default single-income template.
function individualTemplate(): BudgetInput {
    return {
        householdType: "individual",
        incomeA: 32000,
        bills: [
            { id: uid(), name: "Rent/Mortgage", amount: 12000 },
            { id: uid(), name: "Electricity/Heating", amount: 900 },
            { id: uid(), name: "Internet", amount: 399 },
            { id: uid(), name: "Phone", amount: 300 },
            { id: uid(), name: "Subscriptions", amount: 200 },
        ],
        savings: { mode: "percent", value: 15 },
        categories: [
            { id: uid(), name: "Food", amount: 4500 },
            { id: uid(), name: "Transport", amount: 900 },
            { id: uid(), name: "Fun", amount: 1500 },
            { id: uid(), name: "Buffer", amount: 1500 },
        ],
    };
}

function coupleTemplate(): BudgetInput {
    return {
        householdType: "couple",
        incomeA: 28000,
        incomeB: 24000,
        bills: [
            { id: uid(), name: "Rent/Mortgage", amount: 15000 },
            { id: uid(), name: "Electricity/Heating", amount: 1200 },
            { id: uid(), name: "Internet", amount: 399 },
            { id: uid(), name: "Insurance", amount: 500 },
            { id: uid(), name: "Phone (shared)", amount: 0 },
        ],
        savings: { mode: "percent", value: 20 },
        categories: [
            { id: uid(), name: "Food", amount: 6500 },
            { id: uid(), name: "Transport", amount: 1800 },
            { id: uid(), name: "Fun", amount: 2500 },
            { id: uid(), name: "Buffer", amount: 2500 },
        ],
        couple: { splitRule: "proportional" },
    };
}

function studentTemplate(): BudgetInput {
    return {
        householdType: "student",
        incomeA: 13000,
        bills: [
            { id: uid(), name: "Rent", amount: 6500 },
            { id: uid(), name: "Internet", amount: 299 },
            { id: uid(), name: "Phone", amount: 250 },
        ],
        savings: { mode: "fixed", value: 300 },
        categories: [
            { id: uid(), name: "Food", amount: 2500 },
            { id: uid(), name: "Transport", amount: 450 },
            { id: uid(), name: "Fun", amount: 700 },
            { id: uid(), name: "Buffer", amount: 500 },
        ],
    };
}

function aggressiveTemplate(): BudgetInput {
    return {
        householdType: "individual",
        incomeA: 35000,
        bills: [
            { id: uid(), name: "Rent", amount: 12000 },
            { id: uid(), name: "Utilities", amount: 1500 },
        ],
        savings: { mode: "percent", value: 30 },
        categories: [
            { id: uid(), name: "Food", amount: 4000 },
            { id: uid(), name: "Transport", amount: 800 },
            { id: uid(), name: "Fun", amount: 800 },
            { id: uid(), name: "Buffer", amount: 2000 },
        ],
    };
}

function lowIncomeTemplate(): BudgetInput {
    return {
        householdType: "individual",
        incomeA: 15000,
        bills: [
            { id: uid(), name: "Rent", amount: 7000 },
            { id: uid(), name: "Utilities", amount: 1200 },
        ],
        savings: { mode: "fixed", value: 500 },
        categories: [
            { id: uid(), name: "Food", amount: 2500 },
            { id: uid(), name: "Transport", amount: 600 },
            { id: uid(), name: "Fun", amount: 400 },
            { id: uid(), name: "Buffer", amount: 500 },
        ],
    };
}
