
"use client";

import { useMemo, useState, useEffect } from "react";
import { calculateBudget } from "@/lib/budget/calc";
import { BudgetInput, Bill, Category } from "@/lib/budget/types";
import { getTemplate, TemplateKey } from "@/lib/budget/templates";
import { uid } from "@/lib/budget/ui";
import { addPlan, loadPlans, removePlan, SavedPlan } from "@/lib/budget/storage";
import { encodePlan } from "@/lib/budget/share";

// Currency formatting used across the UI.
// Kept here (not in the engine) to keep calculation logic framework-agnostic.
function formatSEK(n: number) {
  if (!Number.isFinite(n)) return "-";
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    maximumFractionDigits: 0,
  }).format(n);
}

// Simple month → week conversion for budgeting UX.
// 4.33 is a common monthly-average approximation (52 weeks / 12 months).
const WEEKS_PER_MONTH = 4.33;

function perWeekRounded(monthly: number) {
  return Math.round(monthly / WEEKS_PER_MONTH);
}

// Converts input values to numbers safely (empty/invalid -> 0).
function num(v: string) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

// Reusable UI style

const inputBase =
  "rounded-xl border border-white/10 bg-black/30 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20";

const inputFull = `w-full p-3 ${inputBase}`;
const inputSmall = `p-2.5 ${inputBase}`;

const inputCompact = `w-32 p-2.5 ${inputBase}`;

const buttonBase =
  "rounded-xl border border-white/10 px-3 py-2 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-white/20";

const buttonPrimary =
  "rounded-xl border border-indigo-500/30 bg-indigo-500/15 px-3 py-2 text-indigo-100 hover:bg-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-400/30";

const buttonDanger =
  "rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-100 hover:bg-red-500/15 focus:outline-none focus:ring-2 focus:ring-red-400/30";

const pillGroup =
  "inline-flex rounded-xl border border-white/10 bg-black/20 p-1";

const pillButton = (active: boolean) =>
  `rounded-lg px-3 py-2 text-sm transition border ${active
    ? "border-indigo-500/30 bg-indigo-500/15 text-indigo-100"
    : "border-transparent text-zinc-300 hover:bg-white/5"
  }`;

const card =
  "rounded-2xl border border-white/10 bg-zinc-900/10 p-4 shadow-md";

const panel =
  "rounded-3xl border border-white/10 bg-zinc-900/95 p-5 shadow-xl";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function BudgetBars(props: {
  income: number;
  bills: number;
  savings: number;
  categories: number;
  remaining: number; // result.unallocated (after categories)
}) {
  const { income, bills, savings, categories, remaining } = props;

  const safeIncome = income > 0 ? income : 0;

  const billsPct = safeIncome ? (bills / safeIncome) * 100 : 0;
  const savingsPct = safeIncome ? (savings / safeIncome) * 100 : 0;
  const categoriesPct = safeIncome ? (categories / safeIncome) * 100 : 0;

  // Remaining after categories can be negative. We show:
  // - if positive: Remaining % bar
  // - if negative: Deficit % bar
  const remainingPct = safeIncome ? (Math.max(remaining, 0) / safeIncome) * 100 : 0;
  const deficitPct = safeIncome ? (Math.max(-remaining, 0) / safeIncome) * 100 : 0;

  // Clamp so visuals never overflow
  const b = clamp(billsPct, 0, 100);
  const s = clamp(savingsPct, 0, 100);
  const c = clamp(categoriesPct, 0, 100);
  const r = clamp(remainingPct, 0, 100);
  const d = clamp(deficitPct, 0, 100);

  return (
    <div className={card}>
      <div className="flex items-baseline justify-between">
        <div className="text-sm font-semibold">Budget overview</div>
        <div className="text-xs text-zinc-400">Share of income</div>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        {/* Bills */}
        <div>
          <div className="flex justify-between">
            <span className="text-zinc-300">Bills</span>
            <span className="font-semibold">{Math.round(b)}%</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full bg-white/20" style={{ width: `${b}%` }} />
          </div>
        </div>

        {/* Savings */}
        <div>
          <div className="flex justify-between">
            <span className="text-zinc-300">Savings</span>
            <span className="font-semibold">{Math.round(s)}%</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full bg-indigo-500/30" style={{ width: `${s}%` }} />
          </div>
        </div>

        {/* Categories */}
        <div>
          <div className="flex justify-between">
            <span className="text-zinc-300">Categories</span>
            <span className="font-semibold">{Math.round(c)}%</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full bg-cyan-500/25" style={{ width: `${c}%` }} />
          </div>
        </div>

        {/* Remaining / Deficit */}
        {remaining >= 0 ? (
          <div>
            <div className="flex justify-between">
              <span className="text-zinc-300">Remaining</span>
              <span className="font-semibold">{Math.round(r)}%</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full bg-emerald-500/25" style={{ width: `${r}%` }} />
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between">
              <span className="text-zinc-300">Deficit</span>
              <span className="font-semibold">{Math.round(d)}%</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full bg-red-500/25" style={{ width: `${d}%` }} />
            </div>
          </div>
        )}
      </div>

      {safeIncome === 0 && (
        <p className="mt-3 text-xs text-zinc-400">
          Enter income to see percentages.
        </p>
      )}
    </div>
  );
}

