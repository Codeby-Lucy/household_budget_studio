// src/lib/budget/share.ts
import { BudgetInput } from "./types";

export function encodePlan(plan: BudgetInput): string {
    const json = JSON.stringify(plan);
    // base64 (URL safe)
    const b64 = btoa(unescape(encodeURIComponent(json)));
    return b64.replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", ".");
}

// Inverse of encodePlan. Returns BudgetInput or throws if invalid.
export function decodePlan(encoded: string): BudgetInput {
    const b64 = encoded.replaceAll("-", "+").replaceAll("_", "/").replaceAll(".", "=");
    const json = decodeURIComponent(escape(atob(b64)));
    return JSON.parse(json) as BudgetInput;
}
