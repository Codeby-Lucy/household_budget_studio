// src/lib/budget/storage.ts

import { BudgetInput } from "./types";

// LocalStorage key (versioned). Increment version if structure of SavedPlan changes.
const KEY = "budget-split:plans:v1";

export type SavedPlan = {
    id: string;
    name: string;
    createdAt: string; // ISO timestamp
    data: BudgetInput;
};

// Safe JSON parsing helper that returns null on failure (instead of throwing).
function safeParse<T>(raw: string | null): T | null {
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

// CRUD operations for saved plans in localStorage. 
// Plans are stored as an array of SavedPlan objects under a single key.
export function loadPlans(): SavedPlan[] {
    if (typeof window === "undefined") return [];
    const parsed = safeParse<SavedPlan[]>(localStorage.getItem(KEY));
    return Array.isArray(parsed) ? parsed : [];
}

export function savePlans(plans: SavedPlan[]) {
    localStorage.setItem(KEY, JSON.stringify(plans));
}

export function addPlan(plan: SavedPlan) {
    const plans = loadPlans();
    plans.unshift(plan); // newest first
    savePlans(plans);
    return plans;
}

export function removePlan(id: string) {
    const plans = loadPlans().filter(p => p.id !== id);
    savePlans(plans);
    return plans;
}
