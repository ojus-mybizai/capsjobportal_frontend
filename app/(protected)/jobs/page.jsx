"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useUIStore } from "@/stores/ui";
import { useMastersStore } from "@/stores/masters";
import { deleteJob, listJobs } from "@/services/jobs";
import { listCompanies } from "@/services/companies";
import PaginatedTable from "@/components/table/PaginatedTable";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import StatusPill from "@/components/ui/StatusPill";
import AsyncSearchSelect from "@/components/ui/AsyncSearchSelect";

const PAGE_SIZE = 10;

export default function JobsPage() {
  return (
    <Suspense>
      <JobsPageInner />
    </Suspense>
  );
}

function JobsPageInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();

  const setPageMetadata = useUIStore((state) => state.setPageMetadata);
  const pushToast = useUIStore((state) => state.pushToast);
  const getOptions = useMastersStore((state) => state.getOptions);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [locationOptions, setLocationOptions] = useState([]);
  const [refreshTick, setRefreshTick] = useState(0);

  const qParam = searchParams.get("q") || "";
  const statusParam = searchParams.get("status") || "";
  const jobTypeParam = searchParams.get("job_type") || "";
  const locationAreaIdParam = searchParams.get("location_area_id") || "";
  const companyIdParam = searchParams.get("company_id") || "";
  const genderParam = searchParams.get("gender") || "";
  const minSalaryParam = searchParams.get("min_salary") || "";
  const maxSalaryParam = searchParams.get("max_salary") || "";
  const vacanciesMinParam = searchParams.get("vacancies_min") || "";
  const vacanciesMaxParam = searchParams.get("vacancies_max") || "";
  const createdFromParam = searchParams.get("created_from") || "";
  const createdToParam = searchParams.get("created_to") || "";
  const isActiveParam = searchParams.get("is_active") || "";
  const sortByParam = searchParams.get("sort_by") || "";
  const orderParam = searchParams.get("order") || "";
  const skillsParam = searchParams.getAll("skills");
  const pageParamRaw = searchParams.get("page");
  const page = pageParamRaw ? Math.max(1, Number(pageParamRaw) || 1) : 1;

  const filtersKey = [
    qParam,
    statusParam,
    jobTypeParam,
    genderParam,
    locationAreaIdParam,
    companyIdParam,
    minSalaryParam,
    maxSalaryParam,
    vacanciesMinParam,
    vacanciesMaxParam,
    createdFromParam,
    createdToParam,
    isActiveParam,
    sortByParam,
    orderParam,
    (skillsParam || []).join(","),
  ].join("|");

  const [query, setQuery] = useState(qParam);
  const [skillsText, setSkillsText] = useState((skillsParam || []).join(", "));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const activeFilters = useMemo(() => {
    const items = [];
    if (statusParam) items.push({ key: "status", label: "Status", value: statusParam });
    if (jobTypeParam) items.push({ key: "job_type", label: "Job type", value: jobTypeParam });
    if (genderParam) items.push({ key: "gender", label: "Gender", value: genderParam });
    if (locationAreaIdParam)
      items.push({ key: "location_area_id", label: "Location", value: locationAreaIdParam });
    if (companyIdParam) items.push({ key: "company_id", label: "Company", value: companyIdParam });
    if (minSalaryParam) items.push({ key: "min_salary", label: "Min salary", value: minSalaryParam });
    if (maxSalaryParam) items.push({ key: "max_salary", label: "Max salary", value: maxSalaryParam });
    if (vacanciesMinParam)
      items.push({ key: "vacancies_min", label: "Vacancies min", value: vacanciesMinParam });
    if (vacanciesMaxParam)
      items.push({ key: "vacancies_max", label: "Vacancies max", value: vacanciesMaxParam });
    if (createdFromParam)
      items.push({ key: "created_from", label: "Created from", value: createdFromParam });
    if (createdToParam) items.push({ key: "created_to", label: "Created to", value: createdToParam });
    if (isActiveParam) items.push({ key: "is_active", label: "Active", value: isActiveParam });
    if (sortByParam) items.push({ key: "sort_by", label: "Sort by", value: sortByParam });
    if (orderParam) items.push({ key: "order", label: "Order", value: orderParam });
    if (skillsParam && skillsParam.length)
      items.push({ key: "skills", label: "Skills", value: skillsParam.join(", ") });
    return items;
  }, [
    companyIdParam,
    createdFromParam,
    createdToParam,
    genderParam,
    isActiveParam,
    jobTypeParam,
    locationAreaIdParam,
    maxSalaryParam,
    minSalaryParam,
    orderParam,
    skillsParam,
    sortByParam,
    statusParam,
    vacanciesMaxParam,
    vacanciesMinParam,
  ]);

  useEffect(() => {
    setPageMetadata("Jobs", "Manage job openings");
  }, [setPageMetadata]);

  useEffect(() => {
    setQuery(qParam);
  }, [qParam]);

  useEffect(() => {
    setSkillsText((skillsParam || []).join(", "));
  }, [skillsParam.join("|")]);

  useEffect(() => {
    const hasAdvanced =
      !!jobTypeParam ||
      !!genderParam ||
      !!minSalaryParam ||
      !!maxSalaryParam ||
      !!vacanciesMinParam ||
      !!vacanciesMaxParam ||
      !!createdFromParam ||
      !!createdToParam ||
      !!isActiveParam ||
      !!sortByParam ||
      !!orderParam ||
      (Array.isArray(skillsParam) && skillsParam.length > 0);
    if (hasAdvanced) setShowAdvanced(true);
  }, [
    jobTypeParam,
    minSalaryParam,
    maxSalaryParam,
    vacanciesMinParam,
    vacanciesMaxParam,
    createdFromParam,
    createdToParam,
    isActiveParam,
    sortByParam,
    orderParam,
    skillsParam.join("|"),
  ]);

  useEffect(() => {
    const t = setTimeout(() => {
      const next = (query || "").trim();
      if (next === (qParam || "")) return;
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

  function setParam(key, value) {
    const params = new URLSearchParams(searchParamsString);
    if (value == null || value === "") params.delete(key);
    else params.set(key, String(value));
    params.set("page", "1");
    const qs = params.toString();
    if (qs === searchParamsString) return;
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function setMultiParam(key, values) {
    const params = new URLSearchParams(searchParamsString);
    params.delete(key);

    const items = Array.isArray(values) ? values : [];
    items
      .map((v) => (v == null ? "" : String(v).trim()))
      .filter(Boolean)
      .forEach((v) => params.append(key, v));

    params.set("page", "1");
    const qs = params.toString();
    if (qs === searchParamsString) return;
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParamsString);
    [
      "q",
      "status",
      "job_type",
      "gender",
      "location_area_id",
      "company_id",
      "min_salary",
      "max_salary",
      "vacancies_min",
      "vacancies_max",
      "skills",
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

  function clearSingleFilter(key) {
    if (key === "skills") {
      setSkillsText("");
      setMultiParam("skills", []);
      return;
    }
    setParam(key, "");
  }

  async function handleDeleteJob(job) {
    const id = job && job.id != null ? String(job.id) : "";
    const title = (job && (job.title || job.name)) || "";
    if (!id) return;

    const confirmed =
      typeof window !== "undefined" &&
      window.confirm(`Delete this job${title ? ` (${title})` : ""}? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await deleteJob(id);
      pushToast({
        title: "Job deleted",
        description: "The job was deleted successfully.",
      });
      setRefreshTick(Date.now());
    } catch (error) {
      pushToast({
        title: "Failed to delete job",
        description: (error && error.message) || "An error occurred while deleting the job.",
      });
    }
  }

  useEffect(() => {
    // Use masters directly from store - they're preloaded in client-layout
    const locOptions = getOptions("location");
    setLocationOptions(locOptions);
  }, [getOptions]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const result = await listJobs({
          page,
          limit: PAGE_SIZE,
          q: qParam || undefined,
          status: statusParam || undefined,
          job_type: jobTypeParam || undefined,
          gender: genderParam || undefined,
          location_area_id: locationAreaIdParam || undefined,
          company_id: companyIdParam || undefined,
          min_salary: minSalaryParam || undefined,
          max_salary: maxSalaryParam || undefined,
          vacancies_min: vacanciesMinParam || undefined,
          vacancies_max: vacanciesMaxParam || undefined,
          skills: Array.isArray(skillsParam) && skillsParam.length ? skillsParam : undefined,
          created_from: createdFromParam ? `${createdFromParam}T00:00:00` : undefined,
          created_to: createdToParam ? `${createdToParam}T23:59:59` : undefined,
          is_active:
            isActiveParam === "true"
              ? true
              : isActiveParam === "false"
              ? false
              : undefined,
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
          title: "Failed to load jobs",
          description:
            (error && error.message) ||
            "An error occurred while loading jobs.",
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

    return items;
  }

  async function resolveCompanyLabel({ value }) {
    if (!value) return "";
    return String(value);
  }

  function getCompanyOptionLabel(item) {
    if (!item) return "";
    return item.name || item.title || item.company_name || item.label || "";
  }

  function getCompanyOptionValue(item) {
    if (!item) return "";
    return item.id != null ? String(item.id) : item.value != null ? String(item.value) : "";
  }

  const columns = [
    { key: "title", label: "Title" },
    {
      key: "company_id",
      label: "Company",
      render: (_value, row) => {
        const id = row && row.company_id != null ? String(row.company_id) : null;
        const name =
          (row && (row.company_name || row.company_title || row.company?.name)) || "-";
        return id ? (
          <Link href={`/companies/${encodeURIComponent(id)}`} className="text-[var(--accent)] hover:underline">
            {name}
          </Link>
        ) : (
          name || "-"
        );
      },
    },
    {
      key: "location_area_id",
      label: "Location",
      render: (_value, row) => {
        return (
          (row && (row.location_area_name || row.location_area || row.location)) || "-"
        );
      },
    },
    {
      key: "num_vacancies",
      label: "Vacancies",
      render: (value, row) => {
        const v =
          value != null
            ? value
            : row.vacancies != null
            ? row.vacancies
            : null;
        return v != null ? v : "-";
      },
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (value ? <StatusPill status={value} /> : "-"),
    },
    {
      key: "interview_count",
      label: "Interviews",
      render: (_value, row) => {
        const id = row && row.id != null ? String(row.id) : "";
        const countRaw =
          row && row.interviews_count != null
            ? row.interviews_count
            : row && row.interviews_count != null
            ? row.interviews_count
            : 0;
        const count = Number(countRaw);
        const safeCount = Number.isFinite(count) ? count : 0;

        if (!id) return "-";

        if (safeCount > 0) {
          return (
            <button
              type="button"
              className="text-xs font-medium text-[var(--accent)] hover:underline"
              onClick={() => router.push(`/interviews?job_id=${encodeURIComponent(id)}`)}
              title="View interviews"
            >
              {safeCount}
            </button>
          );
        }

        return <span className="text-xs text-slate-500">0</span>;
      },
    },
    {
      key: "salary",
      label: "Salary",
      render: (_value, row) => {
        const min = row && typeof row.salary_min === "number" ? row.salary_min : null;
        const max = row && typeof row.salary_max === "number" ? row.salary_max : null;

        if (min != null && max != null) return `${min} - ${max}`;
        if (min != null) return String(min);
        if (max != null) return String(max);
        return "-";
      },
    },
  ];

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-xl bg-[var(--bg)] p-5 ring-1 ring-[var(--border)] shadow-sm transition-all duration-300 hover:-translate-y-[1px] hover:shadow-md">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[var(--bg-muted)]/60 via-transparent to-[var(--bg-muted)]/60 opacity-0 transition-opacity duration-500 hover:opacity-100" />
        <div className="flex flex-col gap-4 relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-wide text-slate-500">Job filters</div>
              <div className="text-base font-semibold text-slate-800">Find the right openings</div>
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
                  setSkillsText("");
                  clearFilters();
                }}
              >
                Clear all
              </Button>
              <Link href="/jobs/new">
                <Button size="sm">Add job</Button>
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
                placeholder="Search by title, keyword, or id…"
              />
            </div>

            <div className="md:col-span-3 space-y-1">
              <div className="text-[11px] font-medium text-slate-600">Company</div>
              <AsyncSearchSelect
                value={companyIdParam}
                onChange={(v) => setParam("company_id", v || "")}
                placeholder="All companies"
                searchPlaceholder="Search companies..."
                loadOptions={loadCompanyOptions}
                resolveSelectedLabel={resolveCompanyLabel}
                getOptionLabel={getCompanyOptionLabel}
                getOptionValue={getCompanyOptionValue}
                allowClear
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <div className="text-[11px] font-medium text-slate-600">Status</div>
              <Select value={statusParam} onChange={(e) => setParam("status", e.target.value)}>
                <option value="">All</option>
                <option value="OPEN">OPEN</option>
                <option value="FULFILLED">FULFILLED</option>
                <option value="DROPPED">DROPPED</option>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-1">
              <div className="text-[11px] font-medium text-slate-600">Job type</div>
              <Select value={jobTypeParam} onChange={(e) => setParam("job_type", e.target.value)}>
                <option value="">All</option>
                <option value="FULL_TIME">FULL_TIME</option>
                <option value="PART_TIME">PART_TIME</option>
                <option value="INTERNSHIP">INTERNSHIP</option>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-1">
              <div className="text-[11px] font-medium text-slate-600">Gender</div>
              <Select value={genderParam} onChange={(e) => setParam("gender", e.target.value)}>
                <option value="">All</option>
                <option value="MALE">MALE</option>
                <option value="FEMALE">FEMALE</option>
                <option value="OTHER">OTHER</option>
                <option value="BOTH">BOTH</option>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-12 md:items-end">
            <div className="md:col-span-3 space-y-1">
              <div className="text-[11px] font-medium text-slate-600">Location</div>
              <Select
                value={locationAreaIdParam}
                onChange={(e) => setParam("location_area_id", e.target.value)}
              >
                <option value="">All</option>
                {(Array.isArray(locationOptions) ? locationOptions : []).map((opt) => (
                  <option key={opt.value} value={String(opt.value)}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="md:col-span-3 space-y-1">
              <div className="text-[11px] font-medium text-slate-600">Salary range</div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={minSalaryParam}
                  onChange={(e) => setParam("min_salary", e.target.value)}
                  placeholder="Min"
                  inputMode="numeric"
                />
                <Input
                  value={maxSalaryParam}
                  onChange={(e) => setParam("max_salary", e.target.value)}
                  placeholder="Max"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="md:col-span-3 space-y-1">
              <div className="text-[11px] font-medium text-slate-600">Vacancies</div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={vacanciesMinParam}
                  onChange={(e) => setParam("vacancies_min", e.target.value)}
                  placeholder="Min"
                  inputMode="numeric"
                />
                <Input
                  value={vacanciesMaxParam}
                  onChange={(e) => setParam("vacancies_max", e.target.value)}
                  placeholder="Max"
                  inputMode="numeric"
                />
              </div>
            </div>

            <div className="md:col-span-3 space-y-1">
              <div className="text-[11px] font-medium text-slate-600">Active</div>
              <Select value={isActiveParam} onChange={(e) => setParam("is_active", e.target.value)}>
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Select>
            </div>
          </div>

          {showAdvanced ? (
            <div className="grid gap-3 md:grid-cols-12 md:items-end pt-2 border-t border-dashed border-[var(--border)]">
              <div className="md:col-span-4 space-y-1">
                <div className="text-[11px] font-medium text-slate-600">Skills (comma separated)</div>
                <Input
                  value={skillsText}
                  onChange={(e) => setSkillsText(e.target.value)}
                  onBlur={() => {
                    const values = (skillsText || "")
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);
                    setMultiParam("skills", values);
                  }}
                  placeholder="e.g. React, SQL, Python"
                />
              </div>

              <div className="md:col-span-3 space-y-1">
                <div className="text-[11px] font-medium text-slate-600">Created from</div>
                <Input
                  type="date"
                  value={createdFromParam}
                  onChange={(e) => setParam("created_from", e.target.value)}
                />
              </div>

              <div className="md:col-span-3 space-y-1">
                <div className="text-[11px] font-medium text-slate-600">Created to</div>
                <Input
                  type="date"
                  value={createdToParam}
                  onChange={(e) => setParam("created_to", e.target.value)}
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <div className="text-[11px] font-medium text-slate-600">Sort by</div>
                <Select value={sortByParam} onChange={(e) => setParam("sort_by", e.target.value)}>
                  <option value="">created_at</option>
                  <option value="updated_at">updated_at</option>
                  <option value="title">title</option>
                  <option value="status">status</option>
                  <option value="salary_min">salary_min</option>
                  <option value="salary_max">salary_max</option>
                  <option value="num_vacancies">num_vacancies</option>
                </Select>
              </div>

              <div className="md:col-span-2 space-y-1">
                <div className="text-[11px] font-medium text-slate-600">Order</div>
                <Select value={orderParam} onChange={(e) => setParam("order", e.target.value)}>
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
            <Link
              href={`/jobs/${row.id}`}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              View / Edit
            </Link>
            <Button type="button" variant="danger" size="sm" onClick={() => handleDeleteJob(row)}>
              Delete
            </Button>
          </div>
        )}
      />
    </div>
  );
}
