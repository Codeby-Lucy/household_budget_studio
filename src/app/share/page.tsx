"use client";

import { useMemo } from "react";
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

const WEEKS_PER_MONTH = 4.33;
const perWeekRounded = (monthly: number) => Math.round(monthly / WEEKS_PER_MONTH);

export default function SharePage() {
    const params = useSearchParams();
    const data = params.get("data");

    const parsed = useMemo(() => {
        if (!data) return null;
        try {
            return decodePlan(data);
        } catch {
            return null;
        }
    }, [data]);

    const result = useMemo(() => (parsed ? calculateBudget(parsed) : null), [parsed]);

    if (!data) {
        return (
            <main className="mx-auto max-w-3xl p-6">
                <h1 className="text-2xl font-semibold">Shared plan</h1>
                <p className="mt-2 opacity-70">Missing link data.</p>
            </main>
        );
    }

    if (!parsed || !result) {
        return (
            <main className="mx-auto max-w-3xl p-6">
                <h1 className="text-2xl font-semibold">Shared plan</h1>
                <p className="mt-2 opacity-70">This link is invalid or corrupted.</p>
            </main>
        );
    }

    return (
        <main className="mx-auto max-w-3xl p-6">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-semibold">Shared plan (read-only)</h1>
                    <p className="mt-1 text-sm opacity-70">
                        Anyone with this link can view the plan. It’s not saved to a server.
                    </p>
                </div>
                <a
                    href="/"
                    className="rounded-lg border border-white/10 px-3 py-2 hover:bg-white/5"
                >
                    Open editor
                </a>
            </div>

            <section className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-5">
                <h2 className="text-lg font-semibold mb-4">Overview</h2>

                <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Total income</span><span className="font-semibold">{formatSEK(result.totalIncome)}</span></div>
                    <div className="flex justify-between"><span>Bills</span><span className="font-semibold">{formatSEK(result.totalBills)}</span></div>
                    <div className="flex justify-between"><span>Savings</span><span className="font-semibold">{formatSEK(result.savingsAmount)}</span></div>
                    <div className="flex justify-between"><span>Remaining after bills + savings</span><span className="font-semibold">{formatSEK(result.remainingAfterBillsAndSavings)}</span></div>
                    <div className="flex justify-between"><span>Safe to spend per week</span><span className="font-semibold">{formatSEK(result.safeToSpendPerWeek)}</span></div>
                </div>

                {result.couple && (
                    <div className="mt-6 rounded-xl border border-white/10 p-4">
                        <div className="text-sm font-semibold">Couple fairness (bills only)</div>
                        <ul className="mt-3 space-y-1 text-sm list-disc pl-5">
                            {result.couple.contributions.map((c) => (
                                <li key={c.person}>
                                    Person {c.person}: {formatSEK(c.fairBillContribution)} ({Math.round(c.incomeShare * 100)}%)
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </section>

            <section className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-5">
                <h2 className="text-lg font-semibold mb-4">Bills</h2>
                <div className="space-y-2 text-sm">
                    {parsed.bills.map((b) => (
                        <div key={b.id} className="flex justify-between">
                            <span>{b.name}</span>
                            <span className="font-semibold">{formatSEK(b.amount)}</span>
                        </div>
                    ))}
                </div>
            </section>

            <section className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-5">
                <h2 className="text-lg font-semibold mb-4">Categories (weekly)</h2>
                <div className="space-y-2 text-sm">
                    {parsed.categories.map((c) => (
                        <div className="flex justify-between">
                            <span>Unallocated (vs categories)</span>
                            <span
                                className={`font-semibold ${result.unallocated < 0 ? "text-red-400" : "text-green-400"
                                    }`}
                            >
                                {formatSEK(result.unallocated)}
                            </span>
                        </div>

                    ))}
                </div>
            </section>
        </main>
    );
}
