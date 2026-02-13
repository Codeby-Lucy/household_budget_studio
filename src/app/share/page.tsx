"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { decodePlan } from "@/lib/budget/share";
import { calculateBudget } from "@/lib/budget/calc";

function formatSEK(n: number) {
    if (!Number.isFinite(n)) return "-";
    return new Intl.NumberFormat("sv-SE", {
        style: "currency",
        currency: "SEK",
        maximumFractionDigits: 0,
    }).format(n);
}

export default function SharePage() {
    const searchParams = useSearchParams();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    const data = searchParams.get("data");

    const plan = useMemo(() => {
        if (!mounted) return null;
        if (!data) return null;

        try {
            return decodePlan(data); // returns BudgetInput
        } catch {
            return null;
        }
    }, [mounted, data]);

    const result = useMemo(() => {
        if (!plan) return null;
        return calculateBudget(plan);
    }, [plan]);

    if (!mounted) return null;

    if (!data) {
        return (
            <main className="mx-auto max-w-3xl p-6 text-zinc-100">
                <h1 className="text-2xl font-semibold">Shared plan</h1>
                <p className="mt-2 text-zinc-300">
                    This link is missing data. Ask the sender to copy the share link again.
                </p>
            </main>
        );
    }

    if (!plan || !result) {
        return (
            <main className="mx-auto max-w-3xl p-6 text-zinc-100">
                <h1 className="text-2xl font-semibold">Shared plan</h1>
                <p className="mt-2 text-zinc-300">
                    This share link looks invalid or corrupted. Ask the sender to generate a new link.
                </p>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-3xl p-6 text-zinc-100">
            <h1 className="text-2xl font-semibold">Shared plan (read-only)</h1>
            <p className="mt-1 text-sm text-zinc-300">
                This page does not save anything. It only displays what was embedded in the link.
            </p>

            <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span>Total income</span>
                        <span className="font-semibold">{formatSEK(result.totalIncome)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Bills</span>
                        <span className="font-semibold">{formatSEK(result.totalBills)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Savings</span>
                        <span className="font-semibold">{formatSEK(result.savingsAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Safe to spend / week</span>
                        <span className="font-semibold">{formatSEK(result.safeToSpendPerWeek)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Remaining after categories</span>
                        <span className="font-semibold">{formatSEK(result.unallocated)}</span>
                    </div>
                </div>
            </div>
        </main>
    );
}
