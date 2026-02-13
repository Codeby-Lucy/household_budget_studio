// src/lib/budget/ui.ts
export const uid = () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
