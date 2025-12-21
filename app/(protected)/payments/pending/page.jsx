"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { api } from "@/services/api";
import { useUIStore } from "@/stores/ui";

function formatCurrency(value) {
  const n = Number(value);
  const amt = Number.isFinite(n) ? n : 0;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amt);
  } catch {
    return `₹${amt}`;
  }
}

function PendingPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pushToast = useUIStore((s) => s.pushToast);
  const setPageMetadata = useUIStore((s) => s.setPageMetadata);

  const endOfMonth = dayjs().endOf("month").format("YYYY-MM-DD");
  const dueBeforeParam = searchParams.get("due_before") || endOfMonth;
  const [dueBefore, setDueBefore] = useState(dueBeforeParam);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState({ total_due: 0, candidate_due: 0, company_due: 0, items: [] });

  useEffect(() => {
    setPageMetadata("Pending payments", "Outstanding company and candidate dues");
  }, [setPageMetadata]);

  const queryKey = useMemo(() => dueBefore, [dueBefore]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const iso =
          dueBefore && dayjs(dueBefore).isValid()
            ? dayjs(dueBefore).endOf("day").toISOString()
            : dayjs().endOf("month").toISOString();
        const result = await api.get("payments/pending-dues", { params: { due_before: iso } });
        console.log(result)
        const items = Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result?.items)
          ? result.items
          : Array.isArray(result)
          ? result
          : [];
        const totals = items.reduce(
          (acc, it) => {
            const bal = Number(it?.balance) || 0;
            acc.total_due += bal;
            if (it?.source === "JOC_FEE_PENDING") acc.candidate_due += bal;
            else acc.company_due += bal;
            return acc;
          },
          { total_due: 0, candidate_due: 0, company_due: 0 }
        );
        if (!active) return;
        setPending({ ...totals, items });
      } catch (error) {
        if (!active) return;
        pushToast({
          title: "Failed to load pending dues",
          description: (error && error.message) || "Could not load pending dues.",
        });
        setPending({ total_due: 0, candidate_due: 0, company_due: 0, items: [] });
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [queryKey, dueBefore, pushToast]);

  function setParam(key, value) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) params.delete(key);
    else params.set(key, value);
    router.replace(params.size ? `${pathname}?${params.toString()}` : pathname);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text)]">Pending dues</h1>
          <p className="text-sm text-slate-500">Outstanding balances across companies and candidates</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600" htmlFor="dueBefore">
            Due before
          </label>
          <Input
            id="dueBefore"
            type="date"
            value={dueBefore}
            onChange={(e) => {
              setDueBefore(e.target.value);
              setParam("due_before", e.target.value);
            }}
            className="w-44 rounded-lg border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[var(--accent)] focus:bg-white"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <FinanceTile title="Total Due" value={pending.total_due} loading={loading} highlight />
        <FinanceTile title="Candidate Due" value={pending.candidate_due} loading={loading} />
        <FinanceTile title="Company Due" value={pending.company_due} loading={loading} />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white ring-1 ring-slate-200/70">
        <div className="grid grid-cols-[1.8fr_1.6fr_1.4fr_1fr_1fr_1.2fr] bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600">
          <div>Candidate</div>
          <div>Contact</div>
          <div>Source</div>
          <div className="text-right">Amount</div>
          <div className="text-right">Received</div>
          <div className="text-right">Balance</div>
        </div>
        <div className="divide-y divide-slate-200 bg-white">
          {(pending.items || []).map((item) => {
            const candidateId = item?.candidate_id ? String(item.candidate_id) : "";
            return (
              <div
                key={`${item?.source || "item"}-${item?.id || item?.company_id || Math.random()}`}
                className="grid grid-cols-[1.8fr_1.6fr_1.4fr_1fr_1fr_1.2fr] items-center px-4 py-3 text-sm text-slate-900 hover:bg-slate-50"
              >
                <div className="flex flex-col">
                  {candidateId ? (
                    <Link href={`/candidates/${candidateId}`} className="font-semibold text-[var(--accent)] hover:underline">
                      {item?.candidate_name || "Unknown candidate"}
                    </Link>
                  ) : (
                    <span className="font-semibold">{item?.candidate_name || "Unknown candidate"}</span>
                  )}
                </div>
                <div className="text-sm text-slate-600">{item?.candidate_contact_number || "—"}</div>
                <div className="text-sm text-slate-600">{item?.source || "Payment"}</div>
                <div className="text-right font-semibold text-slate-900">{formatCurrency(item?.total_amount)}</div>
                <div className="text-right text-slate-700">{formatCurrency(item?.total_received)}</div>
                <div className="text-right font-semibold text-[var(--accent)]">{formatCurrency(item?.balance)}</div>
              </div>
            );
          })}
          {!pending.items?.length ? (
            <div className="px-4 py-6 text-center text-sm text-slate-500">No pending dues for the selected date.</div>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-end">
        <Link href="/dashboard" className="text-xs text-[var(--accent)] hover:underline">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}

function FinanceTile({ title, value, loading, highlight }) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-200/60 ${
        highlight ? "ring-[var(--accent)]/40" : ""
      }`}
    >
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-1 text-xl font-semibold text-slate-900">
        {loading ? "Loading…" : formatCurrency(value)}
      </div>
    </div>
  );
}

export default function PaymentsPendingPage() {
  return (
    <Suspense>
      <PendingPageInner />
    </Suspense>
  );
}
