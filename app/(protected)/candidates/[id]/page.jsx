"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import dayjs from "dayjs";
import { useUIStore } from "@/stores/ui";
import { useCandidatesStore } from "@/stores/candidates";
import CandidateForm from "@/components/forms/CandidateForm";
import { getCandidate, updateCandidate, uploadCandidateFile } from "@/services/candidates";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
import Tabs from "@/components/ui/Tabs";
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

  const [tab, setTab] = useState("overview");

  const [loading, setLoading] = useState(true);
  const [candidate, setCandidate] = useState(null);
  const [infoSubmitting, setInfoSubmitting] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusValue, setStatusValue] = useState("REGISTERED");
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);

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

  const payments = paymentsByCandidateId[id] || [];
  const status = candidate?.status || "REGISTERED";
  const isRegistered = status === "REGISTERED";
  const isJoc = status === "JOC";

  useEffect(() => {
    if (!id || !candidate) return;
    if (!isRegistered && !isJoc) return;

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
  }, [id, candidate, isRegistered, isJoc, listPayments, pushToast]);

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
      registrationPayment.payment_date
        ? dayjs(registrationPayment.payment_date).format("YYYY-MM-DDTHH:mm")
        : ""
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
        experience_years:
          candidate.experience_years != null
            ? String(candidate.experience_years)
            : "",
        applied_job_id: candidate.applied_job_id || "",
        status: candidate.status || "REGISTERED",
        reference: candidate.reference || "",
        skills: Array.isArray(candidate.skills) ? candidate.skills : [],
        education: Array.isArray(candidate.education) ? candidate.education : [],
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

      const expYears = values.experience_years
        ? Number(values.experience_years)
        : undefined;

      const payload = {
        full_name: values.full_name,
        email: values.email || undefined,
        mobile_number: values.mobile_number,
        alternate_mobile_number: values.alternate_mobile_number || undefined,
        address: values.address || undefined,
        location_area_id: values.location_area_id || undefined,
        experience_years:
          Number.isFinite(expYears) && expYears >= 0 ? expYears : undefined,
        reference: values.reference || undefined,
        skills: skillsArray.length > 0 ? skillsArray : undefined,
        education: educationArray.length > 0 ? educationArray : undefined,
      };

      const updated = await updateCandidate(id, payload);
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
    setStatusModalOpen(true);
  }

  async function handleStatusSave() {
    if (!id) return;
    setStatusSubmitting(true);
    try {
      const updated = await updateCandidate(id, { status: statusValue });
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

      try {
        const refreshed = await getCandidate(id);
        setCandidate(refreshed);
      } catch {
        // ignore refresh errors
      }
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
      try {
        const refreshed = await getCandidate(id);
        setCandidate(refreshed);
      } catch {
        // ignore refresh errors
      }

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
      try {
        const refreshed = await getCandidate(id);
        setCandidate(refreshed);
      } catch {
        // ignore refresh errors
      }
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
      try {
        const refreshed = await getCandidate(id);
        setCandidate(refreshed);
      } catch {
        // ignore refresh errors
      }

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
      try {
        const refreshed = await getCandidate(id);
        setCandidate(refreshed);
      } catch {
        // ignore refresh errors
      }
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
    return <p className="text-xs text-slate-500">Loading candidate...</p>;
  }

  if (!candidate || !infoInitialValues) {
    return (
      <div className="rounded-md border border-[var(--border)] bg-[var(--bg)] p-4 text-sm text-[var(--danger)]">
        Candidate not found.
      </div>
    );
  }

  const paymentColumns = [
    { key: "amount", label: "Amount" },
    { key: "payment_date", label: "Date" },
    { key: "remarks", label: "Remarks" },
  ];

  const paymentRows = payments.map((payment) => ({
    id: payment.id,
    amount: payment.amount,
    payment_date: payment.payment_date
      ? dayjs(payment.payment_date).format("YYYY-MM-DD HH:mm")
      : "-",
    remarks: payment.remarks || "",
  }));

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader
        title={candidate.full_name || candidate.name || "Candidate"}
        subtitle={candidate.mobile_number || candidate.email || "Candidate record"}
        statusSlot={candidate.status ? <StatusPill status={candidate.status} /> : null}
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => setTab("edit")}>
              Edit
            </Button>
            <Button type="button" onClick={openStatusModal}>
              Change status
            </Button>
            <Button type="button" variant="outline" onClick={() => setTab("payments")}>
              Payments
            </Button>
            <Button variant="ghost" onClick={() => router.back()}>
              Back
            </Button>
          </>
        }
      />

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: "overview", label: "Overview" },
          { value: "edit", label: "Edit" },
          { value: "documents", label: "Documents" },
          { value: "payments", label: "Payments" },
        ]}
      />

      {tab === "overview" ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
          <div className="grid gap-4 md:grid-cols-3">
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
          </div>

          {candidate.status === "JOC" ? (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="space-y-1 rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2">
                <div className="text-[10px] text-slate-500">Total fee</div>
                <div className="text-lg font-bold text-slate-900">
                  {candidate.total_fee != null ? candidate.total_fee : "-"}
                </div>
              </div>
              <div className="space-y-1 rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2">
                <div className="text-[10px] text-slate-500">Total received</div>
                <div className="text-lg font-bold text-slate-900">{totalReceived}</div>
              </div>
              <div className="space-y-1 rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2">
                <div className="text-[10px] text-slate-500">Balance pending</div>
                <div className="text-lg font-bold text-slate-900">
                  {candidate.balance != null ? candidate.balance : "-"}
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-4">
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

      {tab === "payments" ? (
        (isRegistered || isJoc) ? (
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
                    <label className="block text-[11px] font-medium text-slate-700">Payment date & time</label>
                    <input
                      type="datetime-local"
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
                        ? `Created at: ${dayjs(registrationPayment.created_at).format("YYYY-MM-DD HH:mm")}`
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
                      <label className="block text-[11px] font-medium text-slate-700">Payment date & time</label>
                      <input
                        type="datetime-local"
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

      <Modal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Change candidate status"
        size="md"
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Status</label>
            <Select value={statusValue} onChange={(e) => setStatusValue(e.target.value)}>
              <option value="REGISTERED">REGISTERED</option>
              <option value="CAPS">CAPS</option>
              <option value="JOC">JOC</option>
              <option value="FREE">FREE</option>
            </Select>
          </div>

          {statusValue === "JOC" ? (
            <div className="rounded-md border border-[var(--danger)]/40 bg-[var(--danger)]/5 px-3 py-2 text-xs text-[var(--danger)]">
              Moving to <span className="font-semibold">JOC</span> enables fee tracking and payments. Confirm carefully.
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
              disabled={statusSubmitting}
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
    </div>
  );
}
