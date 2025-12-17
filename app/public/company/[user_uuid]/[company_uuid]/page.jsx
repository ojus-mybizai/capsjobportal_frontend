"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getPublicCompany } from "@/services/companies";
import Button from "@/components/ui/Button";

export default function PublicCompanyDetailPage() {
  const params = useParams();
  const userUuid = params?.user_uuid;
  const companyUuid = params?.company_uuid;

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);
  const [error, setError] = useState(null);

  const publicUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const origin = window.location?.origin || "";
    const u = userUuid != null ? String(userUuid) : "";
    const c = companyUuid != null ? String(companyUuid) : "";
    return origin && u && c ? `${origin}/public/company/${u}/${c}` : "";
  }, [userUuid, companyUuid]);

  useEffect(() => {
    if (!userUuid || !companyUuid) return;

    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getPublicCompany(String(userUuid), String(companyUuid));
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
  }, [userUuid, companyUuid]);

  const title = (company && company.name) || "Company";

  const address = (company && company.address) || "-";
  const category = (company && company.category_name) || "-";
  const location = (company && company.location_area_name) || "-";
  const contactPerson = (company && company.contact_person) || "-";
  const contactNumber = (company && company.contact_number) || "-";
  const alternateNumber = (company && company.alternate_number) || "-";
  const email = (company && company.email) || "-";

  const googleMapUrl = (company && company.google_map_url) || "";
  const locationLink = (company && company.location_link) || "";

  const visitingCardUrl = (company && company.visiting_card_url) || "";
  const frontImageUrl = (company && company.front_image_url) || "";

  const errorMessage =
    (error && error.message) ||
    "This company details page is not available. It may have been removed or the link is invalid.";

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-10">
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
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-[var(--bg)] p-6 shadow-sm ring-1 ring-[var(--border)]">
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailField label="Company" value={title} />
                <DetailField label="Category" value={category} />
                <DetailField label="Location" value={location} />
                <DetailField label="Address" value={address} />
                <DetailField label="Contact person" value={contactPerson} />
                <DetailField label="Contact number" value={contactNumber} />
                <DetailField label="Alternate number" value={alternateNumber} />
                <DetailField label="Email" value={email} />

                <DetailLink label="Google map URL" href={googleMapUrl} />
                <DetailLink label="Location link" href={locationLink} />
              </div>
            </div>

            <div className="rounded-2xl bg-[var(--bg)] p-6 shadow-sm ring-1 ring-[var(--border)]">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Images
              </div>

              <div className="mt-4 space-y-4">
                <ImageBlock label="Front image" src={frontImageUrl} />
                <ImageBlock label="Visiting card" src={visitingCardUrl} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--bg)] p-6 shadow-sm ring-1 ring-[var(--border)]">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Share link
            </div>
            <div className="mt-2 break-all text-sm text-slate-700">{publicUrl || "-"}</div>
          </div>
        </>
      )}
    </div>
  );
}

function DetailField({ label, value }) {
  return (
    <div className="rounded-xl bg-[var(--bg-muted)] p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-sm font-medium text-slate-800">{value || "-"}</div>
    </div>
  );
}

function DetailLink({ label, href }) {
  const safeHref = typeof href === "string" ? href.trim() : "";
  return (
    <div className="rounded-xl bg-[var(--bg-muted)] p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      {safeHref ? (
        <a
          href={safeHref}
          target="_blank"
          rel="noreferrer"
          className="mt-2 block break-all text-sm font-medium text-[var(--accent)] hover:underline"
        >
          {safeHref}
        </a>
      ) : (
        <div className="mt-2 text-sm font-medium text-slate-800">-</div>
      )}
    </div>
  );
}

function ImageBlock({ label, src }) {
  const safeSrc = typeof src === "string" ? src.trim() : "";

  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      {safeSrc ? (
        <a href={safeSrc} target="_blank" rel="noreferrer" className="block">
          <img
            src={safeSrc}
            alt={label}
            className="mt-2 w-full rounded-xl border border-[var(--border)] bg-white object-contain"
          />
        </a>
      ) : (
        <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] p-4 text-sm text-slate-600">
          No image
        </div>
      )}
    </div>
  );
}