export default function Home() {
  // Avoid hydration mismatches: this page depends on browser-only APIs
  // (localStorage, clipboard, URL origin). Render only after mount.
  const [mounted, setMounted] = useState(false);

  // UI state
  const [template, setTemplate] = useState<TemplateKey>("couple");
  const [input, setInput] = useState<BudgetInput>(() => getTemplate("couple"));

  // Persistence (localStorage)
  const [saved, setSaved] = useState<SavedPlan[]>([]);
  const [planName, setPlanName] = useState<string>("");

  useEffect(() => {
    setMounted(true);
    setSaved(loadPlans());
  }, []);

  // Derived result. Keeping compute in a pure engine makes it reusable (web now, mobile later).
  const result = useMemo(() => calculateBudget(input), [input]);

  // Load a preset (template) into the editor.
  const loadTemplate = (key: TemplateKey) => {
    setTemplate(key);
    setInput(getTemplate(key));
  };

  // Bills CRUD
  const addBill = () => {
    const newBill: Bill = { id: uid(), name: "New bill", amount: 0 };
    setInput((prev) => ({ ...prev, bills: [...prev.bills, newBill] }));
  };

  const updateBill = (id: string, patch: Partial<Bill>) => {
    setInput((prev) => ({
      ...prev,
      bills: prev.bills.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
  };

  const removeBill = (id: string) => {
    setInput((prev) => ({ ...prev, bills: prev.bills.filter((b) => b.id !== id) }));
  };

  // Categories CRUD
  const addCategory = () => {
    const newCat: Category = { id: uid(), name: "New category", amount: 0 };
    setInput((prev) => ({ ...prev, categories: [...prev.categories, newCat] }));
  };

  const updateCategory = (id: string, patch: Partial<Category>) => {
    setInput((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  };

  const removeCategory = (id: string) => {
    setInput((prev) => ({ ...prev, categories: prev.categories.filter((c) => c.id !== id) }));
  };

  // Save current editor state as a named plan (stored locally in this browser).
  const onSavePlan = () => {
    const name = planName.trim() || "Untitled plan";
    const newPlan: SavedPlan = {
      id: uid(),
      name,
      createdAt: new Date().toISOString(),
      data: input,
    };
    const updated = addPlan(newPlan);
    setSaved(updated);
    setPlanName("");
  };

  const onLoadPlan = (p: SavedPlan) => {
    setInput(p.data);
  };

  const onDeletePlan = (id: string) => {
    const updated = removePlan(id);
    setSaved(updated);
  };

  // Share link strategy: embed the plan data in the URL as an encoded string.
  const onShare = async () => {
    const data = encodePlan(input);
    const url = `${window.location.origin}/share?data=${data}`;
    await navigator.clipboard.writeText(url);
    alert("Share link copied!");
  };

  // Hydration guard render
  if (!mounted) {
    return null;
  }

  return (
    <main className="relative min-h-screen text-zinc-100">
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/background_image.jpg')" }}
      />

      <div className="absolute inset-0 -z-10 bg-black/30" />

      <div className="mx-auto max-w-6xl p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.02em]">
              Household Budget Studio
            </h1>
            <p className="mt-1 text-sm sm:text-base text-zinc-300">
              Build a monthly plan in minutes. See weekly budgets. Share a read-only link.
            </p>
          </div>

          <div className="flex gap-2">
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200">
              Version 0.1
            </span>
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200">
              Local-first
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {/* Inputs */}
          <section className={panel}>
            <h2 className="text-lg font-medium mb-4 text-zinc-200">Monthly Setup</h2>
            <div className="space-y-4">
              <label className="block mb-4">
                <div className="text-sm text-zinc-300 mb-2">Template</div>
                <select
                  value={template}
                  onChange={(e) => loadTemplate(e.target.value as TemplateKey)}
                  className={`${inputFull} bg-zinc-800/80`}
                >

                  <option value="individual">Individual</option>
                  <option value="couple">Couple</option>
                  <option value="student">Student</option>
                  <option value="aggressive">Aggressive savings</option>
                  <option value="lowincome">Low income month</option>
                </select>
              </label>

              <div className={`mt-4 ${card}`}>
                <div className="text-sm font-semibold mb-3">Saved Plans</div>
                <button
                  onClick={onShare}
                  className={`mt-3 w-full ${buttonPrimary}`}
                >
                  Share Plan
                </button>
                <p className="mt-2 text-xs opacity-60">
                  Generates a read-only link.
                </p>

                <div className="flex gap-2">
                  <input
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="Plan name (e.g., March budget)"
                    className={`flex-1 ${inputSmall}`}
                  />
                  <button
                    onClick={onSavePlan}
                    className={buttonBase}
                  >
                    Save
                  </button>
                </div>

                {saved.length === 0 ? (
                  <p className="mt-3 text-sm opacity-70">No saved plans yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2">
                    {saved.map((p) => (
                      <li key={p.id} className="flex items-center justify-between gap-2">
                        <button
                          onClick={() => onLoadPlan(p)}
                          className={`text-left flex-1 ${buttonBase} bg-black/20`}
                        >
                          <div className="text-sm font-medium">{p.name}</div>
                          <div className="text-xs opacity-60">
                            {new Date(p.createdAt).toLocaleString("sv-SE")}
                          </div>
                        </button>
                        <button
                          onClick={() => onDeletePlan(p.id)}
                          className={buttonDanger}
                          aria-label="Delete plan"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <label className="block mb-4">
                <div className="text-sm text-zinc-300 mb-2">Income A (SEK / month)</div>
                <input
                  type="number"
                  value={input.incomeA}
                  onChange={(e) => setInput((prev) => ({ ...prev, incomeA: num(e.target.value) }))}
                  className={inputFull}
                />
              </label>

              {input.householdType === "couple" && (
                <>
                  <label className="block mb-4">
                    <div className="text-sm text-zinc-300 mb-2">Income B (SEK / month)</div>
                    <input
                      type="number"
                      value={input.incomeB ?? 0}
                      onChange={(e) => setInput((prev) => ({ ...prev, incomeB: num(e.target.value) }))}
                      className={inputFull}
                    />
                  </label>

                  <label className="block mb-4">
                    <div className="text-sm text-zinc-300 mb-2">Couple split rule</div>
                    <select
                      value={input.couple?.splitRule ?? "proportional"}
                      onChange={(e) =>
                        setInput((prev) => ({ ...prev, couple: { splitRule: e.target.value as any } }))
                      }
                      className={`${inputFull} bg-zinc-800/80`}
                    >
                      <option value="proportional">Proportional to income</option>
                      <option value="equal">Equal split</option>
                    </select>
                  </label>
                </>
              )}

              {/* Savings */}
              <div className={`mt-2 ${card}`}>
                <div className="text-sm font-semibold mb-3">Savings</div>
                <div className="flex gap-2">
                  <select
                    value={input.savings.mode}
                    onChange={(e) =>
                      setInput((prev) => ({ ...prev, savings: { ...prev.savings, mode: e.target.value as any } }))
                    }
                    className={`flex-1 ${inputBase} bg-zinc-800/80 p-3`}
                  >
                    <option value="percent">Percent</option>
                    <option value="fixed">Fixed SEK</option>
                  </select>

                  <input
                    type="number"
                    value={input.savings.value}
                    onChange={(e) =>
                      setInput((prev) => ({ ...prev, savings: { ...prev.savings, value: num(e.target.value) } }))
                    }
                    className={`flex-1 ${inputBase} p-3`}
                  />
                </div>
              </div>

              {/* Bills */}
              <div className={`mt-4 ${card}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold">Bills</div>
                  <button onClick={addBill} className={`${buttonBase} py-1.5`}>
                    + Add bill
                  </button>
                </div>

                <div className="space-y-2">
                  {input.bills.map((b) => (
                    <div key={b.id} className="flex gap-2">
                      <input
                        value={b.name}
                        onChange={(e) => updateBill(b.id, { name: e.target.value })}
                        className={`flex-1 ${inputSmall}`}
                        placeholder="Bill name"
                      />
                      <input
                        type="number"
                        value={b.amount}
                        onChange={(e) => updateBill(b.id, { amount: num(e.target.value) })}
                        className={inputCompact}
                        placeholder="SEK"
                      />
                      <button
                        onClick={() => removeBill(b.id)}
                        className={`${buttonDanger} px-3 py-0`}
                        aria-label="Remove bill"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-3 text-sm opacity-80">
                  Total bills: <span className="font-semibold">{formatSEK(result.totalBills)}</span>
                </div>
              </div>

              {/* Categories */}
              <div className={`mt-4 ${card}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold">Categories</div>
                  <button
                    onClick={addCategory}
                    className={`${buttonBase} py-1.5`}
                  >
                    + Add category
                  </button>
                </div>

                <div className="space-y-2">
                  {input.categories.map((c) => (
                    <div key={c.id} className="flex flex-col gap-1 rounded-lg border border-white/5 p-2">
                      <div className="flex gap-2">
                        <input
                          value={c.name}
                          onChange={(e) => updateCategory(c.id, { name: e.target.value })}
                          className={`flex-1 ${inputSmall}`}
                          placeholder="Category name"
                        />
                        <input
                          type="number"
                          value={c.amount}
                          onChange={(e) => updateCategory(c.id, { amount: num(e.target.value) })}
                          className={inputCompact}
                          placeholder="SEK / month"
                        />
                        <button
                          onClick={() => removeCategory(c.id)}
                          className={`${buttonDanger} px-3 py-0`}
                          aria-label="Remove category"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="text-xs opacity-70 pl-1">
                        ≈ {formatSEK(perWeekRounded(c.amount))} / week
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 text-sm opacity-80">
                  Total categories: <span className="font-semibold">{formatSEK(result.totalCategoryBudgets)}</span>
                </div>
              </div>
            </div>
          </section>

          {/* Results */}
          <section className={panel}>
            <h2 className="text-lg font-semibold mb-4">Monthly Overview</h2>

            <BudgetBars
              income={result.totalIncome}
              bills={result.totalBills}
              savings={result.savingsAmount}
              categories={result.totalCategoryBudgets}
              remaining={result.unallocated}
            />

            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className={card}>
                  <div className="text-xs text-zinc-400">Total income</div>
                  <div className="mt-1 text-lg font-semibold">{formatSEK(result.totalIncome)}</div>
                </div>

                <div className={card}>
                  <div className="text-xs text-zinc-400">Bills</div>
                  <div className="mt-1 text-lg font-semibold">{formatSEK(result.totalBills)}</div>
                </div>

                <div className={card}>
                  <div className="text-xs text-zinc-400">Savings</div>
                  <div className="mt-1 text-lg font-semibold">{formatSEK(result.savingsAmount)}</div>
                </div>

                <div className={card}>
                  <div className="text-xs text-zinc-400">Safe to spend / week</div>
                  <div className="mt-1 text-lg font-semibold">{formatSEK(result.safeToSpendPerWeek)}</div>
                </div>
              </div>

              <div className={`mt-4 ${card} flex items-center justify-between`}>
                <div>
                  <div className="text-xs text-zinc-400">Remaining after categories</div>
                  <div className="mt-1 text-lg font-semibold">{formatSEK(result.unallocated)}</div>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium border ${result.unallocated < 0
                    ? "border-red-500/40 bg-red-500/10 text-red-200"
                    : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                    }`}
                >
                  {result.unallocated < 0 ? "Over budget" : "Spare left"}
                </span>
              </div>

              <div className={card}>
                <div className="text-sm font-semibold mb-3">Weekly breakdown</div>
                <div className="space-y-2 text-sm">
                  {input.categories.map((c) => (
                    <div key={c.id} className="flex justify-between">
                      <span className="text-zinc-300">{c.name}</span>
                      <span className="font-semibold">{formatSEK(perWeekRounded(c.amount))} / week</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className={`mt-6 ${card}`}>
                <div className="text-sm font-semibold mb-3">Financial Insights</div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Bills as % of income</span>
                    <span className="font-semibold">
                      {result.totalIncome > 0
                        ? Math.round((result.totalBills / result.totalIncome) * 100)
                        : 0}
                      %
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Savings rate</span>
                    <span className="font-semibold">
                      {result.totalIncome > 0
                        ? Math.round((result.savingsAmount / result.totalIncome) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                </div>

                <p className="mt-3 text-xs opacity-70">
                  Many households aim for 10–20% savings depending on income stability.
                </p>
              </div>

              {result.couple && (
                <div className={`mt-6 ${card}`}>
                  <div className="text-sm font-semibold">Couple fairness (bills only)</div>
                  <div className="text-xs opacity-70 mt-1">Rule: {result.couple.splitRule}</div>
                  <ul className="mt-3 space-y-1 text-sm list-disc pl-5">
                    {result.couple.contributions.map((c) => (
                      <li key={c.person}>
                        Person {c.person}: {formatSEK(c.fairBillContribution)} ({Math.round(c.incomeShare * 100)}%)
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.warnings.length > 0 && (
                <div className={`mt-6 ${card} border-red-500/40 bg-red-500/10`}>
                  <div className="text-sm font-semibold">Warnings</div>
                  <ul className="mt-2 list-disc pl-5 text-sm space-y-1">
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        </div>

        <footer className="mt-12 border-t border-white/10 pt-6 text-xs opacity-60">
          <div>
            This tool does not store financial data on a server. Plans are saved in your browser.
          </div>
          <div className="mt-1">
            Built in Sweden 🇸🇪 · Version 0.1
          </div>
        </footer>
      </div>
    </main>
  );
}
