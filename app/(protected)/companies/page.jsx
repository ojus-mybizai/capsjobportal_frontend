"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useUIStore } from "@/stores/ui";
import { useAuthStore } from "@/stores/auth";
import { useMastersStore } from "@/stores/masters";
import { deleteCompany, listCompanies, getPublicCompany } from "@/services/companies";
import PaginatedTable from "@/components/table/PaginatedTable";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import StatusPill from "@/components/ui/StatusPill";

const PAGE_SIZE = 10;

export default function CompaniesPage() {
  return (
    <Suspense>
      <CompaniesPageInner />
    </Suspense>
  );
}

function CompaniesPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setPageMetadata = useUIStore((state) => state.setPageMetadata);
  const pushToast = useUIStore((state) => state.pushToast);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const qParam = searchParams.get("q") || "";
  const companyStatusParam = searchParams.get("company_status") || "";
  const verificationStatusParam = searchParams.get("verification_status") || "";
  const categoryIdParam = searchParams.get("category_id") || "";
  const locationAreaIdParam = searchParams.get("location_area_id") || "";
  const pageParamRaw = searchParams.get("page");
  const page = pageParamRaw ? Math.max(1, Number(pageParamRaw) || 1) : 1;

  const [query, setQuery] = useState(qParam);

  const loadMaster = useMastersStore((state) => state.loadMaster);
  const getOptions = useMastersStore((state) => state.getOptions);

  useEffect(() => {
    setPageMetadata("Companies", "Manage hiring companies");
  }, [setPageMetadata]);

  useEffect(() => {
    loadMaster("company_category").catch(() => {});
    loadMaster("location").catch(() => {});
  }, [loadMaster]);

  useEffect(() => {
    setQuery(qParam);
  }, [qParam]);

  useEffect(() => {
    const t = setTimeout(() => {
      const next = (query || "").trim();
      const params = new URLSearchParams(searchParams.toString());
      if (next) params.set("q", next);
      else params.delete("q");
      params.set("page", "1");

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function setParam(key, value) {
    const params = new URLSearchParams(searchParams.toString());
    if (value == null || value === "") params.delete(key);
    else params.set(key, String(value));
    params.set("page", "1");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  async function handleDeleteCompany(company) {
    const id = company && company.id != null ? String(company.id) : "";
    if (!id) return;

    const confirmed =
      typeof window !== "undefined" &&
      window.confirm("Delete this company? This action cannot be undone.");
    if (!confirmed) return;

    try {
      await deleteCompany(id);
      pushToast({
        title: "Company deleted",
        description: "The company was deleted successfully.",
      });
      setRefreshTick(Date.now());
    } catch (error) {
      pushToast({
        title: "Failed to delete company",
        description:
          (error && error.message) || "An error occurred while deleting the company.",
      });
    }
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString());
    [
      "q",
      "company_status",
      "verification_status",
      "category_id",
      "location_area_id",
      "page",
    ].forEach((k) => params.delete(k));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const result = await listCompanies({
          page,
          limit: PAGE_SIZE,
          q: qParam || undefined,
          company_status: companyStatusParam || undefined,
          verification_status:
            verificationStatusParam === ""
              ? undefined
              : verificationStatusParam === "true"
              ? true
              : false,
          category_id: categoryIdParam || undefined,
          location_area_id: locationAreaIdParam || undefined,
        });
        if (!active) return;

        const items = Array.isArray(result?.items)
          ? result.items
          : Array.isArray(result?.data)
          ? result.data
          : Array.isArray(result)
          ? result
          : [];

        const totalCount =
          typeof result?.total === "number"
            ? result.total
            : typeof result?.count === "number"
            ? result.count
            : items.length;

        setRows(items);
        setTotal(totalCount);
      } catch (error) {
        if (!active) return;
        pushToast({
          title: "Failed to load companies",
          description:
            (error && error.message) ||
            "An error occurred while loading companies.",
        });
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [page, qParam, companyStatusParam, verificationStatusParam, categoryIdParam, locationAreaIdParam, refreshTick, pushToast]);

  const columns = [
    { key: "name", label: "Name" },
    {
      key: "category_name",
      label: "Category",
      render: (value, row) =>
        value || row.category || row.category_label || "-",
    },
    {
      key: "location_area_name",
      label: "Location",
      render: (value, row) => value || row.location || "-",
    },
    {
      key: "verification_status",
      label: "Verified",
      render: (value) => {
        const label = value ? "Verified" : "Not verified";
        return <StatusPill status={label} />;
      },
    },
    {
      key: "company_status",
      label: "Status",
      render: (value) => (value ? <StatusPill status={value} /> : "-"),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 rounded-xl bg-[var(--bg)] p-3 ring-1 ring-[var(--border)] md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-end">
          <div className="min-w-[260px]">
            <div className="mb-1 text-xs font-medium text-slate-600">Search</div>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search companies…"
            />
          </div>

          <div className="min-w-[200px]">
            <div className="mb-1 text-xs font-medium text-slate-600">Category</div>
            <Select
              value={categoryIdParam}
              onChange={(e) => setParam("category_id", e.target.value)}
            >
              <option value="">All</option>
              {getOptions("company_category").map((opt) => (
                <option key={String(opt.value)} value={String(opt.value)}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="min-w-[200px]">
            <div className="mb-1 text-xs font-medium text-slate-600">Location</div>
            <Select
              value={locationAreaIdParam}
              onChange={(e) => setParam("location_area_id", e.target.value)}
            >
              <option value="">All</option>
              {getOptions("location").map((opt) => (
                <option key={String(opt.value)} value={String(opt.value)}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="min-w-[180px]">
            <div className="mb-1 text-xs font-medium text-slate-600">Status</div>
            <Select
              value={companyStatusParam}
              onChange={(e) => setParam("company_status", e.target.value)}
            >
              <option value="">All</option>
              <option value="PAID">PAID</option>
              <option value="FREE">FREE</option>
            </Select>
          </div>

          <div className="min-w-[180px]">
            <div className="mb-1 text-xs font-medium text-slate-600">Verified</div>
            <Select
              value={verificationStatusParam}
              onChange={(e) => setParam("verification_status", e.target.value)}
            >
              <option value="">All</option>
              <option value="true">Verified</option>
              <option value="false">Not verified</option>
            </Select>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setQuery("");
              clearFilters();
            }}
          >
            Clear
          </Button>
        </div>

        <div className="flex items-center justify-between gap-2 md:justify-end">
          <div className="text-xs text-slate-500">{loading ? "Loading…" : null}</div>
          <Link href="/companies/new">
            <Button size="sm">Add company</Button>
          </Link>
        </div>
      </div>
      <PaginatedTable
        columns={columns}
        rows={rows}
        page={page}
        limit={PAGE_SIZE}
        total={total}
        onPageChange={(nextPage) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("page", String(nextPage));
          const qs = params.toString();
          router.replace(qs ? `${pathname}?${qs}` : pathname);
        }}
        renderActions={(row) => (
          <div className="flex items-center justify-end gap-2">
            <ShareCompanyMenu company={row} onCopied={() => pushToast({
              title: "Copied",
              description: "Company details copied to clipboard",
            })} />
            <Link
              href={`/jobs?company_id=${encodeURIComponent(
                row && row.id != null ? String(row.id) : ""
              )}`}
              className="text-xs text-slate-600 hover:underline"
            >
              Jobs
            </Link>
            <Link
              href={`/companies/${row.id}`}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              View / Edit
            </Link>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => handleDeleteCompany(row)}
            >
              Delete
            </Button>
          </div>
        )}
      />
    </div>
  );
}

function buildPublicUrl(company) {
  const origin = typeof window !== "undefined" && window.location ? window.location.origin : "";

  function normalizeId(value) {
    if (value == null) return "";
    const raw = String(value);
    const trimmed = raw.trim();
    if (!trimmed) return "";
    const parts = trimmed.split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : trimmed;
  }

  const id = normalizeId(company && company.id != null ? company.id : "");

  const user = useAuthStore.getState().user;
  const userUuid = normalizeId(user && (user.uuid || user.user_uuid || user.userUuid || user.id));

  if (origin && userUuid && id) {
    return `${origin}/public/company/${userUuid}/${id}`;
  }

  return origin && id ? `${origin}/public/companies/${id}` : "";
}

function buildShareText(company, publicUrl) {
  const name = (company && company.name) || "-";
  const location =
    (company && (company.location_area_name || company.location)) || "-";
  const category =
    (company && (company.category_name || company.category || company.category_label)) || "-";

  return `Company: ${name}\nLocation: ${location}\nCategory: ${category}\n\nView details:\n${publicUrl}`;
}

function buildClipboardText(publicCompany, publicUrl) {
  const name = (publicCompany && publicCompany.name) || "-";
  const address = (publicCompany && publicCompany.address) || "-";
  const category = (publicCompany && publicCompany.category_name) || "-";
  const location = (publicCompany && publicCompany.location_area_name) || "-";
  const contactPerson = (publicCompany && publicCompany.contact_person) || "-";
  const contactNumber = (publicCompany && publicCompany.contact_number) || "-";
  const alternateNumber = (publicCompany && publicCompany.alternate_number) || "-";
  const email = (publicCompany && publicCompany.email) || "-";
  const googleMapUrl = (publicCompany && publicCompany.google_map_url) || "-";
  const locationLink = (publicCompany && publicCompany.location_link) || "-";

  return `Company: ${name}\nCategory: ${category}\nLocation: ${location}\n\nAddress: ${address}\nContact person: ${contactPerson}\nContact number: ${contactNumber}\nAlternate number: ${alternateNumber}\nEmail: ${email}\nGoogle map: ${googleMapUrl}\nLocation link: ${locationLink}\n\nView details:\n${publicUrl}`;
}

function buildEmailBody(company, publicUrl) {
  const name = (company && company.name) || "-";
  const location =
    (company && (company.location_area_name || company.location)) || "-";
  const category =
    (company && (company.category_name || company.category || company.category_label)) || "-";

  return `Company: ${name}\nCategory: ${category}\nLocation: ${location}\n\nView details:\n${publicUrl}`;
}

function ShareCompanyMenu({ company, onCopied }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const user = useAuthStore((state) => state.user);

  function normalizeId(value) {
    if (value == null) return "";
    const raw = String(value);
    const trimmed = raw.trim();
    if (!trimmed) return "";
    const parts = trimmed.split("/").filter(Boolean);
    return parts.length ? parts[parts.length - 1] : trimmed;
  }

  useEffect(() => {
    if (!open) return;

    function onKeyDown(e) {
      if (e.key === "Escape") {
        setOpen(false);
        if (buttonRef.current) buttonRef.current.focus();
      }
    }

    function onMouseDown(e) {
      const target = e.target;
      if (!target) return;
      if (menuRef.current && menuRef.current.contains(target)) return;
      if (buttonRef.current && buttonRef.current.contains(target)) return;
      setOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
    };
  }, [open]);

  const publicUrl = buildPublicUrl(company);
  const shareText = buildShareText(company, publicUrl);
  const emailSubject = `Company Details – ${(company && company.name) || ""}`;
  const emailBody = buildEmailBody(company, publicUrl);

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const mailHref = `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(
    emailBody
  )}`;

  async function copyText(text) {
    await navigator.clipboard.writeText(text);
    if (onCopied) onCopied();
  }

  async function copyCompanyDetails() {
    const userUuid = normalizeId(user && (user.uuid || user.user_uuid || user.userUuid || user.id));
    const companyUuid = normalizeId(company && company.id != null ? company.id : "");

    if (!userUuid || !companyUuid) {
      await copyText(shareText);
      return;
    }

    const data = await getPublicCompany(userUuid, companyUuid);
    const text = buildClipboardText(data, publicUrl);
    await copyText(text);
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex h-7 w-7 items-center justify-center rounded-md px-0 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-70"
        aria-label="Share company"
        title="Share company"
        onClick={() => setOpen((v) => !v)}
      >
        🔗
      </button>

      {open && (
        <div
          ref={menuRef}
          className="absolute right-0 z-50 mt-2 w-80 rounded-xl bg-[var(--bg)] p-2 shadow-lg ring-1 ring-[var(--border)]"
          role="menu"
          aria-label="Share company menu"
        >
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            WhatsApp
          </a>

          <a
            href={mailHref}
            className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Email
          </a>

          <button
            type="button"
            className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            role="menuitem"
            aria-label="Copy company details to clipboard"
            onClick={async () => {
              try {
                await copyCompanyDetails();
              } finally {
                setOpen(false);
              }
            }}
          >
            Copy to Clipboard
          </button>

          <div className="mt-2 rounded-lg bg-[var(--bg-muted)] p-3">
            <div className="text-xs font-medium text-slate-600">Public View URL</div>
            <div className="mt-2 flex items-center gap-2">
              <input
                className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm text-slate-700 outline-none"
                readOnly
                value={publicUrl || ""}
                aria-label="Public company URL"
                onFocus={(e) => e.target.select()}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="Copy public URL"
                onClick={async () => {
                  if (!publicUrl) return;
                  await copyText(publicUrl);
                  setOpen(false);
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
