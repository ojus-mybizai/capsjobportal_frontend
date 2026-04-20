// Dashboard page reconstructed cleanly
"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { api } from "@/services/api";
import { useUIStore } from "@/stores/ui";
import { useAuthStore } from "@/stores/auth";

// ---------- helpers ----------
function computeRangeDates(range) {
  const now = dayjs();
  const today = now.format("YYYY-MM-DD");
  if (range === "today") return { from: today, to: today };
  if (range === "this_week") return { from: now.startOf("week").format("YYYY-MM-DD"), to: today };
  if (range === "this_month") return { from: now.startOf("month").format("YYYY-MM-DD"), to: today };
  if (range === "till_date") return { from: "", to: today };
  if (range === "quarter") {
    const qStart = Math.floor(now.month() / 3) * 3;
    return { from: now.month(qStart).startOf("month").format("YYYY-MM-DD"), to: today };
  }
  if (range === "half_year") {
    const startMonth = now.month() < 6 ? 0 : 6;
    return { from: now.month(startMonth).startOf("month").format("YYYY-MM-DD"), to: today };
  }
  return { from: "", to: "" };
}

function safeNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatCurrency(v = 0) {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
      safeNumber(v)
    );
  } catch {
    return `₹${safeNumber(v).toFixed(0)}`;
  }
}

function formatCompactCurrency(v = 0) {
  try {
    return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(safeNumber(v));
  } catch {
    return safeNumber(v).toFixed(0);
  }
}

