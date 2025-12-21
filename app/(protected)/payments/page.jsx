"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import { useUIStore } from "@/stores/ui";
import { paymentsLedger } from "@/services/payments";
import { listCompanies, getCompany } from "@/services/companies";
import { listJobs, getJob } from "@/services/jobs";
import { listCandidates, getCandidate } from "@/services/candidates";
import { createCompanyPayment } from "@/services/companies";
import { createCandidatePayment } from "@/services/candidates";
import { listInterviews, getInterview } from "@/services/interviews";
import {
  createPlacementIncome,
  createPlacementIncomePayment,
  getPlacementIncome,
  listPlacementIncomes,
} from "@/services/placementIncomes";
import PaginatedTable from "@/components/table/PaginatedTable";
import AsyncSearchSelect from "@/components/ui/AsyncSearchSelect";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";

const SOURCE_OPTIONS = [
  { value: "COMPANY_PAYMENT", label: "Company payment" },
  { value: "CANDIDATE_PAYMENT", label: "Candidate payment" },
  { value: "PLACEMENT_INCOME", label: "Placement income" },
];

const LIMIT_OPTIONS = [20, 50, 100];

function toArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.data)) return payload.data;
  }
  return [];
}

function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatCurrency(value) {
  const amount = safeNumber(value, 0);
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

function buildDisplayTitle(row) {
  const source = row?.source;
  if (source === "COMPANY_PAYMENT") return row?.company_name || "-";
  if (source === "CANDIDATE_PAYMENT") return row?.candidate_name || "-";
  if (source === "PLACEMENT_INCOME") {
    const parts = [row?.company_name, row?.job_title, row?.candidate_name].filter(Boolean);
    return parts.length ? parts.join(" - ") : "-";
  }
  return "-";
}

export default function PaymentsPage() {
  return (
    <Suspense>
      <PaymentsPageInner />
    </Suspense>
  );
}

function PaymentsPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setPageMetadata = useUIStore((state) => state.setPageMetadata);
  const pushToast = useUIStore((state) => state.pushToast);

  const pageParamRaw = searchParams.get("page");
  const page = pageParamRaw ? Math.max(1, Number(pageParamRaw) || 1) : 1;

  const limitParamRaw = searchParams.get("limit");
  const limit = limitParamRaw
    ? Math.min(100, Math.max(1, Number(limitParamRaw) || 20))
    : 20;

  const startDateParam = searchParams.get("start_date") || "";
  const endDateParam = searchParams.get("end_date") || "";

  const sourcesParam = (() => {
    try {
      const all = searchParams.getAll("source");
      return Array.isArray(all) ? all.filter(Boolean) : [];
    } catch {
      const s = searchParams.get("source") || "";
      return s ? [s] : [];
    }
  })();

  const companyIdParam = searchParams.get("company_id") || "";
  const candidateIdParam = searchParams.get("candidate_id") || "";
  const jobIdParam = searchParams.get("job_id") || "";

  const minAmountParam = searchParams.get("min_amount") || "";
  const maxAmountParam = searchParams.get("max_amount") || "";

  const includeInactiveParam = (searchParams.get("include_inactive") || "").toLowerCase();
  const includeInactive = includeInactiveParam === "true" || includeInactiveParam === "1";

  const [refreshTick, setRefreshTick] = useState(0);

  const filtersKey = useMemo(() => {
    return [
      page,
      limit,
      startDateParam,
      endDateParam,
      sourcesParam.join(","),
      companyIdParam,
      candidateIdParam,
      jobIdParam,
      minAmountParam,
      maxAmountParam,
      includeInactive ? "1" : "0",
      refreshTick,
    ].join("|");
  }, [
    page,
    limit,
    startDateParam,
    endDateParam,
    sourcesParam,
    companyIdParam,
    candidateIdParam,
    jobIdParam,
    minAmountParam,
    maxAmountParam,
    includeInactive,
    refreshTick,
  ]);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addType, setAddType] = useState("COMPANY_PAYMENT");
  const [savingPayment, setSavingPayment] = useState(false);

  const [companyPaymentCompanyId, setCompanyPaymentCompanyId] = useState("");
  const [companyPaymentAmount, setCompanyPaymentAmount] = useState("");
  const [companyPaymentDate, setCompanyPaymentDate] = useState("");

  const [candidatePaymentCandidateId, setCandidatePaymentCandidateId] = useState("");
  const [candidatePaymentAmount, setCandidatePaymentAmount] = useState("");
  const [candidatePaymentDate, setCandidatePaymentDate] = useState("");
  const [candidatePaymentRemarks, setCandidatePaymentRemarks] = useState("");

  const [placementIncomeInterviewId, setPlacementIncomeInterviewId] = useState("");
  const [placementIncomeCandidateId, setPlacementIncomeCandidateId] = useState("");
  const [placementIncomeJobId, setPlacementIncomeJobId] = useState("");
  const [placementIncomeLinkedToInterview, setPlacementIncomeLinkedToInterview] = useState(false);
  const [placementIncomeTotalReceivable, setPlacementIncomeTotalReceivable] = useState("");
  const [placementIncomeDueDate, setPlacementIncomeDueDate] = useState("");
  const [placementIncomeRemarks, setPlacementIncomeRemarks] = useState("");

  const [incomePaymentIncomeId, setIncomePaymentIncomeId] = useState("");
  const [incomePaymentAmount, setIncomePaymentAmount] = useState("");
  const [incomePaymentPaidDate, setIncomePaymentPaidDate] = useState("");
  const [incomePaymentRemarks, setIncomePaymentRemarks] = useState("");

  const [companyLabelMap, setCompanyLabelMap] = useState({});
  const [jobLabelMap, setJobLabelMap] = useState({});
  const [candidateLabelMap, setCandidateLabelMap] = useState({});
  const [interviewLabelMap, setInterviewLabelMap] = useState({});
  const [incomeLabelMap, setIncomeLabelMap] = useState({});

  const companyLabelMapRef = useRef(companyLabelMap);
  const jobLabelMapRef = useRef(jobLabelMap);
  const candidateLabelMapRef = useRef(candidateLabelMap);
  const interviewLabelMapRef = useRef(interviewLabelMap);
  const incomeLabelMapRef = useRef(incomeLabelMap);

  useEffect(() => {
    companyLabelMapRef.current = companyLabelMap;
  }, [companyLabelMap]);

  useEffect(() => {
    jobLabelMapRef.current = jobLabelMap;
  }, [jobLabelMap]);

  useEffect(() => {
    candidateLabelMapRef.current = candidateLabelMap;
  }, [candidateLabelMap]);

  useEffect(() => {
    interviewLabelMapRef.current = interviewLabelMap;
  }, [interviewLabelMap]);

  useEffect(() => {
    incomeLabelMapRef.current = incomeLabelMap;
  }, [incomeLabelMap]);

  useEffect(() => {
    setPageMetadata("Payments", "Unified payment ledger");
  }, [setPageMetadata]);

  function setParam(key, value, { resetPage = true } = {}) {
    const params = new URLSearchParams(searchParams.toString());

    if (value == null || value === "") params.delete(key);
    else params.set(key, String(value));

    if (resetPage) params.set("page", "1");

    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function openAddPayment() {
    setAddModalOpen(true);
    setSavingPayment(false);
    setAddType("COMPANY_PAYMENT");

    setCompanyPaymentCompanyId(companyIdParam || "");
    setCompanyPaymentAmount("");
    setCompanyPaymentDate("");

    setCandidatePaymentCandidateId(candidateIdParam || "");
    setCandidatePaymentAmount("");
    setCandidatePaymentDate("");
    setCandidatePaymentRemarks("");

    setPlacementIncomeInterviewId("");
    setPlacementIncomeLinkedToInterview(false);
    setPlacementIncomeCandidateId(candidateIdParam || "");
    setPlacementIncomeJobId(jobIdParam || "");
    setPlacementIncomeTotalReceivable("");
    setPlacementIncomeDueDate("");
    setPlacementIncomeRemarks("");

    setIncomePaymentIncomeId("");
    setIncomePaymentAmount("");
    setIncomePaymentPaidDate("");
    setIncomePaymentRemarks("");
  }

  async function handlePlacementIncomeInterviewChange(next) {
    const interviewId = String(next || "").trim();
    setPlacementIncomeInterviewId(interviewId);

    if (!interviewId) {
      setPlacementIncomeLinkedToInterview(false);
      return;
    }

    try {
      const it = await getInterview(interviewId);
      const status = it?.status != null ? String(it.status).toUpperCase() : "";
      if (status !== "JOINED") {
        setPlacementIncomeLinkedToInterview(false);
        return;
      }

      const cid = it?.candidate_id != null ? String(it.candidate_id) : "";
      const jid = it?.job_id != null ? String(it.job_id) : "";

      if (cid) setPlacementIncomeCandidateId(cid);
      if (jid) setPlacementIncomeJobId(jid);

      setPlacementIncomeLinkedToInterview(!!cid || !!jid);
    } catch {
      setPlacementIncomeLinkedToInterview(false);
    }
  }

  async function loadCompanyOptions({ query, limit }) {
    const result = await listCompanies({
      page: 1,
      limit: limit || 20,
      q: (query || "").trim() || undefined,
    });

    const items = Array.isArray(result?.items)
      ? result.items
      : Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result)
      ? result
      : [];

    return includeInactive
      ? items
      : items.filter((it) => (it && it.is_active != null ? !!it.is_active : true));
  }

  function getCompanyOptionLabel(item) {
    if (!item) return "";
    return item.name || item.title || item.company_name || item.label || "";
  }

  function getCompanyOptionValue(item) {
    if (!item) return "";
    return item.uuid != null
      ? String(item.uuid)
      : item.company_uuid != null
      ? String(item.company_uuid)
      : item.id != null
      ? String(item.id)
      : item.value != null
      ? String(item.value)
      : "";
  }

  async function resolveCompanyLabel({ value }) {
    if (!value) return "";
    const cached = companyLabelMapRef.current[String(value)];
    if (cached) return cached;
    try {
      const c = await getCompany(value);
      const label = c?.name || c?.title || c?.company_name || `Company #${value}`;
      setCompanyLabelMap((prev) => ({ ...prev, [String(value)]: label }));
      return label;
    } catch {
      return "";
    }
  }

  async function loadJobOptions({ query, limit }) {
    const result = await listJobs({
      page: 1,
      limit: limit || 20,
      q: (query || "").trim() || undefined,
    });

    const items = Array.isArray(result?.items)
      ? result.items
      : Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result)
      ? result
      : [];

    return items;
  }

  function getJobOptionLabel(item) {
    if (!item) return "";
    return item.title || item.name || item.label || "";
  }

  function getJobOptionValue(item) {
    if (!item) return "";
    return item.uuid != null
      ? String(item.uuid)
      : item.job_uuid != null
      ? String(item.job_uuid)
      : item.id != null
      ? String(item.id)
      : item.value != null
      ? String(item.value)
      : "";
  }

  async function resolveJobLabel({ value }) {
    if (!value) return "";
    const cached = jobLabelMapRef.current[String(value)];
    if (cached) return cached;
    try {
      const j = await getJob(value);
      const label = j?.title || j?.name || `Job #${value}`;
      setJobLabelMap((prev) => ({ ...prev, [String(value)]: label }));
      return label;
    } catch {
      return "";
    }
  }

  async function loadCandidateOptions({ query, limit }) {
    const result = await listCandidates({
      page: 1,
      limit: limit || 20,
      q: (query || "").trim() || undefined,
    });

    const items = Array.isArray(result?.items)
      ? result.items
      : Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result)
      ? result
      : [];

    return items;
  }

  function getCandidateOptionLabel(item) {
    if (!item) return "";
    return item.full_name || item.name || item.candidate_name || item.label || "";
  }

  function getCandidateOptionValue(item) {
    if (!item) return "";
    return item.uuid != null
      ? String(item.uuid)
      : item.candidate_uuid != null
      ? String(item.candidate_uuid)
      : item.id != null
      ? String(item.id)
      : item.value != null
      ? String(item.value)
      : "";
  }

  async function resolveCandidateLabel({ value }) {
    if (!value) return "";
    const cached = candidateLabelMapRef.current[String(value)];
    if (cached) return cached;
    try {
      const c = await getCandidate(value);
      const label = c?.full_name || c?.name || c?.candidate_name || `Candidate #${value}`;
      setCandidateLabelMap((prev) => ({ ...prev, [String(value)]: label }));
      return label;
    } catch {
      return "";
    }
  }

  async function loadInterviewOptions({ query, limit }) {
    const params = {
      page: 1,
      limit: limit || 20,
      q: (query || "").trim() || undefined,
    };

    if (addType === "PLACEMENT_INCOME") {
      params.status = "JOINED";
      if (placementIncomeCandidateId) params.candidate_id = placementIncomeCandidateId;
      if (placementIncomeJobId) params.job_id = placementIncomeJobId;
    }

    const result = await listInterviews(params);
    const items = Array.isArray(result?.items)
      ? result.items
      : Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result)
      ? result
      : [];
    return items;
  }

  function getInterviewOptionLabel(item) {
    if (!item) return "";
    const id = item.id != null ? String(item.id) : item.value != null ? String(item.value) : "";
    const status = item.status ? String(item.status) : "";
    const parts = [item.candidate_name, item.job_title].filter(Boolean);
    const base = parts.length ? parts.join(" - ") : "Interview";
    return status ? `${base} - ${status} (${id})` : id ? `${base} (${id})` : base;
  }

  function getInterviewOptionValue(item) {
    if (!item) return "";
    return item.uuid != null
      ? String(item.uuid)
      : item.interview_id != null
      ? String(item.interview_id)
      : item.id != null
      ? String(item.id)
      : item.value != null
      ? String(item.value)
      : "";
  }

  async function resolveInterviewLabel({ value }) {
    if (!value) return "";
    const cached = interviewLabelMapRef.current[String(value)];
    if (cached) return cached;
    try {
      const it = await getInterview(value);
      const status = it?.status ? String(it.status) : "";
      const label = status ? `${status} (${value})` : `Interview ${value}`;
      setInterviewLabelMap((prev) => ({ ...prev, [String(value)]: label }));
      return label;
    } catch {
      return "";
    }
  }

  async function loadPlacementIncomeOptions({ query, limit }) {
    const result = await listPlacementIncomes({
      page: 1,
      limit: limit || 50,
      candidate_id: candidateIdParam || undefined,
      job_id: jobIdParam || undefined,
    });
    const items = Array.isArray(result?.items)
      ? result.items
      : Array.isArray(result?.data)
      ? result.data
      : Array.isArray(result)
      ? result
      : [];

    try {
      const companyIds = new Set();
      const jobIds = new Set();
      const candidateIds = new Set();

      items.forEach((it) => {
        const companyId =
          it?.company_uuid != null
            ? String(it.company_uuid)
            : it?.company_id != null
            ? String(it.company_id)
            : it?.company?.uuid != null
            ? String(it.company.uuid)
            : it?.company?.id != null
            ? String(it.company.id)
            : "";
        const jobId =
          it?.job_uuid != null
            ? String(it.job_uuid)
            : it?.job_id != null
            ? String(it.job_id)
            : it?.job?.uuid != null
            ? String(it.job.uuid)
            : it?.job?.id != null
            ? String(it.job.id)
            : "";
        const candidateId =
          it?.candidate_uuid != null
            ? String(it.candidate_uuid)
            : it?.candidate_id != null
            ? String(it.candidate_id)
            : it?.candidate?.uuid != null
            ? String(it.candidate.uuid)
            : it?.candidate?.id != null
            ? String(it.candidate.id)
            : "";
        if (companyId && !companyLabelMapRef.current[companyId]) companyIds.add(companyId);
        if (jobId && !jobLabelMapRef.current[jobId]) jobIds.add(jobId);
        if (candidateId && !candidateLabelMapRef.current[candidateId]) candidateIds.add(candidateId);
      });

      await Promise.allSettled([
        ...Array.from(companyIds).map(async (id) => {
          const c = await getCompany(id);
          const label = getCompanyOptionLabel(c) || `Company #${id}`;
          setCompanyLabelMap((prev) => ({ ...prev, [String(id)]: label }));
        }),
        ...Array.from(jobIds).map(async (id) => {
          const j = await getJob(id);
          const label = getJobOptionLabel(j) || `Job #${id}`;
          setJobLabelMap((prev) => ({ ...prev, [String(id)]: label }));
        }),
        ...Array.from(candidateIds).map(async (id) => {
          const c = await getCandidate(id);
          const label = getCandidateOptionLabel(c) || `Candidate #${id}`;
          setCandidateLabelMap((prev) => ({ ...prev, [String(id)]: label }));
        }),
      ]);
    } catch {
      // ignore
    }

    const q = String(query || "").trim().toLowerCase();

    return items
      .filter((it) => {
        const balance = typeof it?.balance === "number" ? it.balance : null;
        const totalReceivable = typeof it?.total_receivable === "number" ? it.total_receivable : null;
        const totalReceived = typeof it?.total_received === "number" ? it.total_received : null;

        if (addType === "PLACEMENT_INCOME_PAYMENT") {
          if (balance != null) return balance > 0;
          if (totalReceivable != null && totalReceived != null) return totalReceivable - totalReceived > 0;
        }

        return true;
      })
      .filter((it) => {
        if (!q) return true;
        const label = getPlacementIncomeOptionLabel(it);
        return String(label || "").toLowerCase().includes(q);
      });
  }

  function getPlacementIncomeOptionLabel(item) {
    if (!item) return "";
    const id = item.id != null ? String(item.id) : item.value != null ? String(item.value) : "";
    const companyId =
      item?.company_uuid != null
        ? String(item.company_uuid)
        : item?.company_id != null
        ? String(item.company_id)
        : item?.company?.uuid != null
        ? String(item.company.uuid)
        : item?.company?.id != null
        ? String(item.company.id)
        : "";
    const jobId =
      item?.job_uuid != null
        ? String(item.job_uuid)
        : item?.job_id != null
        ? String(item.job_id)
        : item?.job?.uuid != null
        ? String(item.job.uuid)
        : item?.job?.id != null
        ? String(item.job.id)
        : "";
    const candidateId =
      item?.candidate_uuid != null
        ? String(item.candidate_uuid)
        : item?.candidate_id != null
        ? String(item.candidate_id)
        : item?.candidate?.uuid != null
        ? String(item.candidate.uuid)
        : item?.candidate?.id != null
        ? String(item.candidate.id)
        : "";
    const companyName =
      item.company_name ||
      item?.company?.name ||
      item?.company?.company_name ||
      (companyId ? companyLabelMapRef.current[String(companyId)] : "") ||
      (companyId ? `Company #${String(companyId)}` : "");
    const jobTitle =
      item.job_title ||
      item?.job?.title ||
      item?.job?.name ||
      (jobId ? jobLabelMapRef.current[String(jobId)] : "") ||
      (jobId ? `Job #${String(jobId)}` : "");
    const candidateName =
      item.candidate_name ||
      item?.candidate?.full_name ||
      item?.candidate?.name ||
      (candidateId ? candidateLabelMapRef.current[String(candidateId)] : "") ||
      (candidateId ? `Candidate #${String(candidateId)}` : "");

    const parts = [companyName, jobTitle, candidateName].filter(Boolean);
    const base = parts.length ? parts.join(" - ") : "Placement income";
    return `${base} (${id || "-"})`;
  }

  function getPlacementIncomeOptionValue(item) {
    if (!item) return "";
    return item.id != null ? String(item.id) : item.value != null ? String(item.value) : "";
  }

  async function resolvePlacementIncomeLabel({ value }) {
    if (!value) return "";
    const cached = incomeLabelMapRef.current[String(value)];
    if (cached) return cached;
    try {
      const it = await getPlacementIncome(value);
      const companyName = it?.company_name || it?.company?.name || it?.company?.company_name || "";
      const jobTitle = it?.job_title || it?.job?.title || it?.job?.name || "";
      const candidateName = it?.candidate_name || it?.candidate?.full_name || it?.candidate?.name || "";
      const parts = [companyName, jobTitle, candidateName].filter(Boolean);
      const base = parts.length ? parts.join(" - ") : "Placement income";
      const label = `${base} (${value})`;
      setIncomeLabelMap((prev) => ({ ...prev, [String(value)]: label }));
      return label;
    } catch {
      return "";
    }
  }

  async function handleSubmitPayment() {
    if (savingPayment) return;
    setSavingPayment(true);
    try {
      if (addType === "COMPANY_PAYMENT") {
        const companyId = String(companyPaymentCompanyId || "").trim();
        const amount = Number(companyPaymentAmount);
        const paymentDate = String(companyPaymentDate || "").trim();
        if (!companyId) throw new Error("Company is required");
        if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be greater than 0");
        if (!paymentDate) throw new Error("Payment date is required");
        await createCompanyPayment(companyId, {
          amount: Math.floor(amount),
          payment_date: paymentDate,
        });
      } else if (addType === "CANDIDATE_PAYMENT") {
        const candidateId = String(candidatePaymentCandidateId || "").trim();
        const amount = Number(candidatePaymentAmount);
        const paymentDate = String(candidatePaymentDate || "").trim();
        const remarks = String(candidatePaymentRemarks || "").trim();
        if (!candidateId) throw new Error("Candidate is required");
        if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be greater than 0");
        if (!paymentDate) throw new Error("Payment date is required");
        await createCandidatePayment(candidateId, {
          amount: Math.floor(amount),
          payment_date: paymentDate,
          remarks: remarks || undefined,
        });
      } else if (addType === "PLACEMENT_INCOME") {
        const interviewId = String(placementIncomeInterviewId || "").trim();
        const candidateId = String(placementIncomeCandidateId || "").trim();
        const jobId = String(placementIncomeJobId || "").trim();
        const totalReceivable = Number(placementIncomeTotalReceivable);
        const dueDate = String(placementIncomeDueDate || "").trim();
        const remarks = String(placementIncomeRemarks || "").trim();
        if (!interviewId) throw new Error("Interview is required");
        if (!candidateId) throw new Error("Candidate is required");
        if (!jobId) throw new Error("Job is required");

        try {
          const it = await getInterview(interviewId);
          const status = it?.status != null ? String(it.status).toUpperCase() : "";
          if (status !== "JOINED") {
            throw new Error("Only JOINED interviews can be used to create placement income");
          }
          const itCandidateId = it?.candidate_id != null ? String(it.candidate_id) : "";
          const itJobId = it?.job_id != null ? String(it.job_id) : "";
          if (itCandidateId && itCandidateId !== candidateId) {
            throw new Error("Selected candidate does not match the interview");
          }
          if (itJobId && itJobId !== jobId) {
            throw new Error("Selected job does not match the interview");
          }
        } catch (error) {
          throw error;
        }

        if (!Number.isFinite(totalReceivable) || totalReceivable <= 0) {
          throw new Error("Total receivable must be greater than 0");
        }
        if (!dueDate) throw new Error("Due date is required");
        await createPlacementIncome({
          interview_id: interviewId,
          candidate_id: candidateId,
          job_id: jobId,
          total_receivable: Math.floor(totalReceivable),
          due_date: dueDate,
          remarks: remarks || undefined,
        });
      } else if (addType === "PLACEMENT_INCOME_PAYMENT") {
        const incomeId = String(incomePaymentIncomeId || "").trim();
        const amount = Number(incomePaymentAmount);
        const paidDate = String(incomePaymentPaidDate || "").trim();
        const remarks = String(incomePaymentRemarks || "").trim();
        if (!incomeId) throw new Error("Placement income is required");
        if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be greater than 0");
        if (!paidDate) throw new Error("Paid date is required");

        try {
          const income = await getPlacementIncome(incomeId);
          const balance = typeof income?.balance === "number" ? income.balance : null;
          if (balance != null && amount > balance) {
            throw new Error("Amount cannot be greater than the outstanding balance");
          }
          if (balance != null && balance <= 0) {
            throw new Error("This placement income has no outstanding balance");
          }
        } catch (error) {
          throw error;
        }

        await createPlacementIncomePayment(incomeId, {
          amount: Math.floor(amount),
          paid_date: paidDate,
          remarks: remarks || undefined,
        });
      }

      setAddModalOpen(false);
      setRefreshTick(Date.now());
    } catch (error) {
      pushToast({
        title: "Failed to create payment",
        description:
          (error && error.message) || "An error occurred while creating the payment.",
      });
    } finally {
      setSavingPayment(false);
    }
  }

  function setSources(nextSources) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("source");

    const safeSources = Array.isArray(nextSources) ? nextSources.filter(Boolean) : [];
    safeSources.forEach((s) => params.append("source", String(s)));

    params.set("page", "1");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString());
    [
      "page",
      "limit",
      "source",
      "start_date",
      "end_date",
      "company_id",
      "candidate_id",
      "job_id",
      "min_amount",
      "max_amount",
      "include_inactive",
    ].forEach((k) => params.delete(k));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const result = await paymentsLedger({
          page,
          limit,
          source: sourcesParam.length ? sourcesParam : undefined,
          start_date: startDateParam || undefined,
          end_date: endDateParam || undefined,
          company_id: companyIdParam || undefined,
          candidate_id: candidateIdParam || undefined,
          job_id: jobIdParam || undefined,
          min_amount: minAmountParam !== "" ? Number(minAmountParam) : undefined,
          max_amount: maxAmountParam !== "" ? Number(maxAmountParam) : undefined,
          include_inactive: includeInactive ? true : undefined,
        });
        if (!active) return;

        const rows = toArray(result);
        const totalCount =
          typeof result?.total === "number"
            ? result.total
            : typeof result?.count === "number"
            ? result.count
            : rows.length;

        setItems(rows);
        setTotal(totalCount);
      } catch (error) {
        if (!active) return;
        pushToast({
          title: "Failed to load payments ledger",
          description:
            (error && error.message) || "An error occurred while loading payments ledger data.",
        });
        setItems([]);
        setTotal(0);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [filtersKey, pushToast]);

  const columns = useMemo(() => {
    return [
      {
        key: "display",
        label: "Payment",
        render: (_value, row) => {
          const title = buildDisplayTitle(row);
          const id = row?.id ? String(row.id) : "";
          return (
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-900">{title}</div>
              <div className="text-[11px] text-slate-500">{id || "-"}</div>
            </div>
          );
        },
      },
      {
        key: "source",
        label: "Source",
        render: (value) => value || "-",
      },
      {
        key: "payment_date",
        label: "Payment date",
        render: (value) => {
          if (!value) return "-";
          try {
            return dayjs(value).format("YYYY-MM-DD HH:mm");
          } catch {
            return String(value);
          }
        },
      },
      {
        key: "amount",
        label: "Amount",
        render: (value) => formatCurrency(value),
      },
      {
        key: "is_active",
        label: "Active",
        render: (value) => (value === false ? "No" : "Yes"),
      },
      {
        key: "remarks",
        label: "Remarks",
        render: (value) => value || "-",
      },
      {
        key: "links",
        label: "Links",
        render: (_value, row) => {
          const companyId = row?.company_id ? String(row.company_id) : "";
          const candidateId = row?.candidate_id ? String(row.candidate_id) : "";
          const jobId = row?.job_id ? String(row.job_id) : "";

          const links = [
            companyId ? { href: `/companies/${companyId}`, label: "Company" } : null,
            candidateId ? { href: `/candidates/${candidateId}`, label: "Candidate" } : null,
            jobId ? { href: `/jobs/${jobId}`, label: "Job" } : null,
          ].filter(Boolean);

          if (!links.length) return "-";

          return (
            <div className="flex flex-wrap gap-2">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-xs font-medium text-[var(--accent)] hover:underline"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          );
        },
      },
    ];
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-[var(--bg)] p-4 ring-1 ring-[var(--border)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Payments Ledger</div>
            <div className="mt-1 text-xs text-slate-600">
              A single timeline combining company payments, candidate payments, and placement income.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" onClick={openAddPayment}>
              Add payment
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <div className="text-[11px] font-medium text-slate-700">Start date</div>
            <Input
              type="datetime-local"
              value={startDateParam}
              onChange={(e) => setParam("start_date", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-medium text-slate-700">End date</div>
            <Input
              type="datetime-local"
              value={endDateParam}
              onChange={(e) => setParam("end_date", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-medium text-slate-700">Company</div>
            <AsyncSearchSelect
              value={companyIdParam}
              onChange={(v) => setParam("company_id", v || "")}
              onSelectOption={(item) => {
                const key = getCompanyOptionValue(item);
                const label = getCompanyOptionLabel(item);
                if (key && label) {
                  setCompanyLabelMap((prev) => ({ ...prev, [String(key)]: label }));
                }
              }}
              placeholder="Select a company"
              searchPlaceholder="Search companies..."
              loadOptions={loadCompanyOptions}
              resolveSelectedLabel={resolveCompanyLabel}
              getOptionLabel={getCompanyOptionLabel}
              getOptionValue={getCompanyOptionValue}
              allowClear
            />
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-medium text-slate-700">Candidate</div>
            <AsyncSearchSelect
              value={candidateIdParam}
              onChange={(v) => setParam("candidate_id", v || "")}
              onSelectOption={(item) => {
                const key = getCandidateOptionValue(item);
                const label = getCandidateOptionLabel(item);
                if (key && label) {
                  setCandidateLabelMap((prev) => ({ ...prev, [String(key)]: label }));
                }
              }}
              placeholder="Select a candidate"
              searchPlaceholder="Search candidates..."
              loadOptions={loadCandidateOptions}
              resolveSelectedLabel={resolveCandidateLabel}
              getOptionLabel={getCandidateOptionLabel}
              getOptionValue={getCandidateOptionValue}
              allowClear
            />
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-medium text-slate-700">Job</div>
            <AsyncSearchSelect
              value={jobIdParam}
              onChange={(v) => setParam("job_id", v || "")}
              onSelectOption={(item) => {
                const key = getJobOptionValue(item);
                const label = getJobOptionLabel(item);
                if (key && label) {
                  setJobLabelMap((prev) => ({ ...prev, [String(key)]: label }));
                }
              }}
              placeholder="Select a job"
              searchPlaceholder="Search jobs..."
              loadOptions={loadJobOptions}
              resolveSelectedLabel={resolveJobLabel}
              getOptionLabel={getJobOptionLabel}
              getOptionValue={getJobOptionValue}
              allowClear
            />
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-medium text-slate-700">Min amount</div>
            <Input
              type="number"
              min="0"
              step="1"
              value={minAmountParam}
              onChange={(e) => setParam("min_amount", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-medium text-slate-700">Max amount</div>
            <Input
              type="number"
              min="0"
              step="1"
              value={maxAmountParam}
              onChange={(e) => setParam("max_amount", e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-medium text-slate-700">Limit</div>
            <select
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2 text-sm outline-none"
              value={String(limit)}
              onChange={(e) => setParam("limit", e.target.value)}
            >
              {LIMIT_OPTIONS.map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 lg:col-span-2">
            <div className="text-[11px] font-medium text-slate-700">Sources</div>
            <div className="flex flex-wrap gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-muted)] p-2">
              {SOURCE_OPTIONS.map((opt) => {
                const checked = sourcesParam.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-center gap-2 rounded-md bg-[var(--bg)] px-2 py-1 text-xs ring-1 ring-[var(--border)]"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? Array.from(new Set([...sourcesParam, opt.value]))
                          : sourcesParam.filter((s) => s !== opt.value);
                        setSources(next);
                      }}
                    />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
              {!sourcesParam.length ? (
                <span className="px-2 py-1 text-xs text-slate-500">All</span>
              ) : null}
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-medium text-slate-700">Include inactive</div>
            <label className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setParam("include_inactive", e.target.checked ? "true" : "")}
              />
              <span className="text-xs text-slate-700">Show inactive rows</span>
            </label>
          </div>
        </div>

        <PaginatedTable
          columns={columns}
          rows={items}
          page={page}
          limit={limit}
          total={total}
          onPageChange={(nextPage) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("page", String(nextPage));
            const qs = params.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname);
          }}
        />
      </div>

      <Modal
        open={addModalOpen}
        onClose={() => {
          if (savingPayment) return;
          setAddModalOpen(false);
        }}
        title="Add payment"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-[11px] font-medium text-slate-700">Type</div>
              <select
                className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2 text-sm outline-none"
                value={addType}
                onChange={(e) => setAddType(e.target.value)}
                disabled={savingPayment}
              >
                <option value="COMPANY_PAYMENT">Company payment</option>
                <option value="CANDIDATE_PAYMENT">Candidate payment</option>
                <option value="PLACEMENT_INCOME">Create placement income</option>
                <option value="PLACEMENT_INCOME_PAYMENT">Placement income payment</option>
              </select>
            </div>
          </div>

          {addType === "COMPANY_PAYMENT" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <div className="text-[11px] font-medium text-slate-700">Company</div>
                <AsyncSearchSelect
                  value={companyPaymentCompanyId}
                  onChange={(v) => setCompanyPaymentCompanyId(v || "")}
                  onSelectOption={(item) => {
                    const key = getCompanyOptionValue(item);
                    const label = getCompanyOptionLabel(item);
                    if (key && label) {
                      setCompanyLabelMap((prev) => ({ ...prev, [String(key)]: label }));
                    }
                  }}
                  placeholder="Select a company"
                  searchPlaceholder="Search companies..."
                  loadOptions={loadCompanyOptions}
                  resolveSelectedLabel={resolveCompanyLabel}
                  getOptionLabel={getCompanyOptionLabel}
                  getOptionValue={getCompanyOptionValue}
                  allowClear
                  disabled={savingPayment}
                />
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-medium text-slate-700">Amount</div>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={companyPaymentAmount}
                  onChange={(e) => setCompanyPaymentAmount(e.target.value)}
                  disabled={savingPayment}
                />
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-medium text-slate-700">Payment date</div>
                <Input
                  type="datetime-local"
                  value={companyPaymentDate}
                  onChange={(e) => setCompanyPaymentDate(e.target.value)}
                  disabled={savingPayment}
                />
              </div>
            </div>
          ) : null}

          {addType === "CANDIDATE_PAYMENT" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <div className="text-[11px] font-medium text-slate-700">Candidate</div>
                <AsyncSearchSelect
                  value={candidatePaymentCandidateId}
                  onChange={(v) => setCandidatePaymentCandidateId(v || "")}
                  onSelectOption={(item) => {
                    const key = getCandidateOptionValue(item);
                    const label = getCandidateOptionLabel(item);
                    if (key && label) {
                      setCandidateLabelMap((prev) => ({ ...prev, [String(key)]: label }));
                    }
                  }}
                  placeholder="Select a candidate"
                  searchPlaceholder="Search candidates..."
                  loadOptions={loadCandidateOptions}
                  resolveSelectedLabel={resolveCandidateLabel}
                  getOptionLabel={getCandidateOptionLabel}
                  getOptionValue={getCandidateOptionValue}
                  allowClear
                  disabled={savingPayment || placementIncomeLinkedToInterview}
                />
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-medium text-slate-700">Amount</div>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={candidatePaymentAmount}
                  onChange={(e) => setCandidatePaymentAmount(e.target.value)}
                  disabled={savingPayment}
                />
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-medium text-slate-700">Payment date</div>
                <Input
                  type="datetime-local"
                  value={candidatePaymentDate}
                  onChange={(e) => setCandidatePaymentDate(e.target.value)}
                  disabled={savingPayment}
                />
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-medium text-slate-700">Remarks</div>
                <Input
                  value={candidatePaymentRemarks}
                  onChange={(e) => setCandidatePaymentRemarks(e.target.value)}
                  disabled={savingPayment}
                />
              </div>
            </div>
          ) : null}

          {addType === "PLACEMENT_INCOME" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <div className="text-[11px] font-medium text-slate-700">Interview</div>
                <AsyncSearchSelect
                  value={placementIncomeInterviewId}
                  onChange={(v) => handlePlacementIncomeInterviewChange(v)}
                  onSelectOption={(item) => {
                    const key = getInterviewOptionValue(item);
                    const label = getInterviewOptionLabel(item);
                    if (key && label) {
                      setInterviewLabelMap((prev) => ({ ...prev, [String(key)]: label }));
                    }
                  }}
                  placeholder="Select an interview"
                  searchPlaceholder="Search joined interviews..."
                  loadOptions={loadInterviewOptions}
                  resolveSelectedLabel={resolveInterviewLabel}
                  getOptionLabel={getInterviewOptionLabel}
                  getOptionValue={getInterviewOptionValue}
                  allowClear
                  disabled={savingPayment}
                />
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-medium text-slate-700">Candidate</div>
                <AsyncSearchSelect
                  value={placementIncomeCandidateId}
                  onChange={(v) => setPlacementIncomeCandidateId(v || "")}
                  onSelectOption={(item) => {
                    const key = getCandidateOptionValue(item);
                    const label = getCandidateOptionLabel(item);
                    if (key && label) {
                      setCandidateLabelMap((prev) => ({ ...prev, [String(key)]: label }));
                    }
                  }}
                  placeholder="Select a candidate"
                  searchPlaceholder="Search candidates..."
                  loadOptions={loadCandidateOptions}
                  resolveSelectedLabel={resolveCandidateLabel}
                  getOptionLabel={getCandidateOptionLabel}
                  getOptionValue={getCandidateOptionValue}
                  allowClear
                  disabled={savingPayment}
                />
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-medium text-slate-700">Job</div>
                <AsyncSearchSelect
                  value={placementIncomeJobId}
                  onChange={(v) => setPlacementIncomeJobId(v || "")}
                  onSelectOption={(item) => {
                    const key = getJobOptionValue(item);
                    const label = getJobOptionLabel(item);
                    if (key && label) {
                      setJobLabelMap((prev) => ({ ...prev, [String(key)]: label }));
                    }
                  }}
                  placeholder="Select a job"
                  searchPlaceholder="Search jobs..."
                  loadOptions={loadJobOptions}
                  resolveSelectedLabel={resolveJobLabel}
                  getOptionLabel={getJobOptionLabel}
                  getOptionValue={getJobOptionValue}
                  allowClear
                  disabled={savingPayment || placementIncomeLinkedToInterview}
                />
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-medium text-slate-700">Total receivable</div>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={placementIncomeTotalReceivable}
                  onChange={(e) => setPlacementIncomeTotalReceivable(e.target.value)}
                  disabled={savingPayment}
                />
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-medium text-slate-700">Due date</div>
                <Input
                  type="datetime-local"
                  value={placementIncomeDueDate}
                  onChange={(e) => setPlacementIncomeDueDate(e.target.value)}
                  disabled={savingPayment}
                />
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-medium text-slate-700">Remarks</div>
                <Input
                  value={placementIncomeRemarks}
                  onChange={(e) => setPlacementIncomeRemarks(e.target.value)}
                  disabled={savingPayment}
                />
              </div>
            </div>
          ) : null}

          {addType === "PLACEMENT_INCOME_PAYMENT" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1 md:col-span-2">
                <div className="text-[11px] font-medium text-slate-700">Placement income</div>
                <AsyncSearchSelect
                  value={incomePaymentIncomeId}
                  onChange={(v) => setIncomePaymentIncomeId(v || "")}
                  onSelectOption={(item) => {
                    const key = getPlacementIncomeOptionValue(item);
                    const label = getPlacementIncomeOptionLabel(item);
                    if (key && label) {
                      setIncomeLabelMap((prev) => ({ ...prev, [String(key)]: label }));
                    }
                  }}
                  placeholder="Select a placement income"
                  searchPlaceholder="Search placement incomes..."
                  loadOptions={loadPlacementIncomeOptions}
                  resolveSelectedLabel={resolvePlacementIncomeLabel}
                  getOptionLabel={getPlacementIncomeOptionLabel}
                  getOptionValue={getPlacementIncomeOptionValue}
                  allowClear
                  disabled={savingPayment}
                />
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-medium text-slate-700">Amount</div>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={incomePaymentAmount}
                  onChange={(e) => setIncomePaymentAmount(e.target.value)}
                  disabled={savingPayment}
                />
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-medium text-slate-700">Paid date</div>
                <Input
                  type="datetime-local"
                  value={incomePaymentPaidDate}
                  onChange={(e) => setIncomePaymentPaidDate(e.target.value)}
                  disabled={savingPayment}
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <div className="text-[11px] font-medium text-slate-700">Remarks</div>
                <Input
                  value={incomePaymentRemarks}
                  onChange={(e) => setIncomePaymentRemarks(e.target.value)}
                  disabled={savingPayment}
                />
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddModalOpen(false)}
              disabled={savingPayment}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmitPayment} disabled={savingPayment}>
              {savingPayment ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
