"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUIStore } from "@/stores/ui";
import { useCompaniesStore } from "@/stores/companies";
import CompanyForm from "@/components/forms/CompanyForm";
import DetailShell from "@/components/ui/DetailShell";
import StatusPill from "@/components/ui/StatusPill";
import {
  getCompany,
  updateCompany,
  uploadCompanyMedia,
} from "@/services/companies";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Table from "@/components/table/Table";
import Modal from "@/components/ui/Modal";

export default function CompanyDetailPage() {
  const apiBaseRaw = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const apiBase = apiBaseRaw.replace(/\/$/, "");
  let apiOrigin = apiBase;
  try {
    apiOrigin = new URL(apiBase).origin;
  } catch {
    // fallback to raw
    apiOrigin = apiBase;
  }

  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const setPageMetadata = useUIStore((state) => state.setPageMetadata);
  const pushToast = useUIStore((state) => state.pushToast);

  const [tab, setTab] = useState("overview");

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);

  const [infoSubmitting, setInfoSubmitting] = useState(false);

  const [verificationSubmitting, setVerificationSubmitting] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState("false");
  const [visitingCardFile, setVisitingCardFile] = useState(null);
  const [frontImageFile, setFrontImageFile] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const [companyStatus, setCompanyStatus] = useState("FREE");
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);
  const paymentsByCompanyId = useCompaniesStore((state) => state.paymentsByCompanyId);
  const createPayment = useCompaniesStore((state) => state.createPayment);

  function toAssetUrl(url) {
    if (!url || typeof url !== "string") return "";
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    const path = trimmed.startsWith("/media") ? trimmed : trimmed.startsWith("media") ? `/${trimmed}` : trimmed;
    if (!apiOrigin) return path;
    return `${apiOrigin}${path.startsWith("/") ? "" : "/"}${path}`;
  }

  useEffect(() => {
    setPageMetadata("Company details", "View and edit company");
  }, [setPageMetadata]);

  useEffect(() => {
    if (!id) return;

    let active = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getCompany(id);
        console.log(data)
        if (!active) return;
        setCompany(data);
        setVerificationStatus(data.verification_status ? "true" : "false");
        setCompanyStatus(data.company_status || "FREE");
      } catch (error) {
        if (!active) return;
        pushToast({
          title: "Failed to load company",
          description:
            (error && error.message) ||
            "An error occurred while loading the company.",
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

  const paidForPayments = companyStatus === "PAID" || company?.company_status === "PAID";

  // payments are included in getCompany; we only rely on cached store list if it exists (e.g., after a create)
  const infoInitialValues = company
    ? {
        name: company.name || "",
        category_id: company.category_id || "",
        location_area_id: company.location_area_id || "",
        address: company.address || "",
        location_link: company.location_link || "",
        contact_person: company.contact_person || "",
        contact_number: company.contact_number || "",
        alternate_number: company.alternate_number || "",
        email: company.email || "",
        notes: company.notes || "",
      }
    : null;

  async function handleInfoSubmit(values, { setError }) {
    setInfoSubmitting(true);
    try {
      const payload = {
        name: values.name,
        category_id: values.category_id || undefined,
        location_area_id: values.location_area_id || undefined,
        address: values.address || undefined,
        location_link: values.location_link || undefined,
        contact_person: values.contact_person || undefined,
        contact_number: values.contact_number || undefined,
        alternate_number: values.alternate_number || undefined,
        email: values.email?.trim() ? values.email.trim() : undefined,
        notes: values.notes || undefined,
      };

      const updated = await updateCompany(id, payload);
      setCompany(updated);
      pushToast({
        title: "Company updated",
        description: "The company information was updated successfully.",
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
      } else {
        pushToast({
          title: "Failed to update company",
          description:
            (error && error.message) ||
            "An error occurred while updating the company.",
        });
      }
    } finally {
      setInfoSubmitting(false);
    }
  }

  function openVerificationModal() {
    if (!company) return;
    setVerificationStatus(company.verification_status ? "true" : "false");
    setVerificationModalOpen(true);
  }

  function openStatusModal() {
    if (!company) return;
    setCompanyStatus(company.company_status || companyStatus || "FREE");
    setStatusModalOpen(true);
  }

  async function handleVerificationSave() {
    if (!company) return;
    setVerificationSubmitting(true);
    try {
      const nextVerified = verificationStatus === "true";
      const updated = await updateCompany(id, {
        verification_status: nextVerified,
      });
      setCompany(updated);
      pushToast({
        title: "Verification updated",
        description: "The company verification status was updated.",
      });
    } catch (error) {
      pushToast({
        title: "Failed to update verification",
        description:
          (error && error.message) ||
          "An error occurred while updating verification status.",
      });
    } finally {
      setVerificationSubmitting(false);
    }
  }

  async function handleUploadFiles(event) {
    event.preventDefault();
    if (!id) return;

    if (!visitingCardFile && !frontImageFile) {
      pushToast({
        title: "Select a file",
        description: "Choose visiting card or front image to upload.",
      });
      return;
    }

    const formData = new FormData();
    if (visitingCardFile) {
      formData.append("visiting_card", visitingCardFile);
    }
    if (frontImageFile) {
      formData.append("front_image", frontImageFile);
    }

    setUploadingFiles(true);
    try {
      await uploadCompanyMedia(id, formData);
      pushToast({
        title: "Files uploaded",
        description: "Company documents were uploaded successfully.",
      });
      setVisitingCardFile(null);
      setFrontImageFile(null);
    } catch (error) {
      pushToast({
        title: "Failed to upload files",
        description:
          (error && error.message) ||
          "An error occurred while uploading company files.",
      });
    } finally {
      setUploadingFiles(false);
    }
  }

  async function handleStatusSave() {
    if (!company) return;
    setStatusSubmitting(true);
    try {
      const updated = await updateCompany(id, {
        company_status: companyStatus || undefined,
      });
      setCompany(updated);
      pushToast({
        title: "Company status updated",
        description: "The company status was updated successfully.",
      });
    } catch (error) {
      pushToast({
        title: "Failed to update status",
        description:
          (error && error.message) ||
          "An error occurred while updating company status.",
      });
    } finally {
      setStatusSubmitting(false);
    }
  }

  async function handleAddPayment(event) {
    event.preventDefault();
    if (!id) return;

    if (companyStatus !== "PAID" && company?.company_status !== "PAID") {
      pushToast({
        title: "Payments only for PAID companies",
        description: "Set company status to PAID before adding payments.",
      });
      return;
    }

    const amountNumber = Number(paymentAmount);
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      pushToast({
        title: "Invalid amount",
        description: "Enter a valid positive amount.",
      });
      return;
    }

    if (!paymentDate) {
      pushToast({
        title: "Payment date required",
        description: "Select a payment date.",
      });
      return;
    }

    let isoDate;
    try {
      isoDate = new Date(paymentDate).toISOString();
    } catch {
      pushToast({
        title: "Invalid date",
        description: "Enter a valid payment date.",
      });
      return;
    }

    setSavingPayment(true);
    try {
      const payload = {
        amount: amountNumber,
        payment_date: isoDate,
        remarks: paymentRemarks ? paymentRemarks.trim() : undefined,
      };

      await createPayment(id, payload);
      setPaymentAmount("");
      setPaymentDate("");
      setPaymentRemarks("");
      pushToast({
        title: "Payment recorded",
        description: "The company payment was added successfully.",
      });
    } catch (error) {
      if (error && error.status === 409) {
        pushToast({
          title: "Payment conflict",
          description:
            (error && error.message) ||
            "The payment could not be recorded due to a conflict.",
        });
      } else {
        pushToast({
          title: "Failed to add payment",
          description:
            (error && error.message) ||
            "An error occurred while creating the company payment.",
        });
      }
    } finally {
      setSavingPayment(false);
    }
  }

  if (loading) {
    return (
      <DetailShell
        title="Company"
        subtitle="Company record"
        loading
        loadingTitle="Loading company..."
        tab={tab}
        setTab={setTab}
        tabs={[
          { value: "overview", label: "Overview" },
          { value: "edit", label: "Edit" },
          { value: "verification", label: "Verification" },
          { value: "payments", label: "Payments" },
        ]}
        onBack={() => router.back()}
      />
    );
  }

  if (!company) {
    return (
      <DetailShell
        title="Company"
        subtitle="Company record"
        notFound
        tab={tab}
        setTab={setTab}
        tabs={[
          { value: "overview", label: "Overview" },
          { value: "edit", label: "Edit" },
          { value: "verification", label: "Verification" },
          { value: "payments", label: "Payments" },
        ]}
        onBack={() => router.back()}
      />
    );
  }

  const headerStatus = (
    <div className="flex flex-wrap items-center gap-2">
      <StatusPill status={company.company_status || companyStatus || "FREE"} />
      <StatusPill status={company.verification_status ? "Verified" : "Not verified"} />
    </div>
  );

  const paymentsList = Array.isArray(paymentsByCompanyId[id])
    ? paymentsByCompanyId[id]
    : Array.isArray(company?.payments)
    ? company.payments
    : [];

  return (
    <>
      <DetailShell
        title={company.name || "Company"}
        subtitle="Company record"
        statusSlot={headerStatus}
        tab={tab}
        setTab={setTab}
        className="w-full max-w-6xl mx-auto"
        tabs={[
          { value: "overview", label: "Overview" },
          { value: "edit", label: "Edit" },
          { value: "verification", label: "Verification" },
          { value: "payments", label: "Payments" },
        ]}
        onBack={() => router.back()}
        actions={
          <>
            <Button type="button" variant="outline" onClick={() => setTab("edit")}>Edit</Button>
            <Button type="button" variant="outline" onClick={openStatusModal}>
              Change status
            </Button>
            <Button type="button" variant="outline" onClick={openVerificationModal}>
              Change verification
            </Button>
            <Button type="button" variant="outline" onClick={() => setTab("payments")}>
              Payments
            </Button>
          </>
        }
      >

      {tab === "overview" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 text-[var(--text)]">
            {/* 1️⃣ Overview */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Company
                </div>
                <div className="mt-1 text-lg font-semibold text-slate-900">
                  {company.name || "-"}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-700">
                  <StatusPill status={company.company_status || companyStatus || "FREE"} />
                  <StatusPill status={company.verification_status ? "Verified" : "Not verified"} />
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => router.push(`/jobs?company_id=${id}`)}
              >
                View jobs
              </Button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-xs font-semibold text-slate-600">Category</div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {company.category_name || company.category || company.category_id || "-"}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-600">Location</div>
                <div className="mt-1 text-sm font-medium text-slate-900">
                  {company.location_area_name || company.location || company.location_area_id || "-"}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-600">Contact person</div>
                <div className="mt-1 text-sm text-slate-900">{company.contact_person || "-"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-600">Contact number</div>
                <div className="mt-1 text-sm text-slate-900">{company.contact_number || "-"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-600">Email</div>
                <div className="mt-1 text-sm text-slate-900">{company.email || "-"}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-600">Links</div>
                <div className="mt-1 space-y-1 text-sm">
                  {company.location_link ? (
                    <a
                      href={String(company.location_link)}
                      target="_blank"
                      rel="noreferrer"
                      className="block break-all font-medium text-[var(--accent)] hover:underline"
                    >
                      {String(company.location_link)}
                    </a>
                  ) : null}
                  {company.google_map_url ? (
                    <a
                      href={String(company.google_map_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="block break-all font-medium text-[var(--accent)] hover:underline"
                    >
                      {String(company.google_map_url)}
                    </a>
                  ) : null}
                  {!company.location_link && !company.google_map_url ? (
                    <div className="text-sm text-slate-900">-</div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs font-semibold text-slate-600">Address</div>
              <div className="mt-1 whitespace-pre-wrap text-sm text-slate-900">
                {company.address || "-"}
              </div>
            </div>

            <div className="mt-4">
              <div className="text-xs font-semibold text-slate-600">Notes</div>
              <div className="mt-1 whitespace-pre-wrap text-sm text-slate-900">
                {company.notes || "-"}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
            <div className="text-xs font-semibold text-slate-600">Images</div>
            <div className="mt-3 space-y-4">
              <div>
                <div className="text-[11px] font-medium text-slate-600">Front image</div>
                {company.front_image_url ? (
                  <a
                    href={toAssetUrl(company.front_image_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block w-full overflow-hidden rounded-md border border-[var(--border)] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  >
                    <div className="flex h-48 items-center justify-center bg-white">
                      <img
                        src={toAssetUrl(company.front_image_url)}
                        alt="Front image"
                        className="max-h-44 w-auto max-w-full object-contain"
                      />
                    </div>
                  </a>
                ) : (
                  <div className="mt-2 rounded-md border border-[var(--border)] bg-[var(--bg-muted)] p-3 text-xs text-slate-600">
                    No image
                  </div>
                )}
              </div>

              <div>
                <div className="text-[11px] font-medium text-slate-600">Visiting card</div>
                {company.visiting_card_url ? (
                  <a
                    href={toAssetUrl(company.visiting_card_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block w-full overflow-hidden rounded-md border border-[var(--border)] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                  >
                    <div className="flex h-48 items-center justify-center bg-white">
                      <img
                        src={toAssetUrl(company.visiting_card_url)}
                        alt="Visiting card"
                        className="max-h-44 w-auto max-w-full object-contain"
                      />
                    </div>
                  </a>
                ) : (
                  <div className="mt-2 rounded-md border border-[var(--border)] bg-[var(--bg-muted)] p-3 text-xs text-slate-600">
                    No image
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "edit" ? (
        <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[var(--text)]">Edit company</h2>
            <span className="text-[11px] text-slate-500">Update core details</span>
          </div>
          {infoInitialValues && (
            <div className="mt-2 max-w-3xl">
              <CompanyForm
                defaultValues={infoInitialValues}
                onSubmit={handleInfoSubmit}
                submitting={infoSubmitting}
              />
            </div>
          )}
        </div>
      ) : null}

      {tab === "verification" ? (
        <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 text-xs">
          {/* 2️⃣ Verification */}
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-[var(--text)]">Verification</h2>
            <span classename="text-[11px] text-slate-500">Upload documents</span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-700">
                Visiting card
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setVisitingCardFile(
                    e.target.files && e.target.files[0] ? e.target.files[0] : null
                  )
                }
                className="block w-full text-[11px] text-slate-600 file:mr-2 file:rounded-md file:border file:border-[var(--border)] file:bg-[var(--bg)] file:px-2 file:py-1 file:text-[11px] file:font-medium file:text-slate-700 hover:file:bg-slate-50"
              />
              {company.visiting_card_url ? (
                <a
                  href={toAssetUrl(company.visiting_card_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  <img
                    src={toAssetUrl(company.visiting_card_url)}
                    alt="Visiting card"
                    className="mt-2 w-full rounded-md border border-[var(--border)] bg-white object-contain"
                  />
                </a>
              ) : null}
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-slate-700">
                Front image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setFrontImageFile(
                    e.target.files && e.target.files[0] ? e.target.files[0] : null
                  )
                }
                className="block w-full text-[11px] text-slate-600 file:mr-2 file:rounded-md file:border file:border-[var(--border)] file:bg-[var(--bg)] file:px-2 file:py-1 file:text-[11px] file:font-medium file:text-slate-700 hover:file:bg-slate-50"
              />
              {company.front_image_url ? (
                <a
                  href={toAssetUrl(company.front_image_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="block"
                >
                  <img
                    src={toAssetUrl(company.front_image_url)}
                    alt="Front image"
                    className="mt-2 w-full rounded-md border border-[var(--border)] bg-white object-contain"
                  />
                </a>
              ) : null}
            </div>
          </div>

          <div className="mt-2 flex justify-end">
            <Button size="sm" disabled={uploadingFiles} onClick={handleUploadFiles}>
              {uploadingFiles ? "Uploading..." : "Upload documents"}
            </Button>
          </div>
        </div>
      ) : null}

      {tab === "payments" ? (
        <>
          <div className="space-y-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 text-xs">
            {/* 3️⃣ Company status */}
            <h2 className="text-xs font-semibold text-[var(--text)]">Company status</h2>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-600">Current:</span>
                <StatusPill status={company.company_status || companyStatus || "FREE"} />
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={statusSubmitting}
                onClick={openStatusModal}
              >
                Change status
              </Button>
            </div>
          </div>

          {/* 4️⃣ Payments (PAID only) */}
          {paidForPayments ? (
            <div className="space-y-2 rounded-md border border-[var(--border)] bg-[var(--bg)] p-3 text-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-semibold text-[var(--text)]">Payments</h2>
              </div>

              <form onSubmit={handleAddPayment} className="mt-2 grid gap-3 md:grid-cols-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-700">
                    Amount
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-700">
                    Payment date
                  </label>
                  <Input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="block text-[11px] font-medium text-slate-700">
                    Remarks
                  </label>
                  <Input
                    placeholder="Notes about this payment (optional)"
                    value={paymentRemarks}
                    onChange={(e) => setPaymentRemarks(e.target.value)}
                  />
                </div>
                <div className="flex items-end justify-end md:justify-start">
                  <Button type="submit" size="sm" disabled={savingPayment}>
                    {savingPayment ? "Saving..." : "Add payment"}
                  </Button>
                </div>
              </form>

              <div className="mt-3">
                <Table
                  columns={[
                    { key: "amount", label: "Amount" },
                    { key: "payment_date", label: "Payment date" },
                    { key: "remarks", label: "Remarks" },
                  ]}
                  rows={paymentsList.map((p) => ({
                    id: p.id,
                    amount: p.amount,
                    payment_date: p.payment_date || "-",
                    remarks: p.remarks || "-",
                  }))}
                />
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4 text-sm text-slate-700">
              Payments are available only for <span className="font-semibold">PAID</span> companies.
            </div>
          )}
        </>
      ) : null}

      </DetailShell>

      <Modal
        open={verificationModalOpen}
        onClose={() => setVerificationModalOpen(false)}
        title="Change verification"
        size="md"
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Verification</label>
            <select
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2 text-sm outline-none"
              value={verificationStatus}
              onChange={(e) => setVerificationStatus(e.target.value)}
            >
              <option value="false">Not verified</option>
              <option value="true">Verified</option>
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setVerificationModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={verificationSubmitting}
              onClick={async () => {
                await handleVerificationSave();
                setVerificationModalOpen(false);
              }}
            >
              {verificationSubmitting ? "Saving..." : "Confirm"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title="Change company status"
        size="md"
      >
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700">Company status</label>
            <select
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2 text-sm outline-none"
              value={companyStatus}
              onChange={(e) => setCompanyStatus(e.target.value)}
            >
              <option value="FREE">FREE</option>
              <option value="PAID">PAID</option>
            </select>
          </div>

          <div className="rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2 text-xs text-slate-700">
            Marking a company as <span className="font-semibold">PAID</span> enables payments.
          </div>

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
    </>
  );
}
