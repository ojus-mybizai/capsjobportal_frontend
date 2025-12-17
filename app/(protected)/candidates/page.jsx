"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useUIStore } from "@/stores/ui";
import { useMastersStore } from "@/stores/masters";
import { deleteCandidate, listCandidates } from "@/services/candidates";
import PaginatedTable from "@/components/table/PaginatedTable";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";

const PAGE_SIZE = 10;

export default function CandidatesPage() {
  return (
    <Suspense>
      <CandidatesPageInner />
    </Suspense>
  );
}

function CandidatesPageInner() {
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
  const [locationMap, setLocationMap] = useState({});
  const [refreshTick, setRefreshTick] = useState(0);

  const qParam = searchParams.get("q") || "";
  const statusParam = searchParams.get("status") || "";
  const employmentStatusParam = searchParams.get("employment_status") || "";
  const locationAreaIdParam = searchParams.get("location_area_id") || "";
  const pageParamRaw = searchParams.get("page");
  const page = pageParamRaw ? Math.max(1, Number(pageParamRaw) || 1) : 1;

  const [query, setQuery] = useState(qParam);
  const [locationOptions, setLocationOptions] = useState([]);

  useEffect(() => {
    setPageMetadata("Candidates", "Manage candidates and their applications");
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
    ["q", "status", "employment_status", "location_area_id", "page"].forEach((k) =>
      params.delete(k)
    );
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  async function handleDeleteCandidate(candidate) {
    const id = candidate && candidate.id != null ? String(candidate.id) : "";
    const name =
      (candidate && (candidate.full_name || candidate.name || candidate.candidate_name)) || "";
    if (!id) return;

    const confirmed =
      typeof window !== "undefined" &&
      window.confirm(
        `Delete this candidate${name ? ` (${name})` : ""}? This action cannot be undone.`
      );
    if (!confirmed) return;

    try {
      await deleteCandidate(id);
      pushToast({
        title: "Candidate deleted",
        description: "The candidate was deleted successfully.",
      });
      setRefreshTick(Date.now());
    } catch (error) {
      pushToast({
        title: "Failed to delete candidate",
        description:
          (error && error.message) || "An error occurred while deleting the candidate.",
      });
    }
  }

  useEffect(() => {
    let active = true;

    async function loadLookups() {
      try {
        await loadMaster("location");
        if (!active) return;
        const locOptions = getOptions("location");
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
          title: "Failed to load locations",
          description:
            (error && error.message) ||
            "An error occurred while loading locations.",
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
    async function load() {
      setLoading(true);
      try {
        const result = await listCandidates({
          page,
          limit: PAGE_SIZE,
          q: qParam || undefined,
          status: statusParam || undefined,
          employment_status: employmentStatusParam || undefined,
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
          title: "Failed to load candidates",
          description:
            (error && error.message) ||
            "An error occurred while loading candidates.",
        });
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [page, qParam, statusParam, locationAreaIdParam, refreshTick, pushToast]);

  const columns = [
    {
      key: "full_name",
      label: "Name",
      render: (value, row) => value || row.name || "-",
    },
    {
      key: "mobile_number",
      label: "Mobile",
      render: (value, row) => value || row.phone || "-",
    },
    {
      key: "status",
      label: "Status",
      render: (value) => value || "-",
    },
    {
      key: "employment_status",
      label: "Employment",
      render: (value, row) => {
        const raw = value != null ? value : row && row.employment_status != null ? row.employment_status : "";
        const v = String(raw || "").toLowerCase();
        if (v === "employed") return "Employed";
        if (v === "unemployed") return "Unemployed";
        return "-";
      },
    },
    {
      key: "interview_count",
      label: "Interviews",
      render: (_value, row) => {
        const id = row && row.id != null ? String(row.id) : "";
        const countRaw =
          row && row.interview_count != null
            ? row.interview_count
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
              onClick={() => router.push(`/interviews?candidate_id=${encodeURIComponent(id)}`)}
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
      key: "location_area_id",
      label: "Location",
      render: (_value, row) => {
        const id = row && row.location_area_id != null ? String(row.location_area_id) : null;
        return (id && locationMap[id]) || "-";
      },
    },
    {
      key: "experience_years",
      label: "Experience (yrs)",
      render: (value, row) => {
        const exp =
          typeof value === "number"
            ? value
            : typeof row.experience === "number"
            ? row.experience
            : null;
        return exp != null ? exp : "-";
      },
    },
    {
      key: "balance",
      label: "Balance",
      render: (value, row) => {
        if (row.status !== "JOC") return "-";
        if (typeof value === "number") return value;
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
              placeholder="Search candidates…"
            />
          </div>

          <div className="min-w-[180px]">
            <div className="mb-1 text-xs font-medium text-slate-600">Status</div>
            <Select value={statusParam} onChange={(e) => setParam("status", e.target.value)}>
              <option value="">All</option>
              <option value="REGISTERED">REGISTERED</option>
              <option value="CAPS">CAPS</option>
              <option value="JOC">JOC</option>
              <option value="FREE">FREE</option>
            </Select>
          </div>

          <div className="min-w-[200px]">
            <div className="mb-1 text-xs font-medium text-slate-600">Employment</div>
            <Select
              value={employmentStatusParam}
              onChange={(e) => setParam("employment_status", e.target.value)}
            >
              <option value="">All</option>
              <option value="employed">Employed</option>
              <option value="unemployed">Unemployed</option>
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
          <Link href="/candidates/new">
            <Button size="sm">Add candidate</Button>
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
              href={`/candidates/${row.id}`}
              className="text-xs text-[var(--accent)] hover:underline"
            >
              View / Edit
            </Link>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => handleDeleteCandidate(row)}
            >
              Delete
            </Button>
          </div>
        )}
      />
    </div>
  );
}
