"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useUIStore } from "@/stores/ui";
import { api } from "@/services/api";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function computeRangeDates(range) {
  const now = dayjs();
  const today = now.format("YYYY-MM-DD");

  if (range === "today") {
    return { from: today, to: today };
  }

  if (range === "this_week") {
    // dayjs startOf('week') depends on locale; keep default behavior.
    const from = now.startOf("week").format("YYYY-MM-DD");
    return { from, to: today };
  }

  if (range === "this_month") {
    const from = now.startOf("month").format("YYYY-MM-DD");
    return { from, to: today };
  }

  if (range === "quarter") {
    const monthIndex = now.month();
    const quarterStartMonth = Math.floor(monthIndex / 3) * 3;
    const from = now.month(quarterStartMonth).startOf("month").format("YYYY-MM-DD");
    return { from, to: today };
  }

  if (range === "half_year") {
    const monthIndex = now.month();
    const startMonth = monthIndex < 6 ? 0 : 6;
    const from = now.month(startMonth).startOf("month").format("YYYY-MM-DD");
    return { from, to: today };
  }

  return { from: "", to: "" };
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardPageInner />
    </Suspense>
  );
}

function DashboardPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setPageMetadata = useUIStore((state) => state.setPageMetadata);
  const pushToast = useUIStore((state) => state.pushToast);

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingFinance, setLoadingFinance] = useState(true);
  const [summary, setSummary] = useState(null);
  const [financeItems, setFinanceItems] = useState([]);

  const rangeParam = searchParams.get("range") || "";
  const startDateParam = searchParams.get("start_date") || "";
  const endDateParam = searchParams.get("end_date") || "";

  const selectedRange = rangeParam || "this_month";

  const customRangeLabel =
    startDateParam && endDateParam
      ? `${startDateParam} - ${endDateParam}`
      : "Custom";

  const rangePillLabel =
    startDateParam && endDateParam
      ? `${startDateParam} - ${endDateParam}`
      : "All time";

  function navigateTo(path, nextParams) {
    const params = new URLSearchParams();
    Object.entries(nextParams || {}).forEach(([k, v]) => {
      if (v == null || v === "") return;
      params.set(k, String(v));
    });
    const qs = params.toString();
    router.push(qs ? `${path}?${qs}` : path);
  }

  function getInterviewDateParams() {
    const params = {};
    if (startDateParam) params.from_date = startDateParam;
    if (endDateParam) params.to_date = endDateParam;
    return params;
  }

  const [customOpen, setCustomOpen] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [customPos, setCustomPos] = useState({ top: 120, left: 16 });
  const rangeAnchorRef = useRef(null);
  const popoverRef = useRef(null);

  function replaceParams(next) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next || {}).forEach(([k, v]) => {
      if (v == null || v === "") params.delete(k);
      else params.set(k, String(v));
    });
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function applyRange(range) {
    const computed = computeRangeDates(range);
    replaceParams({ range, start_date: computed.from, end_date: computed.to });
  }

  function openCustomPicker() {
    const today = dayjs().format("YYYY-MM-DD");
    const initialStart = startDateParam || today;
    const initialEnd = endDateParam || today;
    setCustomStart(initialStart);
    setCustomEnd(initialEnd);
    setCustomOpen(true);
  }

  useEffect(() => {
    if (!customOpen) return;

    function positionPopover() {
      try {
        const anchor = rangeAnchorRef.current;
        const pop = popoverRef.current;
        if (!anchor || !pop) return;

        const rect = anchor.getBoundingClientRect();
        const popRect = pop.getBoundingClientRect();
        const margin = 12;

        const maxLeft = Math.max(margin, window.innerWidth - popRect.width - margin);
        const left = Math.min(Math.max(rect.left, margin), maxLeft);

        const preferBelowTop = rect.bottom + 8;
        const preferAboveTop = rect.top - popRect.height - 8;

        let top = preferBelowTop;
        if (preferBelowTop + popRect.height > window.innerHeight - margin) {
          top = preferAboveTop;
        }

        const maxTop = Math.max(margin, window.innerHeight - popRect.height - margin);
        top = Math.min(Math.max(top, margin), maxTop);

        setCustomPos({ top, left });
      } catch {
        // ignore positioning errors
      }
    }

    const id = window.requestAnimationFrame(positionPopover);
    window.addEventListener("resize", positionPopover);
    window.addEventListener("scroll", positionPopover, true);
    return () => {
      window.cancelAnimationFrame(id);
      window.removeEventListener("resize", positionPopover);
      window.removeEventListener("scroll", positionPopover, true);
    };
  }, [customOpen]);

  useEffect(() => {
    setPageMetadata("Dashboard", "System overview and financial summary");
  }, [setPageMetadata]);

  useEffect(() => {
    if (rangeParam) return;
    if (startDateParam || endDateParam) return;
    // Default range
    applyRange("this_month");
  }, [rangeParam, startDateParam, endDateParam]);

  const startDateTime = startDateParam ? `${startDateParam}T00:00:00` : undefined;
  const endDateTime = endDateParam ? `${endDateParam}T23:59:59` : undefined;
  const dateParams = {
    ...(startDateTime ? { start_date: startDateTime } : {}),
    ...(endDateTime ? { end_date: endDateTime } : {}),
  };
  const dateKey = `${startDateParam}|${endDateParam}`;

  useEffect(() => {
    let active = true;
    async function loadSummary() {
      setLoadingSummary(true);
      try {
        const data = await api.get("reports/dashboard", {
          params: dateParams,
        });
        if (!active) return;
        setSummary(data || null);
      } catch (error) {
        if (!active) return;
        pushToast({
          title: "Failed to load dashboard",
          description:
            (error && error.message) ||
            "An error occurred while loading dashboard data.",
        });
      } finally {
        if (active) setLoadingSummary(false);
      }
    }
    loadSummary();
    return () => {
      active = false;
    };
  }, [dateKey, pushToast]);

  useEffect(() => {
    let active = true;
    async function loadFinance() {
      setLoadingFinance(true);
      try {
        const result = await api.get("reports/finance/breakdown", {
          params: { group_by: "month", ...dateParams },
        });
        if (!active) return;
        const items = Array.isArray(result?.items) ? result.items : [];
        setFinanceItems(items);
      } catch (error) {
        if (!active) return;
        pushToast({
          title: "Failed to load finance breakdown",
          description:
            (error && error.message) ||
            "An error occurred while loading finance chart data.",
        });
      } finally {
        if (active) setLoadingFinance(false);
      }
    }
    loadFinance();
    return () => {
      active = false;
    };
  }, [dateKey, pushToast]);

  const companiesTotal = safeNumber(summary?.companies?.total);
  const companiesPaid = safeNumber(summary?.companies?.paid);
  const companiesFree = safeNumber(summary?.companies?.free);

  const jobsOpen = safeNumber(summary?.jobs?.OPEN);
  const jobsFulfilled = safeNumber(summary?.jobs?.FULFILLED);
  const jobsDropped = safeNumber(summary?.jobs?.DROPPED);

  const candRegistered = safeNumber(summary?.candidates?.REGISTERED);
  const candCaps = safeNumber(summary?.candidates?.CAPS);
  const candJoc = safeNumber(summary?.candidates?.JOC);
  const candFree = safeNumber(summary?.candidates?.FREE);

  const intScheduled = safeNumber(summary?.interviews?.SCHEDULED);
  const intJoined = safeNumber(summary?.interviews?.JOINED);
  const intOnHold = safeNumber(summary?.interviews?.ON_HOLD);
  const intRejectedEmployer = safeNumber(summary?.interviews?.REJECTED_BY_EMPLOYER);
  const intRejectedCandidate = safeNumber(summary?.interviews?.REJECTED_BY_CANDIDATE);

  const financeCompanyPayments = safeNumber(summary?.finance?.company_payments);
  const financeCandidateFees = safeNumber(summary?.finance?.candidate_fees_received);
  const financePlacementIncome = safeNumber(summary?.finance?.placement_income);
  const financeTotalIncome = safeNumber(summary?.finance?.total_income);

  const companiesStatusChart = [
    { label: "Paid", status: "PAID", value: companiesPaid, color: "#16a34a" },
    { label: "Free", status: "FREE", value: companiesFree, color: "#64748b" },
  ];

  const jobsStatusChart = [
    { label: "Open", status: "OPEN", value: jobsOpen, color: "#2563eb" },
    { label: "Fulfilled", status: "FULFILLED", value: jobsFulfilled, color: "#16a34a" },
    { label: "Dropped", status: "DROPPED", value: jobsDropped, color: "#ef4444" },
  ];

  const candidatesStatusChart = [
    { label: "Registered", status: "REGISTERED", value: candRegistered, color: "#2563eb" },
    { label: "CAPS", status: "CAPS", value: candCaps, color: "#16a34a" },
    { label: "JOC", status: "JOC", value: candJoc, color: "#f59e0b" },
    { label: "Free", status: "FREE", value: candFree, color: "#64748b" },
  ];

  const interviewsStatusChart = [
    { label: "Scheduled", status: "SCHEDULED", value: intScheduled, color: "#2563eb" },
    { label: "Joined", status: "JOINED", value: intJoined, color: "#16a34a" },
    { label: "On hold", status: "ON_HOLD", value: intOnHold, color: "#f59e0b" },
    {
      label: "Rejected (Employer)",
      status: "REJECTED_BY_EMPLOYER",
      value: intRejectedEmployer,
      color: "#ef4444",
    },
    {
      label: "Rejected (Candidate)",
      status: "REJECTED_BY_CANDIDATE",
      value: intRejectedCandidate,
      color: "#ef4444",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="px-1">
        <div className="text-2xl font-semibold tracking-tight text-[var(--text)]">CAPS Tally Jobs</div>
      </div>

      <section className="rounded-2xl bg-[var(--bg)] p-6 shadow-sm ring-1 ring-[var(--border)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Date range</div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl bg-[var(--bg-muted)] p-1 ring-1 ring-[var(--border)]">
                <button
                  type="button"
                  className={
                    selectedRange === "today"
                      ? "rounded-lg bg-[var(--bg)] px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-sm"
                      : "rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  }
                  onClick={() => {
                    setCustomOpen(false);
                    applyRange("today");
                  }}
                >
                  Today
                </button>
                <button
                  type="button"
                  className={
                    selectedRange === "this_week"
                      ? "rounded-lg bg-[var(--bg)] px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-sm"
                      : "rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  }
                  onClick={() => {
                    setCustomOpen(false);
                    applyRange("this_week");
                  }}
                >
                  Week
                </button>
                <button
                  type="button"
                  className={
                    selectedRange === "this_month"
                      ? "rounded-lg bg-[var(--bg)] px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-sm"
                      : "rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  }
                  onClick={() => {
                    setCustomOpen(false);
                    applyRange("this_month");
                  }}
                >
                  Month
                </button>
                <button
                  type="button"
                  ref={rangeAnchorRef}
                  className={
                    selectedRange === "custom"
                      ? "rounded-lg bg-[var(--bg)] px-3 py-1.5 text-sm font-semibold text-slate-900 shadow-sm"
                      : "rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  }
                  onClick={() => {
                    replaceParams({ range: "custom" });
                    openCustomPicker();
                  }}
                  title={customRangeLabel}
                >
                  Custom
                </button>
              </div>

              {selectedRange === "custom" ? (
                <Button type="button" variant="outline" size="sm" onClick={() => openCustomPicker()}>
                  Edit
                </Button>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl bg-[var(--bg-muted)] px-4 py-3 ring-1 ring-[var(--border)]">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Showing</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{rangePillLabel}</div>
          </div>
        </div>

        {customOpen ? (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setCustomOpen(false)}
            />
            <div
              className="fixed z-50 w-[92vw] max-w-md rounded-2xl bg-[var(--bg)] p-4 shadow-xl ring-1 ring-[var(--border)]"
              style={{ top: customPos.top, left: customPos.left }}
              ref={popoverRef}
            >
              <div className="text-sm font-semibold text-slate-800">Custom date range</div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <div className="mb-1 text-xs font-medium text-slate-600">From</div>
                  <Input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                  />
                </div>
                <div>
                  <div className="mb-1 text-xs font-medium text-slate-600">To</div>
                  <Input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    replaceParams({ range: "custom", start_date: customStart, end_date: customEnd });
                    setCustomOpen(false);
                  }}
                >
                  Apply
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </section>

      <section className="space-y-4">
        <div className="px-1">
          <div className="text-sm font-semibold text-slate-900">Key metrics</div>
          <div className="mt-1 text-sm text-slate-600">Executive snapshot</div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <SummaryStatCard title="Companies" value={loadingSummary ? "…" : String(companiesTotal)} />
          <SummaryStatCard title="Open jobs" value={loadingSummary ? "…" : String(jobsOpen)} tone="active" />
          <SummaryStatCard
            title="Candidates"
            value={loadingSummary ? "…" : String(candRegistered + candCaps + candJoc + candFree)}
          />
          <SummaryStatCard
            title="Interviews"
            value={
              loadingSummary
                ? "…"
                : String(
                    intScheduled +
                      intJoined +
                      intOnHold +
                      intRejectedEmployer +
                      intRejectedCandidate
                  )
            }
          />
          <SummaryStatCard
            title="Total income"
            value={loadingSummary ? "…" : formatCurrency(financeTotalIncome)}
            tone="success"
          />
        </div>
      </section>

      <section className="space-y-4">
        <div className="px-1">
          <div className="text-sm font-semibold text-slate-900">Status distribution</div>
          <div className="mt-1 text-sm text-slate-600">Hover for details. Click a segment to drill down.</div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <AnalyticsCard
            title="Companies"
            ctaLabel="View companies"
            onView={() => navigateTo("/companies", {})}
          >
            <DonutDistribution
              items={companiesStatusChart}
              onSelect={(it) => navigateTo("/companies", { company_status: it?.status || "" })}
            />
          </AnalyticsCard>

          <AnalyticsCard title="Jobs" ctaLabel="View jobs" onView={() => navigateTo("/jobs", {})}>
            <DonutDistribution
              items={jobsStatusChart}
              onSelect={(it) => navigateTo("/jobs", { status: it?.status || "" })}
            />
          </AnalyticsCard>

          <AnalyticsCard
            title="Candidates"
            ctaLabel="View candidates"
            onView={() => navigateTo("/candidates", {})}
          >
            <DonutDistribution
              items={candidatesStatusChart}
              onSelect={(it) => navigateTo("/candidates", { status: it?.status || "" })}
            />
          </AnalyticsCard>

          <AnalyticsCard
            title="Interviews"
            ctaLabel="View interviews"
            onView={() => navigateTo("/interviews", { ...getInterviewDateParams() })}
          >
            <DonutDistribution
              items={interviewsStatusChart}
              onSelect={(it) =>
                navigateTo("/interviews", {
                  status: it?.status || "",
                  ...getInterviewDateParams(),
                })
              }
            />
          </AnalyticsCard>
        </div>
      </section>

      <section className="rounded-2xl bg-[var(--bg-muted)] p-6 ring-1 ring-[var(--border)]">
        <div className="mb-4 text-sm font-semibold tracking-wide text-slate-700">
          Finance Summary
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              navigateTo("/payments", {
                source: "COMPANY_PAYMENT",
                ...dateParams,
                limit: 50,
              })
            }
          >
            View company payments
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              navigateTo("/payments", {
                source: "CANDIDATE_PAYMENT",
                ...dateParams,
                limit: 50,
              })
            }
          >
            View candidate payments
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              navigateTo("/payments", {
                source: "PLACEMENT_INCOME",
                ...dateParams,
                limit: 50,
              })
            }
          >
            View placement income
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              navigateTo("/payments", {
                ...dateParams,
                limit: 50,
              })
            }
          >
            View all ledger
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <FinanceTile
            title="Company Payments"
            value={financeCompanyPayments}
            loading={loadingSummary}
          />
          <FinanceTile
            title="Candidate Fees"
            value={financeCandidateFees}
            loading={loadingSummary}
          />
          <FinanceTile
            title="Placement Income"
            value={financePlacementIncome}
            loading={loadingSummary}
          />
          <FinanceTile
            title="Total Income"
            value={financeTotalIncome}
            loading={loadingSummary}
            highlight
          />
        </div>
      </section>

      <section className="rounded-2xl bg-[var(--bg)] p-6 shadow-sm ring-1 ring-[var(--border)]">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-[var(--text)]">
              Finance Trend
            </div>
            <div className="mt-1 text-sm text-slate-600">
              Monthly breakdown of income streams
            </div>
          </div>
          {loadingFinance && (
            <div className="text-sm text-slate-500">Loading chart…</div>
          )}
        </div>

        {!loadingFinance && (!financeItems || financeItems.length === 0) ? (
          <div className="rounded-xl bg-[var(--bg-muted)] p-8 text-center text-sm text-slate-600">
            No data available
          </div>
        ) : (
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={(Array.isArray(financeItems) ? financeItems : []).map((it) => ({
                  period: it?.period || "",
                  company_payments: safeNumber(it?.company_payments),
                  candidate_payments: safeNumber(it?.candidate_payments),
                  placement_income: safeNumber(it?.placement_income),
                  total: safeNumber(it?.total),
                }))}
                margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.25)" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 12, fill: "rgb(71,85,105)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "rgb(71,85,105)" }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                  tickFormatter={(v) => formatCompactCurrency(v)}
                />
                <Tooltip content={<FinanceTooltip />} />
                <Bar
                  dataKey="company_payments"
                  stackId="a"
                  fill="#2563eb"
                  radius={[6, 6, 0, 0]}
                />
                <Bar dataKey="candidate_payments" stackId="a" fill="#16a34a" />
                <Bar dataKey="placement_income" stackId="a" fill="#f59e0b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}

function safeNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatCurrency(value) {
  const amount = safeNumber(value);
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `₹${amount}`;
  }
}

function formatCompactCurrency(value) {
  const amount = safeNumber(value);
  try {
    return new Intl.NumberFormat("en-IN", {
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 1,
    }).format(amount);
  } catch {
    return String(amount);
  }
}

function SummaryStatCard({ title, value, tone }) {
  return (
    <div className="rounded-2xl bg-[var(--bg)] p-4 ring-1 ring-[var(--border)]">
      <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">{title}</div>
      <div
        className={
          tone === "success"
            ? "mt-2 text-2xl font-semibold tracking-tight text-emerald-700"
            : tone === "active"
              ? "mt-2 text-2xl font-semibold tracking-tight text-blue-700"
              : "mt-2 text-2xl font-semibold tracking-tight text-slate-900"
        }
      >
        {value}
      </div>
    </div>
  );
}

function AnalyticsCard({ title, ctaLabel, onView, children }) {
  return (
    <div className="rounded-2xl bg-[var(--bg)] p-5 ring-1 ring-[var(--border)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="mt-1 text-xs text-slate-600">Status distribution</div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onView}>
          {ctaLabel}
        </Button>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function DonutDistribution({ items, onSelect }) {
  const safeItems = Array.isArray(items) ? items : [];
  const total = safeItems.reduce((acc, it) => acc + safeNumber(it?.value), 0);
  const data = safeItems.map((it) => ({
    ...it,
    value: safeNumber(it?.value),
  }));

  return (
    <div className="grid items-center gap-4 sm:grid-cols-2">
      <div className="h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<StatusTooltip />} />
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius={52}
              outerRadius={74}
              paddingAngle={2}
              onClick={(payload) => {
                const item = payload?.payload;
                if (!item) return;
                if (onSelect) onSelect(item);
              }}
            >
              {data.map((entry) => (
                <Cell key={entry?.status || entry?.label} fill={entry?.color || "#94a3b8"} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-semibold uppercase tracking-widest text-slate-500">Total</div>
        <div className="text-2xl font-semibold tracking-tight text-slate-900">{total}</div>
        <div className="mt-2 grid gap-2">
          {data.map((it) => (
            <button
              key={it?.status || it?.label}
              type="button"
              onClick={() => onSelect && onSelect(it)}
              className="flex items-center justify-between gap-3 rounded-lg px-2 py-1 text-left transition-colors hover:bg-slate-50"
              title={`${it?.label || ""}: ${safeNumber(it?.value)}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: it?.color || "#94a3b8" }}
                />
                <span className="text-sm font-medium text-slate-700">{it?.label}</span>
              </div>
              <span className="text-sm font-semibold text-slate-900">{safeNumber(it?.value)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  return (
    <div className="rounded-xl bg-white p-3 shadow-lg ring-1 ring-slate-200">
      <div className="text-sm font-semibold text-slate-900">{row?.label || ""}</div>
      <div className="mt-2 flex items-center justify-between gap-4">
        <span className="text-sm text-slate-700">Count</span>
        <span className="text-sm font-semibold text-slate-900">{safeNumber(row?.value)}</span>
      </div>
      <div className="mt-2 text-xs text-slate-500">Click to drill down</div>
    </div>
  );
}

function FinanceTile({ title, value, loading, highlight }) {
  return (
    <div
      className={
        highlight
          ? "rounded-2xl bg-slate-900 p-5 text-white"
          : "rounded-2xl bg-[var(--bg)] p-5 ring-1 ring-[var(--border)]"
      }
    >
      <div className={highlight ? "text-sm text-slate-200" : "text-sm text-slate-600"}>
        {title}
      </div>
      <div
        className={
          highlight
            ? "mt-2 text-3xl font-semibold tracking-tight"
            : "mt-2 text-3xl font-semibold tracking-tight text-[var(--text)]"
        }
      >
        {loading ? "…" : formatCurrency(value)}
      </div>
    </div>
  );
}

function FinanceTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) return null;

  const rows = Array.isArray(payload)
    ? payload
        .map((p) => ({
          name: p?.name,
          value: safeNumber(p?.value),
          color: p?.color,
        }))
        .filter((r) => r.name)
    : [];

  const total = rows.reduce((acc, r) => acc + safeNumber(r.value), 0);

  return (
    <div className="rounded-xl bg-white p-3 shadow-lg ring-1 ring-slate-200">
      <div className="text-sm font-semibold text-slate-900">{label || ""}</div>
      <div className="mt-2 space-y-1">
        {rows.map((r) => (
          <div key={r.name} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: r.color || "#94a3b8" }}
              />
              <span className="text-sm text-slate-700">{r.name}</span>
            </div>
            <span className="text-sm font-semibold text-slate-900">
              {formatCurrency(r.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 border-t border-slate-200 pt-2">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-semibold text-slate-700">Total</span>
          <span className="text-sm font-semibold text-slate-900">
            {formatCurrency(total)}
          </span>
        </div>
      </div>
    </div>
  );
}