// ---------- small presentational components ----------
function FinanceTile({ title, value, loading, highlight, color, onClick }) {
  const bandColor = color || "var(--accent)";
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)] ${
        highlight ? "ring-1 ring-[var(--accent)]/70" : "ring-1 ring-slate-200/80"
      } ${onClick ? "cursor-pointer transition hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]" : ""}`}
    >
      <div className="flex items-center gap-2">
        <span
          className="h-1.5 w-8 rounded-full"
          style={{ backgroundColor: bandColor, boxShadow: `${bandColor}33 0px 0px 0px 4px` }}
        />
        <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{title}</div>
      </div>
      <div className="mt-3 text-2xl font-semibold text-slate-900">
        {loading ? "…" : formatCurrency(value ?? 0)}
      </div>
    </div>
  );
}

function AnalyticsCard({ title, ctaLabel, onView, children, showCopyLink = false, copyLinkData = null }) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    if (copyLinkData) {
      try {
        await navigator.clipboard.writeText(copyLinkData);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy link:', err);
      }
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-slate-200/70">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[var(--accent)] shadow-[0_0_0_4px_rgba(59,130,246,0.08)]" />
          <div className="text-sm font-semibold uppercase tracking-[0.08em] text-slate-700">{title}</div>
        </div>
        <div className="flex items-center gap-2">
          {showCopyLink && copyLinkData && (
            <button
              type="button"
              onClick={handleCopyLink}
              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 flex items-center gap-1"
            >
              {copied ? (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy Link
                </>
              )}
            </button>
          )}
          {onView ? (
            <button
              type="button"
              onClick={onView}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              {ctaLabel || "View"}
            </button>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}

function DonutDistribution({ items = [], onSelect }) {
  const total = useMemo(() => items.reduce((acc, it) => acc + safeNumber(it.value), 0), [items]);
  const data = items.map((it) => ({ ...it, value: safeNumber(it.value) }));
  return (
    <div className="flex items-center gap-4">
      <div className="h-36 w-36">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={30}
              outerRadius={55}
              paddingAngle={2}
              onClick={(payload) => onSelect?.(payload)}
            >
              {data.map((entry, idx) => (
                <Cell key={idx} fill={entry.color || "#38bdf8"} stroke="none" />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0]?.payload;
                return (
                  <div className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-100 shadow-lg ring-1 ring-slate-700">
                    <div className="font-semibold">{p?.label}</div>
                    <div>Value: {safeNumber(p?.value)}</div>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-3 rounded-xl border border-slate-200 bg-white/80 p-4 shadow-[var(--shadow-card)] backdrop-blur">
        {data.map((it) => (
          <button
            key={it.label}
            type="button"
            onClick={() => onSelect?.(it)}
            className="group flex w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-left text-sm text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50/90 hover:shadow-lg hover:ring-1 hover:ring-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            style={{
              borderColor: `${it.color || "#38bdf8"}33`,
              boxShadow: `0 8px 18px ${it.color || "#38bdf8"}22`,
            }}
          >
            <div className="flex items-center gap-3">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full ring-4 ring-[var(--accent-soft)]/70 transition group-hover:scale-110"
                style={{ backgroundColor: it.color }}
              />
              <div className="flex flex-col">
                <span className="font-semibold text-slate-900 group-hover:text-[var(--accent)]">{it.label}</span>
                <span className="text-[11px] text-slate-500 group-hover:text-slate-700">Share in mix</span>
              </div>
            </div>
            <div className="text-sm font-semibold text-[var(--accent)] group-hover:translate-x-0.5 group-hover:text-slate-900">
              {safeNumber(it.value)}
            </div>
          </button>
        ))}
        <div className="flex items-center justify-between rounded-lg border border-[var(--accent-soft)] bg-[var(--accent-soft)]/60 px-3 py-2 text-xs font-semibold text-slate-800 shadow-inner">
          <span>Total mix</span>
          <span className="text-[var(--accent)]">{safeNumber(total)}</span>
        </div>
      </div>
    </div>
  );
}

// ---------- main page ----------
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
  const setPageMetadata = useUIStore((s) => s.setPageMetadata);
  const pushToast = useUIStore((s) => s.pushToast);
  const user = useAuthStore((s) => s.user);

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingPendingDues, setLoadingPendingDues] = useState(false);
  const [summary, setSummary] = useState(null);
  const [pendingDues, setPendingDues] = useState(null);

  const rangeParam = searchParams.get("range") || "";
  const startDateParam = searchParams.get("start_date") || "";
  const endDateParam = searchParams.get("end_date") || "";
  const dateParams = {
    ...(startDateParam ? { start_date: startDateParam } : {}),
    ...(endDateParam ? { end_date: endDateParam } : {}),
  };
  const endOfMonth = dayjs().endOf("month").format("YYYY-MM-DD");
  const selectedRange = rangeParam || "this_month";
  const [dueBefore, setDueBefore] = useState(endOfMonth);

  const customRangeLabel =
    startDateParam && endDateParam ? `${startDateParam} - ${endDateParam}` : "Custom";

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

  function applyPendingDuesPayload(payload) {
    if (!payload) {
      setPendingDues(null);
      return;
    }
    const items = Array.isArray(payload.items) ? payload.items : [];
    const totals = payload.totals || {};
    setPendingDues({
      total_due: Number(totals.total_due) || 0,
      company_due: Number(totals.company_due) || 0,
      placement_income_due: Number(totals.placement_income_due) || 0,
      joc_due: Number(totals.joc_due) || 0,
      items,
    });
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
        if (preferBelowTop + popRect.height > window.innerHeight - margin) top = preferAboveTop;
        const maxTop = Math.max(margin, window.innerHeight - popRect.height - margin);
        top = Math.min(Math.max(top, margin), maxTop);
        setCustomPos({ top, left });
      } catch {
        // ignore
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
    applyRange("this_month");
  }, [rangeParam, startDateParam, endDateParam]);

  const startDateTime = startDateParam ? `${startDateParam}T00:00:00` : undefined;
  const endDateTime = endDateParam ? `${endDateParam}T23:59:59` : undefined;
  const dateKey = `${startDateParam}|${endDateParam}|${dueBefore}`;

  useEffect(() => {
    let active = true;
    async function loadAll() {
      const dueIso =
        dueBefore && dayjs(dueBefore).isValid()
          ? dayjs(dueBefore).endOf("day").toISOString()
          : dayjs().endOf("month").toISOString();
      setLoadingSummary(true);
      setLoadingPendingDues(true);
      try {
        const data = await api.get("reports/dashboard-full", {
          params: {
            ...(startDateTime ? { start_date: startDateTime } : {}),
            ...(endDateTime ? { end_date: endDateTime } : {}),
            due_before: dueIso,
          },
        });
        if (!active) return;
        setSummary(data?.summary || null);
        applyPendingDuesPayload(data?.pending_dues || null);
      } catch (error) {
        if (!active) return;
        pushToast({
          title: "Failed to load dashboard",
          description: (error && error.message) || "An error occurred while loading dashboard data.",
        });
      } finally {
        if (active) {
          setLoadingSummary(false);
          setLoadingPendingDues(false);
        }
      }
    }
    loadAll();
    return () => {
      active = false;
    };
  }, [dateKey, pushToast]);

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

  const financeCompanyFee = safeNumber(summary?.finance?.company_fee);
  const financeRegistrationFee = safeNumber(summary?.finance?.registration_fee);
  const financePlacementIncomeFee = safeNumber(summary?.finance?.placement_income_fee);
  const financeJocFee = safeNumber(summary?.finance?.joc_fee);
  const financeTotalIncome = safeNumber(summary?.finance?.total);

  const companiesStatusChart = [
    { label: "Paid", status: "PAID", value: companiesPaid, color: "#16a34a" },
    { label: "Free", status: "FREE", value: companiesFree, color: "#64748b" },
  ];

  const jobsStatusChart = [
    { label: "Open", status: "OPEN", value: jobsOpen, color: "#60a5fa" },
    { label: "Fulfilled", status: "FULFILLED", value: jobsFulfilled, color: "#34d399" },
    { label: "Dropped", status: "DROPPED", value: jobsDropped, color: "#f87171" },
  ];

  const candidatesStatusChart = [
    { label: "Registered", status: "REGISTERED", value: candRegistered, color: "#60a5fa" },
    { label: "CAPS", status: "CAPS", value: candCaps, color: "#34d399" },
    { label: "JOC", status: "JOC", value: candJoc, color: "#fbbf24" },
    { label: "Free", status: "FREE", value: candFree, color: "#cbd5e1" },
  ];

  const interviewsStatusChart = [
    { label: "Scheduled", status: "SCHEDULED", value: intScheduled, color: "#60a5fa" },
    { label: "Joined", status: "JOINED", value: intJoined, color: "#34d399" },
    { label: "On hold", status: "ON_HOLD", value: intOnHold, color: "#fbbf24" },
    { label: "Rejected (Employer)", status: "REJECTED_BY_EMPLOYER", value: intRejectedEmployer, color: "#f87171" },
    { label: "Rejected (Candidate)", status: "REJECTED_BY_CANDIDATE", value: intRejectedCandidate, color: "#fb7185" },
  ];

  function getInterviewDateParams() {
    return {
      ...(dateParams.start_date ? { start_date: dateParams.start_date } : {}),
      ...(dateParams.end_date ? { end_date: dateParams.end_date } : {}),
    };
  }

  function navigateTo(path, extras) {
    const params = new URLSearchParams();
    Object.entries({ ...extras, ...dateParams }).forEach(([k, v]) => {
      if (v != null && v !== "") params.set(k, v);
    });
    const qs = params.toString();
    router.push(qs ? `${path}?${qs}` : path);
  }

  function applyCustomRange() {
    if (!customStart || !customEnd) return;
    replaceParams({ range: "custom", start_date: customStart, end_date: customEnd });
    setCustomOpen(false);
  }

  return (
    <div className="min-h-screen space-y-9  px-1 pb-10">
      <div className="px-1">
        <div className="text-[26px] font-semibold tracking-tight text-slate-900">
          CAPS Tally Jobs
        </div>
        <p className="mt-1 text-sm text-slate-600">
          A quick pulse across jobs, companies, candidates, and revenue.
        </p>
      </div>

      {/* Date range + status distribution */}
      <section className="rounded-2xl bg-white/90 p-7 shadow-[var(--shadow-card)] ring-1 ring-slate-200/80 text-slate-900 backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-base font-semibold text-slate-900">Date range</div>
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <div className="inline-flex rounded-xl bg-slate-100 p-1 ring-1 ring-slate-200">
                <button
                  type="button"
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                    selectedRange === "today"
                      ? "text-white shadow-sm"
                      : "text-slate-800"
                  }`}
                  style={{
                    backgroundColor: selectedRange === "today" ? "var(--accent)" : "transparent",
                    boxShadow: selectedRange === "today" ? "0 6px 14px -6px var(--accent)" : "none",
                  }}
                  onClick={() => {
                    setCustomOpen(false);
                    applyRange("today");
                  }}
                >
                  Today
                </button>
                <button
                  type="button"
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                    selectedRange === "this_week"
                      ? "text-white shadow-sm"
                      : "text-slate-800"
                  }`}
                  style={{
                    backgroundColor: selectedRange === "this_week" ? "var(--accent)" : "transparent",
                    boxShadow: selectedRange === "this_week" ? "0 6px 14px -6px var(--accent)" : "none",
                  }}
                  onClick={() => {
                    setCustomOpen(false);
                    applyRange("this_week");
                  }}
                >
                  Week
                </button>
                <button
                  type="button"
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                    selectedRange === "this_month"
                      ? "text-white shadow-sm"
                      : "text-slate-800"
                  }`}
                  style={{
                    backgroundColor: selectedRange === "this_month" ? "var(--accent)" : "transparent",
                    boxShadow: selectedRange === "this_month" ? "0 6px 14px -6px var(--accent)" : "none",
                  }}
                  onClick={() => {
                    setCustomOpen(false);
                    applyRange("this_month");
                  }}
                >
                  Month
                </button>
                <button
                  type="button"
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                    selectedRange === "till_date"
                      ? "text-white shadow-sm"
                      : "text-slate-800"
                  }`}
                  style={{
                    backgroundColor: selectedRange === "till_date" ? "var(--accent)" : "transparent",
                    boxShadow: selectedRange === "till_date" ? "0 6px 14px -6px var(--accent)" : "none",
                  }}
                  onClick={() => {
                    setCustomOpen(false);
                    applyRange("till_date");
                  }}
                >
                  Till date
                </button>
                <button
                  type="button"
                  ref={rangeAnchorRef}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                    selectedRange === "custom"
                      ? "text-white shadow-sm"
                      : "text-slate-800"
                  }`}
                  style={{
                    backgroundColor: selectedRange === "custom" ? "var(--accent)" : "transparent",
                    boxShadow: selectedRange === "custom" ? "0 6px 14px -6px var(--accent)" : "none",
                  }}
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
                <div
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 ring-1 ring-slate-200"
                  onClick={openCustomPicker}
                >
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    {customRangeLabel}
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-base font-semibold text-slate-900">Status distribution</div>
          <div className="mt-1 text-sm text-slate-500">Hover for details. Click a segment to drill down.</div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <AnalyticsCard 
            title="Companies" 
            ctaLabel="View companies" 
            onView={() => navigateTo("/companies", {})}
            showCopyLink={true}
            copyLinkData={`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/public/add-company?user_id=${user?.id || ''}`}
          >
            <DonutDistribution
              items={companiesStatusChart}
              onSelect={(it) => navigateTo("/companies", { company_status: it?.status || "" })}
            />
          </AnalyticsCard>

          <AnalyticsCard title="Jobs" ctaLabel="View jobs" onView={() => navigateTo("/jobs", {})}>
            <DonutDistribution items={jobsStatusChart} onSelect={(it) => navigateTo("/jobs", { status: it?.status || "" })} />
          </AnalyticsCard>

          <AnalyticsCard title="Candidates" ctaLabel="View candidates" onView={() => navigateTo("/candidates", {})}>
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
                navigateTo("/interviews", { status: it?.status || "", ...getInterviewDateParams() })
              }
            />
          </AnalyticsCard>
        </div>

        {customOpen ? (
          <div
            ref={popoverRef}
            style={{ top: customPos.top, left: customPos.left, position: "fixed", zIndex: 50 }}
            className="w-[320px] rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-2xl"
          >
            <div className="mb-3 text-sm font-semibold text-slate-100">Custom range</div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-slate-400" htmlFor="customStart">
                  Start date
                </label>
                <Input
                  id="customStart"
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full rounded-lg border-slate-800 bg-slate-800/80 text-slate-100"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400" htmlFor="customEnd">
                  End date
                </label>
                <Input
                  id="customEnd"
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full rounded-lg border-slate-800 bg-slate-800/80 text-slate-100"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setCustomOpen(false)}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={applyCustomRange}>
                Apply
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      {/* Finance summary + pending dues */}
      <section className="rounded-2xl bg-gradient-to-br from-slate-50 via-white to-slate-100 p-7 shadow-[var(--shadow-card)] ring-1 ring-slate-200/80 text-slate-900">
        <div className="mb-4 text-base font-semibold tracking-wide text-slate-900">
          Finance Summary
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <FinanceTile
            title="Company Fee"
            value={financeCompanyFee}
            loading={loadingSummary}
            color="#f97316"
            onClick={() => navigateTo("/payments", { source: "COMPANY_PAYMENT", limit: 50 })}
          />
          <FinanceTile
            title="Placement Income"
            value={financePlacementIncomeFee}
            loading={loadingSummary}
            color="#6366f1"
            onClick={() => navigateTo("/payments", { source: "PLACEMENT_INCOME", limit: 50 })}
          />
          <FinanceTile
            title="JOC Fee"
            value={financeJocFee}
            loading={loadingSummary}
            color="#fbbf24"
            onClick={() => navigateTo("/candidates", { status: "JOC" })}
          />
          <FinanceTile
            title="Registration Fee"
            value={financeRegistrationFee}
            loading={loadingSummary}
            color="#10b981"
            onClick={() => navigateTo("/payments", { source: "CANDIDATE_PAYMENT", limit: 50 })}
          />
          <FinanceTile
            title="Total Income"
            value={financeTotalIncome}
            loading={loadingSummary}
            color="#0f172a"
            highlight
            onClick={() => navigateTo("/payments", { limit: 50 })}
          />
        </div>
      </section>

      {/* Pending dues KPIs (table removed per request) */}
      <section className="rounded-2xl bg-white/90 p-7 shadow-[var(--shadow-card)] ring-1 ring-slate-200/80 text-slate-900 backdrop-blur">
        <div className="mb-6 grid gap-4 lg:grid-cols-[1.1fr_1fr] lg:items-start">
          <div className="space-y-1">
            <div className="text-base font-semibold text-slate-900">Pending dues</div>
            <div className="text-sm text-slate-500">Quick totals—table removed as requested</div>
          </div>
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-3 shadow-sm lg:justify-end">
            <label className="text-xs font-semibold text-slate-600" htmlFor="dueBefore">
              Due before
            </label>
            <Input
              id="dueBefore"
              type="date"
              value={dueBefore}
              onChange={(e) => setDueBefore(e.target.value)}
              className="w-48 rounded-lg border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[var(--accent)] focus:bg-white"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FinanceTile
            title="Company Due"
            value={pendingDues?.company_due}
            loading={loadingPendingDues}
            color="#f97316"
            onClick={() => navigateTo("/companies", { company_status: "PAID" })}
          />
          <FinanceTile
            title="Placement Income Due"
            value={pendingDues?.placement_income_due}
            loading={loadingPendingDues}
            color="#6366f1"
            onClick={() => navigateTo("/payments/pending", { due_before: dueBefore, source: "PLACEMENT_INCOME_PENDING" })}
          />
          <FinanceTile
            title="JOC Due"
            value={pendingDues?.joc_due}
            loading={loadingPendingDues}
            color="#fbbf24"
            onClick={() => navigateTo("/candidates", { status: "JOC" })}
          />
          <FinanceTile
            title="Total Due"
            value={pendingDues?.total_due}
            loading={loadingPendingDues}
            color="#f43f5e"
            highlight
            onClick={() => navigateTo("/payments/pending", { due_before: dueBefore })}
          />
        </div>
      </section>

    </div>
  );
}
