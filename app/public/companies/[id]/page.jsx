"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getCompany } from "@/services/companies";
import Button from "@/components/ui/Button";

export default function PublicCompanyDetailPage() {
  const params = useParams();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState(null);

  const publicUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const origin = window.location?.origin || "";
    const cid = id != null ? String(id) : "";
    return origin && cid ? `${origin}/public/companies/${cid}` : "";
  }, [id]);

  useEffect(() => {
    if (!id) return;

    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getCompany(id);
        if (!active) return;
        setCompany(data || null);
      } catch (e) {
        if (!active) return;
        setCompany(null);
        setError(e);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [id]);

  const title = (company && (company.name || company.company_name || company.title)) || "Company";

  const category =
    (company && (company.category_name || company.category || company.category_label)) || "-";
  const location =
    (company && (company.location_area_name || company.location || company.location_label)) || "-";

  const address = (company && company.address) || "-";
  const contactPerson = (company && (company.contact_person || company.contactPerson)) || "-";
  const contactNumber = (company && (company.contact_number || company.contactNumber)) || "-";
  const email = (company && company.email) || "-";
  const notes = (company && company.notes) || "-";

  const errorMessage =
    (error && error.message) ||
    "This company details page is not available. It may require login or the company may not exist.";

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-10">
      <div className="rounded-2xl bg-[var(--bg)] p-6 shadow-sm ring-1 ring-[var(--border)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Public company profile
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text)]">
              {loading ? "Loading…" : title}
            </h1>
            <div className="mt-2 text-sm text-slate-600">
              Category: <span className="font-medium text-slate-800">{category}</span>
              <span className="mx-2">·</span>
              Location: <span className="font-medium text-slate-800">{location}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/login">
              <Button variant="outline" size="sm">
                Admin login
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-[var(--bg)] p-6 ring-1 ring-[var(--border)]">
          <div className="text-sm text-slate-600">Loading company details…</div>
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-[var(--bg)] p-6 ring-1 ring-[var(--border)]">
          <div className="text-sm font-semibold text-slate-800">Not available</div>
          <div className="mt-2 text-sm text-slate-600">{errorMessage}</div>
        </div>
      ) : !company ? (
        <div className="rounded-2xl bg-[var(--bg)] p-6 ring-1 ring-[var(--border)]">
          <div className="text-sm text-slate-600">No data found.</div>
        </div>
      ) : (
        <div className="rounded-2xl bg-[var(--bg)] p-6 shadow-sm ring-1 ring-[var(--border)]">
          <div className="grid gap-4 sm:grid-cols-2">
            <DetailField label="Company" value={title} />
            <DetailField label="Category" value={category} />
            <DetailField label="Location" value={location} />
            <DetailField label="Address" value={address} />
            <DetailField label="Contact person" value={contactPerson} />
            <DetailField label="Contact number" value={contactNumber} />
            <DetailField label="Email" value={email} />
            <DetailField label="Notes" value={notes} />
          </div>

          <div className="mt-6 rounded-xl bg-[var(--bg-muted)] p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Share link
            </div>
            <div className="mt-2 break-all text-sm text-slate-700">{publicUrl || "-"}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailField({ label, value }) {
  return (
    <div className="rounded-xl bg-[var(--bg-muted)] p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-medium text-slate-800">{value || "-"}</div>
    </div>
  );
}
