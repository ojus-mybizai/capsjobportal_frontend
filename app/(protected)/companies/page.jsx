"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
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
  const searchParamsString = searchParams.toString();

  const setPageMetadata = useUIStore((state) => state.setPageMetadata);
  const pushToast = useUIStore((state) => state.pushToast);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const qParam = searchParams.get("q") || "";
  const companyStatusParam = searchParams.get("company_status") || "";
  const verificationStatusParam =
    searchParams.get("verification_status") || searchParams.get("is_verified") || "";
  const categoryIdParam = searchParams.get("category_id") || "";
  const locationAreaIdParam = searchParams.get("location_area_id") || "";
  const createdByParam = searchParams.get("created_by") || "";
  const createdByIsNullParam = searchParams.get("created_by_is_null") || "";
  const emailParam = searchParams.get("email") || "";
  const contactNumberParam = searchParams.get("contact_number") || "";
  const createdFromParam = searchParams.get("created_from") || "";
  const createdToParam = searchParams.get("created_to") || "";
  const isActiveParam = searchParams.get("is_active") || "";
  const sortByParam = searchParams.get("sort_by") || "";
  const orderParam = searchParams.get("order") || "";
  const pageParamRaw = searchParams.get("page");
  const page = pageParamRaw ? Math.max(1, Number(pageParamRaw) || 1) : 1;

  const filtersKey = [
    qParam,
    companyStatusParam,
    verificationStatusParam,
    categoryIdParam,
    locationAreaIdParam,
    createdByParam,
    createdByIsNullParam,
    emailParam,
    contactNumberParam,
    createdFromParam,
    createdToParam,
    isActiveParam,
    sortByParam,
    orderParam,
  ].join("|");

  const [query, setQuery] = useState(qParam);
  const [email, setEmail] = useState(emailParam);
  const [contactNumber, setContactNumber] = useState(contactNumberParam);
  const [createdBy, setCreatedBy] = useState(createdByParam);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const activeFilters = useMemo(() => {
    const items = [];
    if (companyStatusParam) items.push({ key: "company_status", label: "Status", value: companyStatusParam });
    if (verificationStatusParam) items.push({ key: "verification_status", label: "Verified", value: verificationStatusParam });
    if (categoryIdParam) items.push({ key: "category_id", label: "Category", value: categoryIdParam });
    if (locationAreaIdParam) items.push({ key: "location_area_id", label: "Location", value: locationAreaIdParam });
    if (emailParam) items.push({ key: "email", label: "Email", value: emailParam });
    if (contactNumberParam) items.push({ key: "contact_number", label: "Contact", value: contactNumberParam });
    if (createdByParam) items.push({ key: "created_by", label: "Created by", value: createdByParam });
    if (createdByIsNullParam === "true") items.push({ key: "created_by_is_null", label: "Via Link", value: "Yes" });
    if (createdFromParam) items.push({ key: "created_from", label: "Created from", value: createdFromParam });
    if (createdToParam) items.push({ key: "created_to", label: "Created to", value: createdToParam });
    if (isActiveParam) items.push({ key: "is_active", label: "Active", value: isActiveParam });
    if (sortByParam) items.push({ key: "sort_by", label: "Sort by", value: sortByParam });
    if (orderParam) items.push({ key: "order", label: "Order", value: orderParam });
    return items;
  }, [
    companyStatusParam,
    verificationStatusParam,
    categoryIdParam,
    locationAreaIdParam,
    emailParam,
    contactNumberParam,
    createdByParam,
    createdByIsNullParam,
    createdFromParam,
    createdToParam,
    isActiveParam,
    sortByParam,
    orderParam,
  ]);

  const viaLinkChecked = createdByIsNullParam === "true";

  const getOptions = useMastersStore((state) => state.getOptions);

  useEffect(() => {
    setPageMetadata("Companies", "Manage hiring companies");
  }, [setPageMetadata]);

  useEffect(() => {
    setQuery(qParam);
  }, [qParam]);

  useEffect(() => {
    setEmail(emailParam);
  }, [emailParam]);

  useEffect(() => {
    setContactNumber(contactNumberParam);
  }, [contactNumberParam]);

  useEffect(() => {
    setCreatedBy(createdByParam);
  }, [createdByParam]);

  useEffect(() => {
    const hasAdvanced =
      !!emailParam ||
      !!contactNumberParam ||
      !!createdByParam ||
      !!createdFromParam ||
      !!createdToParam ||
      !!isActiveParam ||
      !!sortByParam ||
      !!orderParam;
    if (hasAdvanced) setShowAdvanced(true);
  }, [
    emailParam,
    contactNumberParam,
    createdByParam,
    createdFromParam,
    createdToParam,
    isActiveParam,
    sortByParam,
    orderParam,
  ]);

  useEffect(() => {
    const t = setTimeout(() => {
      const next = (query || "").trim();
      const params = new URLSearchParams(searchParamsString);
      if (next) params.set("q", next);
      else params.delete("q");
      params.set("page", "1");

      const qs = params.toString();
      if (qs === searchParamsString) return;
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }, 300);
    return () => clearTimeout(t);
  }, [query, router, pathname, searchParamsString]);

  useEffect(() => {
    const t = setTimeout(() => {
      const next = (email || "").trim();
      const params = new URLSearchParams(searchParamsString);
      if (next) params.set("email", next);
      else params.delete("email");
      params.set("page", "1");
      const qs = params.toString();
      if (qs === searchParamsString) return;
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }, 300);
    return () => clearTimeout(t);
  }, [email, router, pathname, searchParamsString]);

  useEffect(() => {
    const t = setTimeout(() => {
      const next = (contactNumber || "").trim();
      const params = new URLSearchParams(searchParamsString);
      if (next) params.set("contact_number", next);
      else params.delete("contact_number");
      params.set("page", "1");
      const qs = params.toString();
      if (qs === searchParamsString) return;
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }, 300);
    return () => clearTimeout(t);
  }, [contactNumber, router, pathname, searchParamsString]);

  useEffect(() => {
    const t = setTimeout(() => {
      const next = (createdBy || "").trim();
      const params = new URLSearchParams(searchParamsString);
      if (next) params.set("created_by", next);
      else params.delete("created_by");
      params.set("page", "1");
      const qs = params.toString();
      if (qs === searchParamsString) return;
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }, 300);
    return () => clearTimeout(t);
  }, [createdBy, router, pathname, searchParamsString]);

  function setParam(key, value) {
    const params = new URLSearchParams(searchParamsString);
    if (value == null || value === "") params.delete(key);
    else params.set(key, String(value));

    if (key === "verification_status") {
      params.delete("is_verified");
    }

    if (key === "created_by") {
      params.delete("created_by_is_null");
    }

    params.set("page", "1");
    const qs = params.toString();
    if (qs === searchParamsString) return;
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function setViaLink(checked) {
    const params = new URLSearchParams(searchParamsString);

    if (checked) {
      params.set("created_by_is_null", "true");
      params.delete("created_by");
      setCreatedBy("");
    } else {
      params.delete("created_by_is_null");
    }

    params.set("page", "1");
    const qs = params.toString();
    if (qs === searchParamsString) return;
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function clearSingleFilter(key) {
    if (key === "email") setEmail("");
    if (key === "contact_number") setContactNumber("");
    if (key === "created_by") setCreatedBy("");
    if (key === "created_by_is_null") setViaLink(false);
    if (key === "created_from") setParam("created_from", "");
    if (key === "created_to") setParam("created_to", "");
    if (key === "verification_status") setParam("verification_status", "");
    if (key === "company_status") setParam("company_status", "");
    if (key === "category_id") setParam("category_id", "");
    if (key === "location_area_id") setParam("location_area_id", "");
    if (key === "is_active") setParam("is_active", "");
    if (key === "sort_by") setParam("sort_by", "");
    if (key === "order") setParam("order", "");
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
    const params = new URLSearchParams(searchParamsString);
    [
      "q",
      "company_status",
      "verification_status",
      "is_verified",
      "category_id",
      "location_area_id",
      "created_by",
      "created_by_is_null",
      "email",
      "contact_number",
      "created_from",
      "created_to",
      "is_active",
      "sort_by",
      "order",
      "page",
    ].forEach((k) => params.delete(k));
    const qs = params.toString();
    if (qs === searchParamsString) return;
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
          created_by: viaLinkChecked ? undefined : createdByParam || undefined,
          created_by_is_null: viaLinkChecked ? true : undefined,
          email: emailParam || undefined,
          contact_number: contactNumberParam || undefined,
          created_from: createdFromParam ? `${createdFromParam}T00:00:00` : undefined,
          created_to: createdToParam ? `${createdToParam}T23:59:59` : undefined,
          is_active:
            isActiveParam === "true" ? true : isActiveParam === "false" ? false : undefined,
          sort_by: sortByParam || undefined,
          order: orderParam || undefined,
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
  }, [page, filtersKey, refreshTick, pushToast]);

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

  const controlClass =
    "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[var(--accent)] focus:bg-white";

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-xl bg-[var(--bg)] p-5 ring-1 ring-[var(--border)] shadow-sm transition-all duration-300 hover:-translate-y-[1px] hover:shadow-md">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--bg-muted)]/60 via-transparent to-[var(--bg-muted)]/60 opacity-0 transition-opacity duration-500 hover:opacity-100" />
        <div className="flex flex-col gap-4 relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-wide text-slate-500">Company filters</div>
              <div className="text-base font-semibold text-slate-800">Find the right partners</div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAdvanced((v) => !v)}
              >
                {showAdvanced ? "Hide advanced" : "Advanced"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setEmail("");
                  setContactNumber("");
                  setCreatedBy("");
                  clearFilters();
                }}
              >
                Clear all
              </Button>
              <Link href="/companies/new">
                <Button size="sm">Add company</Button>
              </Link>
            </div>
          </div>

          {activeFilters.length ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-muted)]/70 p-2">
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Active
              </span>
              {activeFilters.map((f) => (
                <button
                  key={`${f.key}-${f.value}`}
                  type="button"
                  onClick={() => clearSingleFilter(f.key)}
                  className="flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm ring-1 ring-[var(--border)] hover:ring-[var(--accent)] transition"
                  title="Remove filter"
                >
                  <span className="text-slate-500">{f.label}:</span>
                  <span>{f.value}</span>
                  <span className="text-slate-400">×</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-[var(--border)] bg-[var(--bg-muted)]/40 px-3 py-2 text-xs text-slate-500">
              No active filters. Refine the list with quick picks below.
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-12 md:items-end">
            <div className="md:col-span-5 space-y-1">
              <div className="text-[11px] font-medium text-slate-600">Search</div>
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search companies…"
                className={controlClass}
              />
            </div>

            <div className="md:col-span-3 space-y-1">
              <div className="text-[11px] font-medium text-slate-600">Category</div>
              <Select
                value={categoryIdParam}
                onChange={(e) => setParam("category_id", e.target.value)}
                className={controlClass}
              >
                <option value="">All</option>
                {getOptions("company_category").map((opt) => (
                  <option key={String(opt.value)} value={String(opt.value)}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="md:col-span-2 space-y-1">
              <div className="text-[11px] font-medium text-slate-600">Location</div>
              <Select
                value={locationAreaIdParam}
                onChange={(e) => setParam("location_area_id", e.target.value)}
                className={controlClass}
              >
                <option value="">All</option>
                {getOptions("location").map((opt) => (
                  <option key={String(opt.value)} value={String(opt.value)}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="md:col-span-1.5 space-y-1">
              <div className="text-[11px] font-medium text-slate-600">Status</div>
              <Select
                value={companyStatusParam}
                onChange={(e) => setParam("company_status", e.target.value)}
                className={controlClass}
              >
                <option value="">All</option>
                <option value="PAID">PAID</option>
                <option value="FREE">FREE</option>
              </Select>
            </div>

            <div className="md:col-span-1.5 space-y-1">
              <div className="text-[11px] font-medium text-slate-600">Verified</div>
              <Select
                value={verificationStatusParam}
                onChange={(e) => setParam("verification_status", e.target.value)}
                className={controlClass}
              >
                <option value="">All</option>
                <option value="true">Verified</option>
                <option value="false">Not verified</option>
              </Select>
            </div>

            <div className="md:col-span-2 flex items-center gap-2">
              <input
                id="via-link"
                type="checkbox"
                checked={viaLinkChecked}
                onChange={(e) => setViaLink(e.target.checked)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
              <label htmlFor="via-link" className="text-sm font-medium text-slate-700">
                Via Link
              </label>
            </div>
          </div>

          {showAdvanced ? (
            <div className="grid gap-3 md:grid-cols-12 md:items-end pt-2 border-t border-dashed border-[var(--border)]">
              <div className="md:col-span-3 space-y-1">
                <div className="text-[11px] font-medium text-slate-600">Email</div>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email contains…"
                  className={controlClass}
                />
              </div>

              <div className="md:col-span-3 space-y-1">
                <div className="text-[11px] font-medium text-slate-600">Contact number</div>
                <Input
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="number contains…"
                  className={controlClass}
                />
              </div>

              <div className="md:col-span-3 space-y-1">
                <div className="text-[11px] font-medium text-slate-600">Created by</div>
                <Input
                  value={createdBy}
                  onChange={(e) => setCreatedBy(e.target.value)}
                  placeholder="user UUID"
                  className={controlClass}
                />
              </div>

              <div className="md:col-span-3 space-y-1">
                <div className="text-[11px] font-medium text-slate-600">Date created</div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    value={createdFromParam}
                    onChange={(e) => setParam("created_from", e.target.value)}
                    className={controlClass}
                  />
                  <Input
                    type="date"
                    value={createdToParam}
                    onChange={(e) => setParam("created_to", e.target.value)}
                    className={controlClass}
                  />
                </div>
              </div>

              <div className="md:col-span-2 space-y-1">
                <div className="text-[11px] font-medium text-slate-600">Active</div>
                <Select
                  value={isActiveParam}
                  onChange={(e) => setParam("is_active", e.target.value)}
                  className={controlClass}
                >
                  <option value="">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </Select>
              </div>

              <div className="md:col-span-2 space-y-1">
                <div className="text-[11px] font-medium text-slate-600">Sort by</div>
                <Select
                  value={sortByParam}
                  onChange={(e) => setParam("sort_by", e.target.value)}
                  className={controlClass}
                >
                  <option value="">created_at</option>
                  <option value="updated_at">updated_at</option>
                  <option value="name">name</option>
                  <option value="company_status">company_status</option>
                  <option value="verification_status">verification_status</option>
                </Select>
              </div>

              <div className="md:col-span-2 space-y-1">
                <div className="text-[11px] font-medium text-slate-600">Order</div>
                <Select
                  value={orderParam}
                  onChange={(e) => setParam("order", e.target.value)}
                  className={controlClass}
                >
                  <option value="">desc</option>
                  <option value="asc">asc</option>
                  <option value="desc">desc</option>
                </Select>
              </div>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="text-xs text-slate-500">{loading ? "Loading…" : null}</div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span>Showing page {page}</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span>{activeFilters.length} active filters</span>
            </div>
          </div>
        </div>
      </div>

      <PaginatedTable
        columns={columns}
        rows={rows}
        page={page}
        limit={PAGE_SIZE}
        total={total}
        onPageChange={(nextPage) => {
          const params = new URLSearchParams(searchParamsString);
          params.set("page", String(nextPage));
          const qs = params.toString();
          if (qs === searchParamsString) return;
          router.replace(qs ? `${pathname}?${qs}` : pathname);
        }}
        renderActions={(row) => (
          <div className="flex items-center justify-end gap-2">
            <ShareCompanyMenu
              company={row}
              onCopied={() =>
                pushToast({
                  title: "Copied",
                  description: "Company details copied to clipboard",
                })
              }
            />
            <Link
              href={`/jobs?company_id=${encodeURIComponent(
                row && row.id != null ? String(row.id) : ""
              )}`}
              className="text-[13px] text-[var(--muted-text)] hover:underline"
            >
              Jobs
            </Link>
            <Link
              href={`/companies/${row.id}`}
              className="text-[13px] text-[var(--accent)] hover:underline"
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
