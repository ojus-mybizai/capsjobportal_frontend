"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useUIStore } from "@/stores/ui";
import { useMastersStore } from "@/stores/masters";
import { deleteJob, listJobs } from "@/services/jobs";
import { getCompany, listCompanies } from "@/services/companies";
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

  const setPageMetadata = useUIStore((state) => state.setPageMetadata);
  const pushToast = useUIStore((state) => state.pushToast);
  const loadMaster = useMastersStore((state) => state.loadMaster);
  const getOptions = useMastersStore((state) => state.getOptions);

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [companyMap, setCompanyMap] = useState({});
  const [locationMap, setLocationMap] = useState({});
  const [locationOptions, setLocationOptions] = useState([]);
  const [refreshTick, setRefreshTick] = useState(0);

  const qParam = searchParams.get("q") || "";
  const statusParam = searchParams.get("status") || "";
  const locationAreaIdParam = searchParams.get("location_area_id") || "";
  const companyIdParam = searchParams.get("company_id") || "";
  const pageParamRaw = searchParams.get("page");
  const page = pageParamRaw ? Math.max(1, Number(pageParamRaw) || 1) : 1;

  const [query, setQuery] = useState(qParam);

  const companyMapRef = useRef(companyMap);

  useEffect(() => {
    companyMapRef.current = companyMap;
  }, [companyMap]);

  useEffect(() => {
    setPageMetadata("Jobs", "Manage job openings");
  }, [setPageMetadata]);

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
  }, [query, router, pathname, searchParams]);

  function setParam(key, value) {
    const params = new URLSearchParams(searchParams.toString());
    if (value == null || value === "") params.delete(key);
    else params.set(key, String(value));
    params.set("page", "1");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  function clearFilters() {
    const params = new URLSearchParams(searchParams.toString());
    ["q", "status", "location_area_id", "company_id", "page"].forEach((k) => params.delete(k));
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
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
    let active = true;

    async function loadLookups() {
      try {
        // Locations
        await loadMaster("location");
        if (!active) return;
        const locOptions = getOptions("location_area");
        setLocationOptions(locOptions);
        const locMap = {};
        locOptions.forEach((opt) => {
          if (opt && opt.value != null) {
            locMap[String(opt.value)] = opt.label;
          }
        });
        setLocationMap(locMap);
      } catch (error) {
        if (!active) return;
        pushToast({
          title: "Failed to load lookup data",
          description:
            (error && error.message) ||
            "An error occurred while loading companies or locations.",
        });
      }
    }

    loadLookups();
    return () => {
      active = false;
    };
  }, [loadMaster, getOptions, pushToast]);

  useEffect(() => {
    let active = true;

    async function ensureCompanyLabels() {
      const ids = Array.from(
        new Set(
          (Array.isArray(rows) ? rows : [])
            .map((r) => (r && r.company_id != null ? String(r.company_id) : ""))
            .filter(Boolean)
        )
      );

      const missing = ids.filter((id) => !companyMapRef.current[id]);
      if (missing.length === 0) return;

      const updates = {};
      await Promise.all(
        missing.map(async (id) => {
          try {
            const c = await getCompany(id);
            updates[id] =
              c?.name || c?.title || c?.company_name || (id ? `Company #${id}` : "-");
          } catch {
            updates[id] = id ? `Company #${id}` : "-";
          }
        })
      );

      if (!active) return;
      setCompanyMap((prev) => ({ ...prev, ...updates }));
    }

    ensureCompanyLabels();
    return () => {
      active = false;
    };
  }, [rows]);

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
          location_area_id: locationAreaIdParam || undefined,
          company_id: companyIdParam || undefined,
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
  }, [page, qParam, statusParam, locationAreaIdParam, companyIdParam, refreshTick, pushToast]);

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
    const cached = companyMap && companyMap[String(value)];
    if (cached) return cached;
    try {
      const c = await getCompany(value);
      return c?.name || c?.title || c?.company_name || `Company #${value}`;
    } catch {
      return `Company #${value}`;
    }
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
        // console.log(id, companyMap[id])
        return (id && companyMap[id]) || "-";
      },
    },
    {
      key: "location_area_id",
      label: "Location",
      render: (_value, row) => {
        const id = row && row.location_area_id != null  ? String(row.location_area_id) : null;
        // console.log(id)
        // console.log(locationMap[id])
        return (id && locationMap[id]) || "-";
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
      <div className="flex flex-col gap-3 rounded-xl bg-[var(--bg)] p-3 ring-1 ring-[var(--border)] md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-end">
          <div className="min-w-[260px]">
            <div className="mb-1 text-xs font-medium text-slate-600">Search</div>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search jobs…"
            />
          </div>

          <div className="min-w-[220px]">
            <div className="mb-1 text-xs font-medium text-slate-600">Company</div>
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

          <div className="min-w-[180px]">
            <div className="mb-1 text-xs font-medium text-slate-600">Status</div>
            <Select value={statusParam} onChange={(e) => setParam("status", e.target.value)}>
              <option value="">All</option>
              <option value="OPEN">OPEN</option>
              <option value="FULFILLED">FULFILLED</option>
              <option value="DROPPED">DROPPED</option>
            </Select>
          </div>

          <div className="min-w-[200px]">
            <div className="mb-1 text-xs font-medium text-slate-600">Location</div>
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
          <Link href="/jobs/new">
            <Button size="sm">Add job</Button>
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
