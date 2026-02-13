import { Suspense } from "react";
import ShareClient from "./ShareClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function SharePage() {
    return (
        <Suspense
            fallback={
                <main className="mx-auto max-w-3xl p-6 text-zinc-100">
                    <h1 className="text-2xl font-semibold">Shared plan</h1>
                    <p className="mt-2 text-zinc-300">Loading…</p>
                </main>
            }
        >
            <ShareClient />
        </Suspense>
    );
}
