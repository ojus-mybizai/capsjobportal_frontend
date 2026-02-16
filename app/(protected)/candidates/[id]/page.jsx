"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import dayjs from "dayjs";
import { formatDateOnly, toDateInputValue } from "@/utils/date";
import { useUIStore } from "@/stores/ui";
import { useCandidatesStore } from "@/stores/candidates";
import CandidateForm from "@/components/forms/CandidateForm";
import {
  updateCandidate,
  uploadCandidateFile,
  changeCandidateStatus,
  listCandidateAppliedJobs,
} from "@/services/candidates";
import Button from "@/components/ui/Button";
import DetailShell from "@/components/ui/DetailShell";
import StatusPill from "@/components/ui/StatusPill";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import Table from "@/components/table/Table";

export default function CandidateDetailPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const setPageMetadata = useUIStore((state) => state.setPageMetadata);
  const pushToast = useUIStore((state) => state.pushToast);
  const getCandidate = useCandidatesStore((state) => state.get);
  const updateCandidateInStore = useCandidatesStore((state) => state.update);

  const [tab, setTab] = useState("overview");

  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState(null);
  const [infoSubmitting, setInfoSubmitting] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusValue, setStatusValue] = useState("REGISTERED");
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [jocTotalFee, setJocTotalFee] = useState("");
  const [jocPaymentAmount, setJocPaymentAmount] = useState("");
  const [jocPaymentDate, setJocPaymentDate] = useState("");
  const [jocPaymentRemarks, setJocPaymentRemarks] = useState("");
  const [jocDueDate, setJocDueDate] = useState("");
  const [resumeFile, setResumeFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [resumeModalOpen, setResumeModalOpen] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [appliedJobs, setAppliedJobs] = useState([]);
  const [loadingAppliedJobs, setLoadingAppliedJobs] = useState(false);

  const paymentsByCandidateId = useCandidatesStore(
    (state) => state.paymentsByCandidateId
  );
  const loadingPayments = useCandidatesStore((state) => state.loadingPayments);
  const listPayments = useCandidatesStore((state) => state.listPayments);
  const createPayment = useCandidatesStore((state) => state.createPayment);
  const updatePayment = useCandidatesStore((state) => state.updatePayment);
  const deletePayment = useCandidatesStore((state) => state.deletePayment);

  const [regAmount, setRegAmount] = useState("");
  const [regDate, setRegDate] = useState("");
  const [regRemarks, setRegRemarks] = useState("");
  const [savingRegPayment, setSavingRegPayment] = useState(false);

  const [newPaymentAmount, setNewPaymentAmount] = useState("");
  const [newPaymentDate, setNewPaymentDate] = useState("");
  const [newPaymentRemarks, setNewPaymentRemarks] = useState("");
  const [savingNewPayment, setSavingNewPayment] = useState(false);

  const [totalFeeInput, setTotalFeeInput] = useState("");
  const [updatingTotalFee, setUpdatingTotalFee] = useState(false);

  const genderText = (candidate?.gender || "").toString().toUpperCase();
  const employmentText = (candidate?.employment_status || "")
    .toString()
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/(^\w|\s\w)/g, (m) => m.toUpperCase());
  const expectedSalaryText =
    candidate?.expected_salary != null && candidate.expected_salary !== ""
      ? candidate.expected_salary
      : null;
  const dobDisplay = candidate?.dob ? dayjs(candidate.dob).format("DD MMM YYYY") : "";
  const ageDisplay =
    candidate?.age != null
      ? `${candidate.age} yrs`
      : candidate?.dob
      ? `${dayjs().diff(candidate.dob, "year")} yrs`
      : "";

  const normalizeMedia = (url) => {
    if (!url || typeof url !== "string") return "";
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    const path = trimmed.startsWith("/media") ? trimmed : trimmed.startsWith("media") ? `/${trimmed}` : trimmed;
    return `http://localhost:8000${path.startsWith("/") ? "" : "/"}${path}`;
  };

  const photoSrc = normalizeMedia(candidate?.photo_url || candidate?.photo);
  const resumeSrc = normalizeMedia(candidate?.resume_url || candidate?.resume || candidate?.resume_link);
  const isResumeImage =
    !!resumeSrc && /\.(png|jpe?g|gif|bmp|webp|svg)$/i.test(String(resumeSrc).split("?")[0]);

  const currencyText = (value) => {
    if (value == null || value === "") return "-";
    const num = Number(value);
    if (!Number.isFinite(num)) return String(value);
    return num.toLocaleString();
  };

  const renderChips = (items) =>
    Array.isArray(items) && items.length ? (
      <div className="flex flex-wrap gap-1">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full bg-[var(--bg-muted)] px-2 py-[2px] text-[11px] font-medium text-slate-700"
          >
            {item}
          </span>
        ))}
      </div>
    ) : (
      <span className="text-sm text-slate-500">-</span>
    );

  const displaySkills = useMemo(() => {
    if (Array.isArray(candidate?.skills_names)) return candidate.skills_names;
    if (Array.isArray(candidate?.skills)) return candidate.skills;
    return [];
  }, [candidate?.skills_names, candidate?.skills]);

  const displayEducation = useMemo(() => {
    if (Array.isArray(candidate?.education_names)) return candidate.education_names;
    if (Array.isArray(candidate?.education)) return candidate.education;
    return [];
  }, [candidate?.education_names, candidate?.education]);

  const displayDegree = useMemo(() => {
    if (Array.isArray(candidate?.degree_names)) return candidate.degree_names;
    if (Array.isArray(candidate?.degree)) return candidate.degree;
    return [];
  }, [candidate?.degree_names, candidate?.degree]);

  const allowedNextStatuses = useMemo(() => {
    const current = (candidate?.status || "REGISTERED").toUpperCase();
    if (current === "FREE") return ["REGISTERED", "JOC"];
    if (current === "REGISTERED") return ["JOC", "CAPS"];
    if (current === "JOC") return ["CAPS"];
    return [];
  }, [candidate]);

  useEffect(() => {
    setPageMetadata("Candidate details", "View and edit candidate");
  }, [setPageMetadata]);

  useEffect(() => {
    if (!id) return;

    let active = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getCandidate(id);
        console.log(data)
        if (!active) return;
        setCandidate(data);
        setStatusValue(data.status || "REGISTERED");
        if (typeof data.total_fee === "number") {
          setTotalFeeInput(String(data.total_fee));
        } else {
          setTotalFeeInput("");
        }
      } catch (error) {
        if (!active) return;
        pushToast({
          title: "Failed to load candidate",
          description:
            (error && error.message) ||
            "An error occurred while loading the candidate.",
        });
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [id, pushToast]);

  useEffect(() => {
    if (tab !== "applied-jobs" || !id) return;
    let active = true;
    async function loadApplied() {
      setLoadingAppliedJobs(true);
      try {
        const data = await listCandidateAppliedJobs(id);
        if (!active) return;
        setAppliedJobs(Array.isArray(data) ? data : []);
      } catch (error) {
        if (!active) return;
        pushToast({
          title: "Failed to load applied jobs",
          description: (error && error.message) || "Could not load applied jobs.",
        });
        setAppliedJobs([]);
      } finally {
        if (active) setLoadingAppliedJobs(false);
      }
    }
    loadApplied();
    return () => {
      active = false;
    };
  }, [tab, id, pushToast]);

  const payments = paymentsByCandidateId[id] || [];
  const status = candidate?.status || "REGISTERED";
  const isRegistered = status === "REGISTERED";
  const isJoc = status === "JOC";

  useEffect(() => {
    if (!id || !candidate) return;
    if (!isRegistered && !isJoc) return;
    if (tab !== "payments" && !(tab === "overview" && isJoc)) return;

    let active = true;
    async function loadPaymentsSafe() {
      try {
        await listPayments(id, { limit: 100 });
      } catch (error) {
        if (!active) return;
        pushToast({
          title: "Failed to load payments",
          description:
            (error && error.message) ||
            "An error occurred while loading candidate payments.",
        });
      }
    }

    loadPaymentsSafe();
    return () => {
      active = false;
    };
  }, [id, candidate, isRegistered, isJoc, tab, listPayments, pushToast]);

  const registrationPayment = isRegistered && payments.length > 0 ? payments[0] : null;

  useEffect(() => {
    if (!registrationPayment) {
      setRegAmount("");
      setRegDate("");
      setRegRemarks("");
      return;
    }

    setRegAmount(
      registrationPayment.amount != null ? String(registrationPayment.amount) : ""
    );
    setRegDate(
      registrationPayment.payment_date ? toDateInputValue(registrationPayment.payment_date) : ""
    );
    setRegRemarks(registrationPayment.remarks || "");
  }, [registrationPayment]);

  const infoInitialValues = candidate
    ? {
        full_name: candidate.full_name || "",
        email: candidate.email || "",
        mobile_number: candidate.mobile_number || "",
        alternate_mobile_number: candidate.alternate_mobile_number || "",
        address: candidate.address || "",
        location_area_id: candidate.location_area_id || "",
        experience_level: candidate.experience_level || "",
        status: candidate.status || "REGISTERED",
        employment_status: candidate.employment_status || "",
        gender: candidate.gender || "",
        expected_salary:
          candidate.expected_salary != null ? String(candidate.expected_salary) : "",
        dob: candidate.dob || "",
        reference: candidate.reference || "",
        skills: Array.isArray(candidate.skills) ? candidate.skills : [],
        education: Array.isArray(candidate.education) ? candidate.education : [],
        degree: Array.isArray(candidate.degree) ? candidate.degree : [],
        created_at: candidate.created_at || "",
      }
    : null;

  async function handleInfoSubmit(values, { setError }) {
    setInfoSubmitting(true);
    try {
      const skillsArray = Array.isArray(values.skills)
        ? values.skills.filter((item) => !!item && String(item).trim())
        : [];

      const educationArray = Array.isArray(values.education)
        ? values.education.filter((item) => !!item && String(item).trim())
        : [];

      const degreeArray = Array.isArray(values.degree)
        ? values.degree.filter((item) => !!item && String(item).trim())
        : [];

      const payload = {
        full_name: values.full_name,
        email: values.email?.trim() ? values.email.trim() : undefined,
        mobile_number: values.mobile_number,
        alternate_mobile_number: values.alternate_mobile_number || undefined,
        address: values.address || undefined,
        location_area_id: values.location_area_id || undefined,
        experience_level: values.experience_level || undefined,
        employment_status: values.employment_status || undefined,
        gender: values.gender || undefined,
        expected_salary: values.expected_salary
          ? Number(values.expected_salary)
          : undefined,
        dob: values.dob || undefined,
        reference: values.reference || undefined,
        skills: skillsArray.length > 0 ? skillsArray : undefined,
        education: educationArray.length > 0 ? educationArray : undefined,
        degree: degreeArray.length > 0 ? degreeArray : undefined,
      };

      console.log(payload)

      const updated = await updateCandidateInStore(id, payload);
      setCandidate(updated);

      pushToast({
        title: "Candidate updated",
        description: "The candidate was updated successfully.",
      });
    } catch (error) {
      if (error && error.status === 422 && error.data && typeof error.data === "object") {
        Object.entries(error.data).forEach(([field, detail]) => {
          if (typeof field !== "string") return;
          if (!(field in values)) return;
          const message =
            Array.isArray(detail)
              ? String(detail[0])
              : typeof detail === "string"
              ? detail
              : String(detail || "Invalid value");
          setError(field, { type: "server", message });
        });
      } else if (error && error.status === 409) {
        pushToast({
          title: "Candidate conflict",
          description:
            (error && error.message) ||
            "The candidate could not be updated due to a conflict.",
        });
      } else {
        pushToast({
          title: "Failed to update candidate",
          description:
            (error && error.message) ||
            "An error occurred while updating the candidate.",
        });
      }
    } finally {
      setInfoSubmitting(false);
    }
  }

  function openStatusModal() {
    if (!candidate) return;
    setStatusValue(candidate.status || "REGISTERED");
    setJocTotalFee(
      candidate && typeof candidate.total_fee === "number"
        ? String(candidate.total_fee)
        : ""
    );
    setJocPaymentAmount("");
    setJocPaymentDate("");
    setJocPaymentRemarks("");
    setJocDueDate(
      candidate?.fee_structure && candidate.fee_structure.due_date
        ? toDateInputValue(candidate.fee_structure.due_date)
        : ""
    );
    setStatusModalOpen(true);
  }

  async function handleStatusSave() {
    if (!id) return;
    if (!allowedNextStatuses.includes(statusValue)) {
      pushToast({
        title: "Status not allowed",
        description: "This transition is not permitted from the current status.",
      });
      return;
    }
    if (statusValue === "JOC") {
      const totalFeeNum = Number(jocTotalFee);
      const payAmountNum = Number(jocPaymentAmount);
      if (!Number.isFinite(totalFeeNum) || totalFeeNum <= 0) {
        pushToast({
          title: "Total fee required",
          description: "Enter a valid positive total fee before moving to JOC.",
        });
        return;
      }
      if (!Number.isFinite(payAmountNum) || payAmountNum <= 0) {
        pushToast({
          title: "Initial payment required",
          description: "Enter a valid initial payment amount.",
        });
        return;
      }
      if (!jocPaymentDate) {
        pushToast({
          title: "Payment date required",
          description: "Select an initial payment date.",
        });
        return;
      }
    }
    setStatusSubmitting(true);
    try {
      const payload =
        statusValue === "JOC"
          ? {
              status: statusValue,
              fee_structure: {
                total_fee: Number(jocTotalFee),
                due_date: jocDueDate ? new Date(jocDueDate).toISOString() : undefined,
              },
              initial_payment: {
                amount: Number(jocPaymentAmount),
                payment_date: new Date(jocPaymentDate).toISOString(),
                remarks: jocPaymentRemarks || undefined,
              },
            }
          : { status: statusValue };

      const updated = await changeCandidateStatus(id, payload);
      setCandidate(updated);
      pushToast({
        title: "Candidate status updated",
        description: "The candidate status was updated successfully.",
      });
    } catch (error) {
      if (error && error.status === 409) {
        pushToast({
          title: "Status conflict",
          description:
            (error && error.message) ||
            "The candidate status could not be updated due to a conflict.",
        });
      } else {
        pushToast({
          title: "Failed to update status",
          description:
            (error && error.message) ||
            "An error occurred while updating the candidate status.",
        });
      }
    } finally {
      setStatusSubmitting(false);
    }
  }

  function handleDocumentFilesChange(event) {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (!files.length) return;

    if (event.target.name === "resume") {
      setResumeFile(files[0]);
    } else if (event.target.name === "photo") {
      setPhotoFile(files[0]);
    }
  }

  async function handleUploadDocuments(event) {
    event.preventDefault();
    if (!id) return;

    if (!resumeFile && !photoFile) {
      pushToast({
        title: "Select a file",
        description: "Choose resume or photo to upload.",
      });
      return;
    }

    const formData = new FormData();
    if (resumeFile) {
      formData.append("resume", resumeFile);
    }
    if (photoFile) {
      formData.append("photo", photoFile);
    }

    setUploadingDocuments(true);
    try {
      await uploadCandidateFile(id, formData);
      pushToast({
        title: "Documents uploaded",
        description: "Candidate documents were uploaded successfully.",
      });
      setResumeFile(null);
      setPhotoFile(null);

      // Refresh from store (already updated by upload)
      const refreshed = await getCandidate(id, { force: true });
      setCandidate(refreshed);
    } catch (error) {
      pushToast({
        title: "Failed to upload documents",
        description:
          (error && error.message) ||
          "An error occurred while uploading candidate documents.",
      });
    } finally {
      setUploadingDocuments(false);
    }
  }

  async function handleSaveRegistrationPayment(event) {
    event.preventDefault();
    if (!id || !isRegistered) return;

    const amountNumber = Number(regAmount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      pushToast({
        title: "Invalid amount",
        description: "Enter a valid positive amount.",
      });
      return;
    }

    if (!regDate) {
      pushToast({
        title: "Payment date required",
        description: "Select a payment date.",
      });
      return;
    }

    let isoDate;
    try {
      isoDate = new Date(regDate).toISOString();
    } catch {
      pushToast({
        title: "Invalid date",
        description: "Enter a valid payment date.",
      });
      return;
    }

    setSavingRegPayment(true);
    try {
      const payload = {
        amount: amountNumber,
        payment_date: isoDate,
        remarks: regRemarks || undefined,
      };

      if (registrationPayment) {
        await updatePayment(registrationPayment.id, payload);
      } else {
        await createPayment(id, payload);
      }

      await listPayments(id, { limit: 100 });
      // Refresh from store (already updated by upload)
      const refreshed = await getCandidate(id, { force: true });
      setCandidate(refreshed);

      pushToast({
        title: "Registration payment saved",
        description: "The registration payment was saved successfully.",
      });
    } catch (error) {
      pushToast({
        title: "Failed to save payment",
        description:
          (error && error.message) ||
          "An error occurred while saving the registration payment.",
      });
    } finally {
      setSavingRegPayment(false);
    }
  }

  async function handleDeleteRegistrationPayment() {
    if (!registrationPayment) return;
    try {
      await deletePayment(registrationPayment.id);
      await listPayments(id, { limit: 100 });
      // Refresh from store (already updated by upload)
      const refreshed = await getCandidate(id, { force: true });
      setCandidate(refreshed);
      pushToast({
        title: "Payment deleted",
        description: "The registration payment was deleted successfully.",
      });
    } catch (error) {
      pushToast({
        title: "Failed to delete payment",
        description:
          (error && error.message) ||
          "An error occurred while deleting the registration payment.",
      });
    }
  }

  const totalReceived = payments.reduce((sum, p) => {
    if (p && p.is_active === false) return sum;
    const amount =
      typeof p.amount === "number" ? p.amount : Number(p.amount || 0) || 0;
    return sum + amount;
  }, 0);

  async function handleAddJocPayment(event) {
    event.preventDefault();
    if (!id || !isJoc) return;

    const amountNumber = Number(newPaymentAmount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      pushToast({
        title: "Invalid amount",
        description: "Enter a valid positive amount.",
      });
      return;
    }

    if (!newPaymentDate) {
      pushToast({
        title: "Payment date required",
        description: "Select a payment date.",
      });
      return;
    }

    let isoDate;
    try {
      isoDate = new Date(newPaymentDate).toISOString();
    } catch {
      pushToast({
        title: "Invalid date",
        description: "Enter a valid payment date.",
      });
      return;
    }

    setSavingNewPayment(true);
    try {
      const payload = {
        amount: amountNumber,
        payment_date: isoDate,
        remarks: newPaymentRemarks || undefined,
      };

      await createPayment(id, payload);
      setNewPaymentAmount("");
      setNewPaymentDate("");
      setNewPaymentRemarks("");

      await listPayments(id, { limit: 100 });
      // Refresh from store (already updated by upload)
      const refreshed = await getCandidate(id, { force: true });
      setCandidate(refreshed);

      pushToast({
        title: "Payment added",
        description: "The candidate payment was created successfully.",
      });
    } catch (error) {
      pushToast({
        title: "Failed to add payment",
        description:
          (error && error.message) ||
          "An error occurred while creating the candidate payment.",
      });
    } finally {
      setSavingNewPayment(false);
    }
  }

  async function handleDeletePaymentRow(paymentId) {
    try {
      await deletePayment(paymentId);
      await listPayments(id, { limit: 100 });
      // Refresh from store (already updated by upload)
      const refreshed = await getCandidate(id, { force: true });
      setCandidate(refreshed);
      pushToast({
        title: "Payment deleted",
        description: "The candidate payment was deleted successfully.",
      });
    } catch (error) {
      pushToast({
        title: "Failed to delete payment",
        description:
          (error && error.message) ||
          "An error occurred while deleting the candidate payment.",
      });
    }
  }

  async function handleUpdateTotalFee(event) {
    event.preventDefault();
    if (!id || !isJoc) return;

    const totalFeeNumber = Number(totalFeeInput);
    if (!Number.isFinite(totalFeeNumber) || totalFeeNumber <= 0) {
      pushToast({
        title: "Invalid total fee",
        description: "Enter a valid positive total fee.",
      });
      return;
    }

    setUpdatingTotalFee(true);
    try {
      const updated = await updateCandidate(id, { total_fee: totalFeeNumber });
      setCandidate(updated);
      pushToast({
        title: "Total fee updated",
        description: "The total fee was updated successfully.",
      });
    } catch (error) {
      pushToast({
        title: "Failed to update total fee",
        description:
          (error && error.message) ||
          "An error occurred while updating the total fee.",
      });
    } finally {
      setUpdatingTotalFee(false);
    }
  }

  if (loading) {
    return (
      <DetailShell
        title="Candidate"
        subtitle="Candidate record"
        loading
        loadingTitle="Loading candidate..."
        tab={tab}
        setTab={setTab}
        tabs={[
          { value: "overview", label: "Overview" },
          { value: "edit", label: "Edit" },
          { value: "documents", label: "Documents" },
          { value: "applied-jobs", label: "Applied jobs" },
          { value: "payments", label: "Payments" },
        ]}
        onBack={() => router.back()}
      />
    );
  }

  if (!candidate || !infoInitialValues) {
    return (
      <DetailShell
        title="Candidate"
        subtitle="Candidate record"
        notFound
        tab={tab}
        setTab={setTab}
        tabs={[
          { value: "overview", label: "Overview" },
          { value: "edit", label: "Edit" },
          { value: "documents", label: "Documents" },
          { value: "applied-jobs", label: "Applied jobs" },
          { value: "payments", label: "Payments" },
        ]}
        onBack={() => router.back()}
      />
    );
  }

  const paymentColumns = [
    { key: "amount", label: "Amount" },
    { key: "payment_date", label: "Date" },
    { key: "remarks", label: "Remarks" },
  ];

  const appliedJobColumns = [
    { key: "job_title", label: "Job" },
    { key: "company_name", label: "Company" },
    { key: "job_status", label: "Job status" },
    { key: "interviews_count", label: "Interviews" },
    { key: "latest_interview_status", label: "Latest status" },
    { key: "last_interview_date", label: "Last interview" },
  ];

  const paymentRows = payments.map((payment) => ({
    id: payment.id,
    amount: payment.amount,
    payment_date: payment.payment_date ? formatDateOnly(payment.payment_date) : "-",
    remarks: payment.remarks || "",
  }));

  const appliedJobRows = (Array.isArray(appliedJobs) ? appliedJobs : []).map((item) => ({
    id: item.job_id || item.id,
    job_title: item.job_title || "-",
    company_name: item.company_name || "-",
    job_status: item.job_status || "-",
    interviews_count: item.interviews_count ?? 0,
    latest_interview_status: item.latest_interview_status || "-",
    last_interview_date: item.last_interview_date ? formatDateOnly(item.last_interview_date) : "-",
    link: item.job_id ? `/jobs/${item.job_id}` : null,
  }));

  return (
    <>
      <DetailShell
        title={candidate.full_name || candidate.name || "Candidate"}
        subtitle={candidate.mobile_number || candidate.email || "Candidate record"}
        statusSlot={candidate.status ? <StatusPill status={candidate.status} /> : null}
        tab={tab}
        setTab={setTab}
        tabs={[
          { value: "overview", label: "Overview" },
          { value: "edit", label: "Edit" },
          { value: "documents", label: "Documents" },
          { value: "applied-jobs", label: "Applied jobs" },
          { value: "payments", label: "Payments" },
        ]}
        onBack={() => router.back()}
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => setTab("edit")}>
              Edit
            </Button>
            <Button type="button" onClick={openStatusModal}>
              Change status
            </Button>
            <Button type="button" variant="outline" onClick={() => setTab("applied-jobs")}>
              Applied jobs
            </Button>
            <Button type="button" variant="outline" onClick={() => setTab("payments")}>
              Payments
            </Button>
          </>
        }
      >

      {tab === "overview" ? (
        <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => photoSrc && setPhotoModalOpen(true)}
                className="h-16 w-16 overflow-hidden rounded-full border border-[var(--border)] bg-[var(--bg-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1"
                aria-label={photoSrc ? "View photo" : "No photo available"}
                disabled={!photoSrc}
              >
                {photoSrc ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={photoSrc}
                    alt="Candidate photo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-500">
                    No photo
                  </div>
                )}
              </button>
              <div className="flex flex-col">
                <div className="text-sm font-semibold text-slate-900">
                  {candidate.full_name || candidate.name || "Candidate"}
                </div>
                <div className="text-[11px] text-slate-600">
                  {candidate.mobile_number || candidate.email || "Candidate record"}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {resumeSrc ? (
                <Button type="button" variant="outline" size="sm" onClick={() => setResumeModalOpen(true)}>
                  View resume
                </Button>
              ) : null}
              <Button type="button" variant="outline" size="sm" onClick={() => setTab("documents")}>
                Documents
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1 rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2">
              <div className="text-[10px] text-slate-500">Status</div>
              <div className="text-sm font-semibold text-slate-900">{candidate.status || "-"}</div>
            </div>
            <div className="space-y-1 rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2">
              <div className="text-[10px] text-slate-500">Employment</div>
              <div className="text-sm font-semibold text-slate-900">
                {employmentText || "-"}
              </div>
            </div>
            <div className="space-y-1 rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2">
              <div className="text-[10px] text-slate-500">Gender</div>
              <div className="text-sm font-semibold text-slate-900">
                {genderText || "-"}
              </div>
            </div>
            <div className="space-y-1 rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2">
              <div className="text-[10px] text-slate-500">Expected salary</div>
              <div className="text-sm font-semibold text-slate-900">
                {expectedSalaryText != null ? currencyText(expectedSalaryText) : "-"}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <div className="text-xs font-semibold text-slate-600">Mobile</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {candidate.mobile_number || "-"}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600">Email</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {candidate.email || "-"}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600">Location</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {candidate.location_area_name || candidate.location || candidate.location_area_id || "-"}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600">Created</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {candidate.created_at ? formatDateOnly(candidate.created_at) : "-"}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div>
              <div className="text-xs font-semibold text-slate-600">DOB</div>
              <div className="mt-1 text-sm font-medium text-slate-900">{dobDisplay || "-"}</div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600">Experience level</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {candidate.experience_level || "-"}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-600">Reference</div>
              <div className="mt-1 text-sm font-medium text-slate-900">
                {candidate.reference || "-"}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-600">Skills</div>
              {renderChips(displaySkills)}
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-600">Education</div>
              {renderChips(displayEducation)}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-600">Degree</div>
              {renderChips(displayDegree)}
            </div>
          </div>

          {candidate.status === "JOC" ? (
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-1 rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2">
                <div className="text-[10px] text-slate-500">Total fee</div>
                <div className="text-lg font-bold text-slate-900">
                  {candidate.total_fee != null ? currencyText(candidate.total_fee) : "-"}
                </div>
              </div>
              <div className="space-y-1 rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2">
                <div className="text-[10px] text-slate-500">Total received</div>
                <div className="text-lg font-bold text-emerald-700">{currencyText(totalReceived)}</div>
              </div>
              <div className="space-y-1 rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2">
                <div className="text-[10px] text-slate-500">Balance pending</div>
                <div className="text-lg font-bold text-amber-700">
                  {candidate.balance != null ? currencyText(candidate.balance) : "-"}
                </div>
              </div>
            </div>
          ) : null}

          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-600">Address</div>
            <div className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
              {candidate.address || "-"}
            </div>
          </div>
        </div>
      ) : null}

      {tab === "edit" ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
          <CandidateForm
            defaultValues={infoInitialValues}
            onSubmit={handleInfoSubmit}
            submitting={infoSubmitting}
            showFileInputs={false}
            disableStatusField
            disableAppliedJobField
          />
        </div>
      ) : null}

      {tab === "documents" ? (
        <div className="space-y-2 rounded-md border border-[var(--border)] bg-[var(--bg)] p-3 text-xs">
          <h2 className="text-xs font-semibold text-[var(--text)]">Documents</h2>

          <form onSubmit={handleUploadDocuments} className="mt-2 grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-700">Resume</label>
              <input
                type="file"
                name="resume"
                accept="application/pdf,image/*"
                onChange={handleDocumentFilesChange}
                className="block w-full text-[11px] text-slate-600 file:mr-2 file:rounded-md file:border file:border-[var(--border)] file:bg-[var(--bg)] file:px-2 file:py-1 file:text-[11px] file:font-medium file:text-slate-700 hover:file:bg-slate-50"
              />
              {candidate.resume_url && (
                <p className="text-[10px] text-slate-600">
                  Current: <span className="break-all">{candidate.resume_url}</span>
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-700">Photo</label>
              <input
                type="file"
                name="photo"
                accept="image/*"
                onChange={handleDocumentFilesChange}
                className="block w-full text-[11px] text-slate-600 file:mr-2 file:rounded-md file:border file:border-[var(--border)] file:bg-[var(--bg)] file:px-2 file:py-1 file:text-[11px] file:font-medium file:text-slate-700 hover:file:bg-slate-50"
              />
              {candidate.photo_url && (
                <p className="text-[10px] text-slate-600">
                  Current: <span className="break-all">{candidate.photo_url}</span>
                </p>
              )}
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" size="sm" disabled={uploadingDocuments}>
                {uploadingDocuments ? "Uploading..." : "Upload documents"}
              </Button>
            </div>
          </form>
        </div>
      ) : null}

      {tab === "applied-jobs" ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">Applied jobs</h2>
            {loadingAppliedJobs ? (
              <span className="text-[11px] text-slate-500">Loading…</span>
            ) : null}
          </div>

          {loadingAppliedJobs ? (
            <div className="mt-3 text-xs text-slate-500">Fetching applied jobs…</div>
          ) : appliedJobRows.length === 0 ? (
            <div className="mt-3 rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2 text-sm text-slate-600">
              No applied jobs found for this candidate.
            </div>
          ) : (
            <Table
              columns={appliedJobColumns}
              rows={appliedJobRows}
              renderActions={(row) =>
                row.link ? (
                  <a
                    href={row.link}
                    className="text-[11px] text-[var(--accent)] underline"
                  >
                    View job
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-500">No job link</span>
                )
              }
            />
          )}
        </div>
      ) : null}

      {tab === "payments" ? (
        isRegistered || isJoc ? (
          <div className="space-y-3 rounded-md border border-[var(--border)] bg-[var(--bg)] p-3 text-xs">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-[var(--text)]">Payments</h2>
              {loadingPayments && (
                <span className="text-[10px] text-slate-500">Loading payments...</span>
              )}
            </div>

            {isRegistered && (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-700">
                  Registration payment (one-time). Add or update the registration fee for this candidate.
                </p>

                <form
                  onSubmit={handleSaveRegistrationPayment}
                  className="mt-1 grid gap-3 md:grid-cols-3"
                >
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-700">Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2 py-1 text-[11px] outline-none ring-0 focus:border-[var(--accent)]"
                      value={regAmount}
                      onChange={(e) => setRegAmount(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-700">Payment date</label>
                    <input
                      type="date"
                      className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2 py-1 text-[11px] outline-none ring-0 focus:border-[var(--accent)]"
                      value={regDate}
                      onChange={(e) => setRegDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-700">Remarks</label>
                    <input
                      type="text"
                      className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2 py-1 text-[11px] outline-none ring-0 focus:border-[var(--accent)]"
                      value={regRemarks}
                      onChange={(e) => setRegRemarks(e.target.value)}
                    />
                  </div>

                  <div className="md:col-span-3 flex items-center justify-between gap-2 pt-1">
                    <div className="text-[10px] text-slate-500">
                      {registrationPayment && registrationPayment.created_at
                        ? `Created: ${formatDateOnly(registrationPayment.created_at)}`
                        : null}
                    </div>
                    <div className="flex items-center gap-2">
                      {registrationPayment && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={handleDeleteRegistrationPayment}
                        >
                          Delete
                        </Button>
                      )}
                      <Button type="submit" size="sm" disabled={savingRegPayment}>
                        {savingRegPayment ? "Saving..." : "Save payment"}
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            )}

            {isJoc && (
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-1 rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2">
                    <div className="text-[10px] text-slate-500">Total fee</div>
                    <div className="text-sm font-semibold text-slate-800">
                      {candidate.total_fee != null ? candidate.total_fee : "-"}
                    </div>
                  </div>
                  <div className="space-y-1 rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2">
                    <div className="text-[10px] text-slate-500">Total received</div>
                    <div className="text-sm font-semibold text-slate-800">{totalReceived}</div>
                  </div>
                  <div className="space-y-1 rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2">
                    <div className="text-[10px] text-slate-500">Balance pending</div>
                    <div className="text-sm font-semibold text-slate-800">
                      {candidate.balance != null ? candidate.balance : "-"}
                    </div>
                  </div>
                </div>

                <form
                  onSubmit={handleUpdateTotalFee}
                  className="mt-1 grid gap-3 md:grid-cols-3 items-end"
                >
                  <div className="space-y-1">
                    <label className="block text-[11px] font-medium text-slate-700">Update total fee</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2 py-1 text-[11px] outline-none ring-0 focus:border-[var(--accent)]"
                      value={totalFeeInput}
                      onChange={(e) => setTotalFeeInput(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <Button type="submit" size="sm" disabled={updatingTotalFee}>
                      {updatingTotalFee ? "Updating..." : "Save total fee"}
                    </Button>
                  </div>
                </form>

                <form
                  onSubmit={handleAddJocPayment}
                  className="space-y-2 rounded-md border border-[var(--border)] bg-[var(--bg)] p-3"
                >
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-slate-700">Amount</label>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2 py-1 text-[11px] outline-none ring-0 focus:border-[var(--accent)]"
                        value={newPaymentAmount}
                        onChange={(e) => setNewPaymentAmount(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-slate-700">Payment date</label>
                      <input
                        type="date"
                        className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2 py-1 text-[11px] outline-none ring-0 focus:border-[var(--accent)]"
                        value={newPaymentDate}
                        onChange={(e) => setNewPaymentDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[11px] font-medium text-slate-700">Remarks</label>
                      <input
                        type="text"
                        className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2 py-1 text-[11px] outline-none ring-0 focus:border-[var(--accent)]"
                        value={newPaymentRemarks}
                        onChange={(e) => setNewPaymentRemarks(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" disabled={savingNewPayment}>
                      {savingNewPayment ? "Saving..." : "Add payment"}
                    </Button>
                  </div>
                </form>

                <div className="mt-2">
                  <Table
                    columns={paymentColumns}
                    rows={paymentRows}
                    renderActions={(row) => (
                      <button
                        type="button"
                        className="text-[10px] text-[var(--danger)] hover:underline"
                        onClick={() => handleDeletePaymentRow(row.id)}
                      >
                        Delete
                      </button>
                    )}
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 text-sm text-slate-700">
            Payments are available only for <span className="font-semibold">REGISTERED</span> and <span className="font-semibold">JOC</span> candidates.
          </div>
        )
      ) : null}
      </DetailShell>

      <Modal
        open={resumeModalOpen}
        onClose={() => setResumeModalOpen(false)}
        title="Resume"
        size="lg"
      >
        <div className="flex flex-col gap-3">
          {isResumeImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={resumeSrc}
              alt="Resume"
              className="max-h-[70vh] w-full rounded-md border border-[var(--border)] object-contain"
            />
          ) : resumeSrc ? (
            <iframe
              src={resumeSrc}
              title="Resume preview"
              className="h-[70vh] w-full rounded-md border border-[var(--border)]"
            />
          ) : (
            <p className="text-sm text-slate-600">No resume available.</p>
          )}
          {resumeSrc ? (
            <a
              href={resumeSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[var(--accent)] underline"
            >
              Open resume in new tab
            </a>
          ) : null}
        </div>
      </Modal>

      <Modal
        open={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        title="Photo"
        size="md"
      >
        {photoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoSrc}
            alt="Candidate photo"
            className="max-h-[70vh] w-full rounded-md border border-[var(--border)] object-contain"
          />
        ) : (
          <p className="text-sm text-slate-600">No photo available.</p>
        )}
      </Modal>

      <Modal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Change candidate status"
        size="md"
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Status</label>
            <Select
              value={statusValue}
              onChange={(e) => setStatusValue(e.target.value)}
            >
              <option value="">Select</option>
              {allowedNextStatuses.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </div>

          {statusValue === "JOC" ? (
            <div className="space-y-3 rounded-md border border-[var(--danger)]/30 bg-[var(--danger)]/5 px-3 py-2 text-xs text-slate-800">
              <p className="text-[var(--danger)] font-semibold">
                Moving to JOC requires fee and initial payment details.
              </p>
              <div className="grid gap-3 md:grid-cols-3 text-[11px]">
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700">Total fee *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={jocTotalFee}
                    onChange={(e) => setJocTotalFee(e.target.value)}
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2 py-1 text-[11px] outline-none ring-0 focus:border-[var(--accent)]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700">Initial payment *</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={jocPaymentAmount}
                    onChange={(e) => setJocPaymentAmount(e.target.value)}
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2 py-1 text-[11px] outline-none ring-0 focus:border-[var(--accent)]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700">Payment date *</label>
                  <input
                    type="date"
                    value={jocPaymentDate}
                    onChange={(e) => setJocPaymentDate(e.target.value)}
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2 py-1 text-[11px] outline-none ring-0 focus:border-[var(--accent)]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block font-semibold text-slate-700">Fee due date (optional)</label>
                  <input
                    type="date"
                    value={jocDueDate}
                    onChange={(e) => setJocDueDate(e.target.value)}
                    className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2 py-1 text-[11px] outline-none ring-0 focus:border-[var(--accent)]"
                  />
                </div>
              </div>
              <div className="space-y-1 text-[11px]">
                <label className="block font-semibold text-slate-700">Remarks</label>
                <input
                  type="text"
                  value={jocPaymentRemarks}
                  onChange={(e) => setJocPaymentRemarks(e.target.value)}
                  className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-2 py-1 text-[11px] outline-none ring-0 focus-border-[var(--accent)]"
                  placeholder="Optional"
                />
              </div>
            </div>
          ) : (
            <div className="rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2 text-xs text-slate-700">
              Status changes should follow your business flow. Avoid changing historical registration context.
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={
                statusSubmitting ||
                (statusValue === "JOC" &&
                  (!Number.isFinite(Number(jocTotalFee)) ||
                    Number(jocTotalFee) <= 0 ||
                    !Number.isFinite(Number(jocPaymentAmount)) ||
                    Number(jocPaymentAmount) <= 0 ||
                    !jocPaymentDate))
              }
              onClick={async () => {
                await handleStatusSave();
                setStatusModalOpen(false);
              }}
            >
              {statusSubmitting ? "Saving..." : "Confirm"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
