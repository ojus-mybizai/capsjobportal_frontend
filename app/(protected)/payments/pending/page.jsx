"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import dayjs from "dayjs";
import Link from "next/link";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { api } from "@/services/api";
import { useUIStore } from "@/stores/ui";
import { updateJocFee, deleteJocFee, createCandidatePayment } from "@/services/candidates";
import { updatePlacementIncome, deletePlacementIncome, createPlacementIncomePayment } from "@/services/placementIncomes";

const GRID_COLS =
  "grid-cols-[1.8fr_1.6fr_1.4fr_1fr_1fr_1.2fr_120px]";

function IconButton({ title, onClick, disabled, tone = "default", children }) {
  const toneClass =
    tone === "danger"
      ? "text-red-600 hover:text-red-700 hover:border-red-300"
      : "text-slate-700 hover:text-slate-900 hover:border-slate-300";
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 ${toneClass}`}
    >
      {children}
    </button>
  );
}

function IconPlus(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function IconPencil(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  );
}

function IconTrash(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

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

  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [addPaymentModalOpen, setAddPaymentModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Edit form states
  const [editTotalFee, setEditTotalFee] = useState("");
  const [editDueDate, setEditDueDate] = useState("");

  // Add payment form states
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentRemarks, setPaymentRemarks] = useState("");

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

  function handleEdit(item) {
    setSelectedItem(item);
    setEditTotalFee(String(item.total_amount || ""));
    setEditDueDate(
      item.due_date ? dayjs(item.due_date).format("YYYY-MM-DD") : ""
    );
    setEditModalOpen(true);
  }

  function handleDelete(item) {
    setSelectedItem(item);
    setDeleteModalOpen(true);
  }

  function handleAddPayment(item) {
    setSelectedItem(item);
    setPaymentAmount("");
    setPaymentDate(dayjs().format("YYYY-MM-DDTHH:mm"));
    setPaymentRemarks("");
    setAddPaymentModalOpen(true);
  }

  async function handleEditSave() {
    if (!selectedItem || saving) return;
    setSaving(true);
    try {
      if (selectedItem.source === "JOC_FEE_PENDING") {
        const totalFee = Number(editTotalFee);
        if (!Number.isFinite(totalFee) || totalFee <= 0) {
          throw new Error("Total fee must be greater than 0");
        }
        await updateJocFee(selectedItem.id, {
          total_fee: totalFee,
          due_date: editDueDate ? new Date(`${editDueDate}T00:00:00Z`).toISOString() : null,
        });
        pushToast({
          title: "JOC fee updated",
          description: "JOC fee has been updated successfully.",
        });
      } else if (selectedItem.source === "PLACEMENT_INCOME_PENDING") {
        const totalReceivable = Number(editTotalFee);
        if (!Number.isFinite(totalReceivable) || totalReceivable <= 0) {
          throw new Error("Total receivable must be greater than 0");
        }
        await updatePlacementIncome(selectedItem.id, {
          total_receivable: totalReceivable,
          due_date: editDueDate ? new Date(`${editDueDate}T00:00:00Z`).toISOString() : null,
        });
        pushToast({
          title: "Placement income updated",
          description: "Placement income has been updated successfully.",
        });
      }
      setEditModalOpen(false);
      setSelectedItem(null);
      // Reload pending dues
      const iso =
        dueBefore && dayjs(dueBefore).isValid()
          ? dayjs(dueBefore).endOf("day").toISOString()
          : dayjs().endOf("month").toISOString();
      const result = await api.get("payments/pending-dues", { params: { due_before: iso } });
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
      setPending({ ...totals, items });
    } catch (error) {
      pushToast({
        title: "Failed to update",
        description: (error && error.message) || "An error occurred while updating.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!selectedItem || deleting) return;
    setDeleting(true);
    try {
      if (selectedItem.source === "JOC_FEE_PENDING") {
        await deleteJocFee(selectedItem.id);
        pushToast({
          title: "JOC fee deleted",
          description: "JOC fee has been deleted successfully.",
        });
      } else if (selectedItem.source === "PLACEMENT_INCOME_PENDING") {
        await deletePlacementIncome(selectedItem.id);
        pushToast({
          title: "Placement income deleted",
          description: "Placement income has been deleted successfully.",
        });
      }
      setDeleteModalOpen(false);
      setSelectedItem(null);
      // Reload pending dues
      const iso =
        dueBefore && dayjs(dueBefore).isValid()
          ? dayjs(dueBefore).endOf("day").toISOString()
          : dayjs().endOf("month").toISOString();
      const result = await api.get("payments/pending-dues", { params: { due_before: iso } });
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
      setPending({ ...totals, items });
    } catch (error) {
      pushToast({
        title: "Failed to delete",
        description: (error && error.message) || "An error occurred while deleting.",
      });
    } finally {
      setDeleting(false);
    }
  }

  async function handleAddPaymentSave() {
    if (!selectedItem || saving) return;
    setSaving(true);
    try {
      const amount = Number(paymentAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Payment amount must be greater than 0");
      }
      if (!paymentDate) {
        throw new Error("Payment date is required");
      }
      const paymentDateIso = new Date(paymentDate).toISOString();

      if (selectedItem.source === "JOC_FEE_PENDING") {
        await createCandidatePayment(selectedItem.candidate_id, {
          amount,
          payment_date: paymentDateIso,
          remarks: paymentRemarks || undefined,
        });
        pushToast({
          title: "Payment added",
          description: "Payment has been added successfully.",
        });
      } else if (selectedItem.source === "PLACEMENT_INCOME_PENDING") {
        await createPlacementIncomePayment(selectedItem.id, {
          amount,
          payment_date: paymentDateIso,
          remarks: paymentRemarks || undefined,
        });
        pushToast({
          title: "Payment added",
          description: "Payment has been added successfully.",
        });
      }
      setAddPaymentModalOpen(false);
      setSelectedItem(null);
      // Reload pending dues
      const iso =
        dueBefore && dayjs(dueBefore).isValid()
          ? dayjs(dueBefore).endOf("day").toISOString()
          : dayjs().endOf("month").toISOString();
      const result = await api.get("payments/pending-dues", { params: { due_before: iso } });
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
      setPending({ ...totals, items });
    } catch (error) {
      pushToast({
        title: "Failed to add payment",
        description: (error && error.message) || "An error occurred while adding payment.",
      });
    } finally {
      setSaving(false);
    }
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
        <div className={`grid ${GRID_COLS} bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-600`}>
          <div>Candidate</div>
          <div>Contact</div>
          <div>Source</div>
          <div className="text-right">Amount</div>
          <div className="text-right">Received</div>
          <div className="text-right">Balance</div>
          <div className="text-center">Actions</div>
        </div>
        <div className="divide-y divide-slate-200 bg-white">
          {(pending.items || []).map((item) => {
            const candidateId = item?.candidate_id ? String(item.candidate_id) : "";
            return (
              <div
                key={`${item?.source || "item"}-${item?.id || item?.company_id || Math.random()}`}
                className={`grid ${GRID_COLS} items-center px-4 py-3 text-sm text-slate-900 hover:bg-slate-50`}
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
                <div className="flex items-center justify-center gap-2">
                  <IconButton title="Add payment" onClick={() => handleAddPayment(item)}>
                    <IconPlus />
                  </IconButton>
                  <IconButton title="Edit" onClick={() => handleEdit(item)}>
                    <IconPencil />
                  </IconButton>
                  <IconButton title="Delete" tone="danger" onClick={() => handleDelete(item)}>
                    <IconTrash />
                  </IconButton>
                </div>
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

      {/* Edit Modal */}
      <Modal
        open={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedItem(null);
        }}
        title={selectedItem?.source === "JOC_FEE_PENDING" ? "Edit JOC Fee" : "Edit Placement Income"}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              {selectedItem?.source === "JOC_FEE_PENDING" ? "Total Fee *" : "Total Receivable *"}
            </label>
            <Input
              type="number"
              min="0"
              step="1"
              value={editTotalFee}
              onChange={(e) => setEditTotalFee(e.target.value)}
              placeholder="Enter amount"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">Due Date</label>
            <Input
              type="date"
              value={editDueDate}
              onChange={(e) => setEditDueDate(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditModalOpen(false);
                setSelectedItem(null);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleEditSave} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedItem(null);
        }}
        title={selectedItem?.source === "JOC_FEE_PENDING" ? "Delete JOC Fee" : "Delete Placement Income"}
      >
        <div className="space-y-4">
          <div className="text-sm text-slate-600">
            Are you sure you want to delete this {selectedItem?.source === "JOC_FEE_PENDING" ? "JOC fee" : "placement income"}? This action cannot be undone.
          </div>
          {selectedItem && (
            <div className="rounded-md bg-slate-50 p-3 text-xs">
              <div className="font-medium text-slate-900">
                {selectedItem.candidate_name || "Unknown candidate"}
              </div>
              <div className="mt-1 text-slate-600">
                {selectedItem.source === "JOC_FEE_PENDING" ? "Total Fee" : "Total Receivable"}: {formatCurrency(selectedItem.total_amount)}
              </div>
              <div className="text-slate-600">Balance: {formatCurrency(selectedItem.balance)}</div>
            </div>
          )}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteModalOpen(false);
                setSelectedItem(null);
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteConfirm} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Payment Modal */}
      <Modal
        open={addPaymentModalOpen}
        onClose={() => {
          setAddPaymentModalOpen(false);
          setSelectedItem(null);
        }}
        title="Add Payment"
      >
        <div className="space-y-4">
          <div className="text-xs text-slate-600">
            Add a payment for {selectedItem?.candidate_name || "this candidate"}.
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">Payment Amount *</label>
            <Input
              type="number"
              min="0"
              step="1"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="Enter amount"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">Payment Date & Time *</label>
            <Input
              type="datetime-local"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">Remarks</label>
            <Input
              type="text"
              value={paymentRemarks}
              onChange={(e) => setPaymentRemarks(e.target.value)}
              placeholder="Optional remarks"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAddPaymentModalOpen(false);
                setSelectedItem(null);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleAddPaymentSave} disabled={saving}>
              {saving ? "Adding..." : "Add Payment"}
            </Button>
          </div>
        </div>
      </Modal>
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
