"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import { formatDateOnly, toDateInputValue } from "@/utils/date";
import { useUIStore } from "@/stores/ui";
import { paymentsLedger } from "@/services/payments";
import { listCompanies, getCompany, listCompanyOptions } from "@/services/companies";
import { listJobs, getJob, listJobOptions } from "@/services/jobs";
import { listCandidates, getCandidate, listCandidateOptions } from "@/services/candidates";
import { createCompanyPayment } from "@/services/companies";
import { createCandidatePayment } from "@/services/candidates";
import { listInterviews, getInterview } from "@/services/interviews";
import {
  createPlacementIncome,
  createPlacementIncomePayment,
  getPlacementIncome,
  listPlacementIncomes,
} from "@/services/placementIncomes";
import { updateCompanyPayment, deleteCompanyPayment } from "@/services/companies";
import { updateCandidatePayment, deleteCandidatePayment } from "@/services/candidates";
import { updatePlacementIncomePayment, deletePlacementIncomePayment } from "@/services/placementIncomes";
import PaginatedTable from "@/components/table/PaginatedTable";
import AsyncSearchSelect from "@/components/ui/AsyncSearchSelect";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";

const SOURCE_OPTIONS = [
  { value: "COMPANY_PAYMENT", label: "Company payment" },
  { value: "PLACEMENT_INCOME", label: "Placement income" },
  { value: "JOC_FEE", label: "JOC fee" },
  { value: "REGISTRATION_FEE", label: "Registration fee" },
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
  if (source === "PLACEMENT_INCOME") {
    const parts = [row?.company_name, row?.job_title, row?.candidate_name].filter(Boolean);
    return parts.length ? parts.join(" - ") : "-";
  }
  if (source === "JOC_FEE") return row?.candidate_name || "-";
  if (source === "REGISTRATION_FEE") return row?.candidate_name || "-";
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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [addType, setAddType] = useState("COMPANY_PAYMENT");
  const [savingPayment, setSavingPayment] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingPayment, setDeletingPayment] = useState(false);

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

  function openEditPayment(payment) {
    // Clear all form fields first to prevent stale state from previous modal usage
    setCompanyPaymentCompanyId("");
    setCompanyPaymentAmount("");
    setCompanyPaymentDate("");
    setCandidatePaymentCandidateId("");
    setCandidatePaymentAmount("");
    setCandidatePaymentDate("");
    setCandidatePaymentRemarks("");
    setIncomePaymentIncomeId("");
    setIncomePaymentAmount("");
    setIncomePaymentPaidDate("");
    setIncomePaymentRemarks("");

    setEditingPayment(payment);
    setEditModalOpen(true);
    setSavingPayment(false);

    const source = payment?.source || "";
    
    if (source === "COMPANY_PAYMENT") {
      setAddType("COMPANY_PAYMENT");
      setCompanyPaymentCompanyId(payment?.company_id || "");
      setCompanyPaymentAmount(String(payment?.amount || ""));
      setCompanyPaymentDate(toDateInputValue(payment?.payment_date) || "");
    } else if (source === "JOC_FEE" || source === "REGISTRATION_FEE") {
      setAddType("CANDIDATE_PAYMENT");
      setCandidatePaymentCandidateId(payment?.candidate_id || "");
      setCandidatePaymentAmount(String(payment?.amount || ""));
      setCandidatePaymentDate(toDateInputValue(payment?.payment_date) || "");
      setCandidatePaymentRemarks(payment?.remarks || "");
    } else if (source === "PLACEMENT_INCOME" || source === "PLACEMENT_INCOME_PAYMENT") {
      setAddType("PLACEMENT_INCOME_PAYMENT");
      const incomeId = payment?.placement_income_id ? String(payment.placement_income_id) : "";
      setIncomePaymentIncomeId(incomeId);
      setIncomePaymentAmount(String(payment?.amount || ""));
      setIncomePaymentPaidDate(toDateInputValue(payment?.paid_date || payment?.payment_date) || "");
      setIncomePaymentRemarks(payment?.remarks || "");
    }
  }

  function openDeleteConfirm(payment) {
    setEditingPayment(payment);
    setDeleteConfirmOpen(true);
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
    // Use lightweight /options endpoint for dropdown (only returns active items)
    const items = await listCompanyOptions({ q: (query || "").trim(), limit: limit || 20 });
    // Note: /options endpoint only returns active companies, so we don't need to filter
    return items;
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
    // Use lightweight /options endpoint for dropdown
    return await listJobOptions({ q: (query || "").trim(), limit: limit || 20 });
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
    // Use lightweight /options endpoint for dropdown
    return await listCandidateOptions({ q: (query || "").trim(), limit: limit || 20 });
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
    // Names are now included directly in the API response, no individual API calls needed
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

    // Filter for active balances if adding payment
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
    
    // Names are now directly available from the API response
    const candidateName = item.candidate_name || "";
    const jobTitle = item.job_title || "";
    const companyName = item.company_name || "";

    const parts = [candidateName, jobTitle, companyName].filter(Boolean);
    const base = parts.length ? parts.join(" - ") : "Placement Income";
    return base;
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
      // The API now returns names directly, so we can use them
      const it = await getPlacementIncome(value);
      const candidateName = it?.candidate_name || "";
      const jobTitle = it?.job_title || "";
      const companyName = it?.company_name || "";
      const parts = [candidateName, jobTitle, companyName].filter(Boolean);
      const base = parts.length ? parts.join(" - ") : "Placement Income";
      setIncomeLabelMap((prev) => ({ ...prev, [String(value)]: base }));
      return base;
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

  async function handleEditPayment() {
    if (savingPayment || !editingPayment) return;
    setSavingPayment(true);
    try {
      const paymentId = String(editingPayment.id || "");
      const source = editingPayment?.source || "";

      if (source === "COMPANY_PAYMENT") {
        const companyId = String(companyPaymentCompanyId || "").trim();
        const amount = Number(companyPaymentAmount);
        const paymentDate = String(companyPaymentDate || "").trim();
        if (!companyId) throw new Error("Company is required");
        if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be greater than 0");
        if (!paymentDate) throw new Error("Payment date is required");
        await updateCompanyPayment(paymentId, {
          amount: Math.floor(amount),
          payment_date: paymentDate,
        });
      } else if (source === "JOC_FEE" || source === "REGISTRATION_FEE") {
        const candidateId = String(candidatePaymentCandidateId || "").trim();
        const amount = Number(candidatePaymentAmount);
        const paymentDate = String(candidatePaymentDate || "").trim();
        const remarks = String(candidatePaymentRemarks || "").trim();
        if (!candidateId) throw new Error("Candidate is required");
        if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be greater than 0");
        if (!paymentDate) throw new Error("Payment date is required");
        await updateCandidatePayment(paymentId, {
          amount: Math.floor(amount),
          payment_date: paymentDate,
          remarks: remarks || undefined,
        });
      } else if (source === "PLACEMENT_INCOME" || source === "PLACEMENT_INCOME_PAYMENT") {
        const incomeId = String(incomePaymentIncomeId || "").trim();
        const amount = Number(incomePaymentAmount);
        const paidDate = String(incomePaymentPaidDate || "").trim();
        const remarks = String(incomePaymentRemarks || "").trim();
        if (!incomeId) throw new Error("Placement income is required");
        if (!Number.isFinite(amount) || amount <= 0) throw new Error("Amount must be greater than 0");
        if (!paidDate) throw new Error("Paid date is required");
        await updatePlacementIncomePayment(paymentId, {
          amount: Math.floor(amount),
          paid_date: paidDate,
          remarks: remarks || undefined,
        });
      }

      setEditModalOpen(false);
      setEditingPayment(null);
      setRefreshTick(Date.now());
    } catch (error) {
      pushToast({
        title: "Failed to update payment",
        description:
          (error && error.message) || "An error occurred while updating the payment.",
      });
    } finally {
      setSavingPayment(false);
    }
  }

  async function handleDeletePayment() {
    if (deletingPayment || !editingPayment) return;
    setDeletingPayment(true);
    try {
      const paymentId = String(editingPayment.id || "");
      const source = editingPayment?.source || "";

      if (source === "COMPANY_PAYMENT") {
        await deleteCompanyPayment(paymentId);
      } else if (source === "PLACEMENT_INCOME" || source === "PLACEMENT_INCOME_PAYMENT") {
        await deletePlacementIncomePayment(paymentId);
      } else if (source === "JOC_FEE" || source === "REGISTRATION_FEE") {
        await deleteCandidatePayment(paymentId);
      } else {
        throw new Error("Unknown payment source");
      }

      setDeleteConfirmOpen(false);
      setEditingPayment(null);
      setRefreshTick(Date.now());
      
      pushToast({
        title: "Payment deleted",
        description: "The payment has been successfully deleted.",
      });
    } catch (error) {
      pushToast({
        title: "Failed to delete payment",
        description:
          (error && error.message) || "An error occurred while deleting the payment.",
      });
    } finally {
      setDeletingPayment(false);
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
        render: (value) => (value ? formatDateOnly(value) : "-"),
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
      {
        key: "actions",
        label: "Actions",
        render: (_value, row) => {
          const paymentId = row?.id ? String(row.id) : "";
          const source = row?.source ? String(row.source) : "";

          if (!paymentId) return "-";

          return (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() => openEditPayment(row)}
              >
                Edit
              </Button>
              <Button
                type="button"
                size="xs"
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:border-red-300"
                onClick={() => openDeleteConfirm(row)}
              >
                Delete
              </Button>
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
              type="date"
              value={startDateParam ? (startDateParam.length >= 10 ? startDateParam.slice(0, 10) : startDateParam) : ""}
              onChange={(e) => setParam("start_date", e.target.value ? `${e.target.value}T00:00:00` : "")}
            />
          </div>

          <div className="space-y-1">
            <div className="text-[11px] font-medium text-slate-700">End date</div>
            <Input
              type="date"
              value={endDateParam ? (endDateParam.length >= 10 ? endDateParam.slice(0, 10) : endDateParam) : ""}
              onChange={(e) => setParam("end_date", e.target.value ? `${e.target.value}T23:59:59` : "")}
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
              getOptionLabel={(c) => c.name || getCompanyOptionLabel(c)}
              getOptionValue={(c) => String(c.id || getCompanyOptionValue(c))}
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
              getOptionLabel={(c) => c.name || getCandidateOptionLabel(c)}
              getOptionValue={(c) => String(c.id || getCandidateOptionValue(c))}
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
                  type="date"
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
                  type="date"
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
                  type="date"
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
                  type="date"
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

      {/* Edit Payment Modal */}
      <Modal open={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Payment">
        <div className="space-y-4">
          <div className="space-y-1">
            <div className="text-[11px] font-medium text-slate-700">Payment Type</div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--bg-muted)] p-2 text-sm">
              {addType === "COMPANY_PAYMENT" && "Company Payment"}
              {addType === "CANDIDATE_PAYMENT" && "Candidate Payment"}
              {addType === "PLACEMENT_INCOME_PAYMENT" && "Placement Income Payment"}
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

              <div className="space-y-1 md:col-span-2">
                <div className="text-[11px] font-medium text-slate-700">Payment date</div>
                <Input
                  type="date"
                  value={companyPaymentDate}
                  onChange={(e) => setCompanyPaymentDate(e.target.value)}
                  disabled={savingPayment}
                />
              </div>
            </div>
          ) : null}

          {(addType === "CANDIDATE_PAYMENT") ? (
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
                  disabled={savingPayment}
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
                  type="date"
                  value={candidatePaymentDate}
                  onChange={(e) => setCandidatePaymentDate(e.target.value)}
                  disabled={savingPayment}
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <div className="text-[11px] font-medium text-slate-700">Remarks</div>
                <Input
                  value={candidatePaymentRemarks}
                  onChange={(e) => setCandidatePaymentRemarks(e.target.value)}
                  disabled={savingPayment}
                />
              </div>
            </div>
          ) : null}

          {addType === "PLACEMENT_INCOME_PAYMENT" ? (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
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
                  placeholder="Select placement income"
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
                  type="date"
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
              onClick={() => setEditModalOpen(false)}
              disabled={savingPayment}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleEditPayment} disabled={savingPayment}>
              {savingPayment ? "Updating..." : "Update"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="Delete Payment">
        <div className="space-y-4">
          <div className="text-sm text-slate-600">
            Are you sure you want to delete this payment? This action cannot be undone.
          </div>
          
          {editingPayment && (
            <div className="rounded-md bg-slate-50 p-3 text-xs">
              <div className="font-medium text-slate-900">
                {buildDisplayTitle(editingPayment)}
              </div>
              <div className="mt-1 text-slate-600">
                Amount: {formatCurrency(editingPayment.amount)}
              </div>
              <div className="text-slate-600">
                Date: {editingPayment.payment_date ? formatDateOnly(editingPayment.payment_date) : "-"}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deletingPayment}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeletePayment}
              disabled={deletingPayment}
            >
              {deletingPayment ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
