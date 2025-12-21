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
  const searchParamsString = searchParams.toString();

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
  const emailParam = searchParams.get("email") || "";
  const mobileNumberParam = searchParams.get("mobile_number") || "";
  const statusParam = searchParams.get("status") || "";
  const employmentStatusParam = searchParams.get("employment_status") || "";
  const genderParam = searchParams.get("gender") || "";
  const qualificationParam = searchParams.get("qualification") || "";
  const locationAreaIdParam = searchParams.get("location_area_id") || "";
  const expectedSalaryMinParam = searchParams.get("expected_salary_min") || "";
  const expectedSalaryMaxParam = searchParams.get("expected_salary_max") || "";
  const experienceMinParam = searchParams.get("experience_min") || "";
  const experienceMaxParam = searchParams.get("experience_max") || "";
  const createdFromParam = searchParams.get("created_from") || "";
  const createdToParam = searchParams.get("created_to") || "";
  const hasResumeParam = searchParams.get("has_resume") || "";
  const hasPhotoParam = searchParams.get("has_photo") || "";
  const isActiveParam = searchParams.get("is_active") || "";
  const sortByParam = searchParams.get("sort_by") || "";
  const orderParam = searchParams.get("order") || "";
  const skillsParam = searchParams.getAll("skills");
  const pageParamRaw = searchParams.get("page");
  const page = pageParamRaw ? Math.max(1, Number(pageParamRaw) || 1) : 1;

  const filtersKey = [
    qParam,
    emailParam,
    mobileNumberParam,
    statusParam,
    employmentStatusParam,
    genderParam,
    qualificationParam,
    locationAreaIdParam,
    expectedSalaryMinParam,
    expectedSalaryMaxParam,
    experienceMinParam,
    experienceMaxParam,
    createdFromParam,
    createdToParam,
    hasResumeParam,
    hasPhotoParam,
    isActiveParam,
    sortByParam,
    orderParam,
    (skillsParam || []).join(","),
  ].join("|");

  const [query, setQuery] = useState(qParam);
  const [email, setEmail] = useState(emailParam);
  const [mobileNumber, setMobileNumber] = useState(mobileNumberParam);
  const [qualification, setQualification] = useState(qualificationParam);
  const [skillsText, setSkillsText] = useState((skillsParam || []).join(", "));
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [locationOptions, setLocationOptions] = useState([]);

  useEffect(() => {
    setPageMetadata("Candidates", "Manage candidates and their applications");
  }, [setPageMetadata]);

  useEffect(() => {
    setQuery(qParam);
  }, [qParam]);

  useEffect(() => {
    setEmail(emailParam);
  }, [emailParam]);

  useEffect(() => {
    setMobileNumber(mobileNumberParam);
  }, [mobileNumberParam]);

  useEffect(() => {
    setQualification(qualificationParam);
  }, [qualificationParam]);

  useEffect(() => {
    setSkillsText((skillsParam || []).join(", "));
  }, [skillsParam.join("|")]);

  useEffect(() => {
    const hasAdvanced =
      !!emailParam ||
      !!mobileNumberParam ||
      !!qualificationParam ||
      !!employmentStatusParam ||
      !!genderParam ||
      !!expectedSalaryMinParam ||
      !!expectedSalaryMaxParam ||
      !!experienceMinParam ||
      !!experienceMaxParam ||
      !!createdFromParam ||
      !!createdToParam ||
      !!hasResumeParam ||
      !!hasPhotoParam ||
      !!isActiveParam ||
      !!sortByParam ||
      !!orderParam ||
      (Array.isArray(skillsParam) && skillsParam.length > 0);
    if (hasAdvanced) setShowAdvanced(true);
  }, [
    emailParam,
    mobileNumberParam,
    qualificationParam,
    employmentStatusParam,
    genderParam,
    expectedSalaryMinParam,
    expectedSalaryMaxParam,
    experienceMinParam,
    experienceMaxParam,
    createdFromParam,
    createdToParam,
    hasResumeParam,
    hasPhotoParam,
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

  useEffect(() => {
    const t = setTimeout(() => {
      const next = (email || "").trim();
      if (next === (emailParam || "")) return;
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
      const next = (mobileNumber || "").trim();
      if (next === (mobileNumberParam || "")) return;
      const params = new URLSearchParams(searchParamsString);
      if (next) params.set("mobile_number", next);
      else params.delete("mobile_number");
      params.set("page", "1");
      const qs = params.toString();
      if (qs === searchParamsString) return;
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }, 300);
    return () => clearTimeout(t);
  }, [mobileNumber, router, pathname, searchParamsString]);

  useEffect(() => {
    const t = setTimeout(() => {
      const next = (qualification || "").trim();
      if (next === (qualificationParam || "")) return;
      const params = new URLSearchParams(searchParamsString);
      if (next) params.set("qualification", next);
      else params.delete("qualification");
      params.set("page", "1");
      const qs = params.toString();
      if (qs === searchParamsString) return;
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }, 300);
    return () => clearTimeout(t);
  }, [qualification, router, pathname, searchParamsString]);

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
      "email",
      "mobile_number",
      "status",
      "employment_status",
      "gender",
      "qualification",
      "location_area_id",
      "expected_salary_min",
      "expected_salary_max",
      "experience_min",
      "experience_max",
      "skills",
      "has_resume",
      "has_photo",
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
          email: emailParam || undefined,
          mobile_number: mobileNumberParam || undefined,
          status: statusParam || undefined,
          employment_status: employmentStatusParam || undefined,
          gender: genderParam || undefined,
          qualification: qualificationParam || undefined,
          location_area_id: locationAreaIdParam || undefined,
          expected_salary_min: expectedSalaryMinParam || undefined,
          expected_salary_max: expectedSalaryMaxParam || undefined,
          experience_min: experienceMinParam || undefined,
          experience_max: experienceMaxParam || undefined,
          skills: Array.isArray(skillsParam) && skillsParam.length ? skillsParam : undefined,
          has_resume:
            hasResumeParam === "true"
              ? true
              : hasResumeParam === "false"
              ? false
              : undefined,
          has_photo:
            hasPhotoParam === "true"
              ? true
              : hasPhotoParam === "false"
              ? false
              : undefined,
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
  }, [page, filtersKey, refreshTick, pushToast]);

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
      <div className="rounded-xl bg-[var(--bg)] p-3 ring-1 ring-[var(--border)]">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-end">
          <div className="min-w-[260px]">
            <div className="mb-1 text-xs font-medium text-slate-600">Search</div>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search candidates…"
            />
          </div>

          <div className="min-w-[240px]">
            <div className="mb-1 text-xs font-medium text-slate-600">Email</div>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email contains…"
            />
          </div>

          <div className="min-w-[220px]">
            <div className="mb-1 text-xs font-medium text-slate-600">Mobile</div>
            <Input
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="mobile contains…"
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

          <div className="min-w-[180px]">
            <div className="mb-1 text-xs font-medium text-slate-600">Employment status</div>
            <Select
              value={employmentStatusParam}
              onChange={(e) => setParam("employment_status", e.target.value)}
            >
              <option value="">All</option>
              <option value="EMPLOYED">EMPLOYED</option>
              <option value="UNEMPLOYED">UNEMPLOYED</option>
            </Select>
          </div>

          <div className="min-w-[180px]">
            <div className="mb-1 text-xs font-medium text-slate-600">Gender</div>
            <Select value={genderParam} onChange={(e) => setParam("gender", e.target.value)}>
              <option value="">All</option>
              <option value="MALE">MALE</option>
              <option value="FEMALE">FEMALE</option>
              <option value="OTHER">OTHER</option>
              <option value="BOTH">BOTH</option>
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
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? "Less filters" : "More filters"}
          </Button>
          </div>

          {showAdvanced ? (
            <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-end">
              <div className="min-w-[260px]">
                <div className="mb-1 text-xs font-medium text-slate-600">Qualification</div>
                <Input
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  placeholder="e.g. B.Tech"
                />
              </div>

              <div className="min-w-[160px]">
                <div className="mb-1 text-xs font-medium text-slate-600">Exp min (yrs)</div>
                <Input
                  value={experienceMinParam}
                  onChange={(e) => setParam("experience_min", e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="min-w-[160px]">
                <div className="mb-1 text-xs font-medium text-slate-600">Exp max (yrs)</div>
                <Input
                  value={experienceMaxParam}
                  onChange={(e) => setParam("experience_max", e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="min-w-[170px]">
                <div className="mb-1 text-xs font-medium text-slate-600">Salary min</div>
                <Input
                  value={expectedSalaryMinParam}
                  onChange={(e) => setParam("expected_salary_min", e.target.value)}
                  placeholder="0"
                  inputMode="numeric"
                />
              </div>

              <div className="min-w-[170px]">
                <div className="mb-1 text-xs font-medium text-slate-600">Salary max</div>
                <Input
                  value={expectedSalaryMaxParam}
                  onChange={(e) => setParam("expected_salary_max", e.target.value)}
                  placeholder="0"
                  inputMode="numeric"
                />
              </div>

              <div className="min-w-[260px]">
                <div className="mb-1 text-xs font-medium text-slate-600">Skills</div>
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
                  placeholder="e.g. React, Excel"
                />
              </div>

              <div className="min-w-[160px]">
                <div className="mb-1 text-xs font-medium text-slate-600">Has resume</div>
                <Select value={hasResumeParam} onChange={(e) => setParam("has_resume", e.target.value)}>
                  <option value="">All</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </Select>
              </div>

              <div className="min-w-[160px]">
                <div className="mb-1 text-xs font-medium text-slate-600">Has photo</div>
                <Select value={hasPhotoParam} onChange={(e) => setParam("has_photo", e.target.value)}>
                  <option value="">All</option>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </Select>
              </div>

              <div className="min-w-[170px]">
                <div className="mb-1 text-xs font-medium text-slate-600">Created from</div>
                <Input
                  type="date"
                  value={createdFromParam}
                  onChange={(e) => setParam("created_from", e.target.value)}
                />
              </div>

              <div className="min-w-[170px]">
                <div className="mb-1 text-xs font-medium text-slate-600">Created to</div>
                <Input
                  type="date"
                  value={createdToParam}
                  onChange={(e) => setParam("created_to", e.target.value)}
                />
              </div>

              <div className="min-w-[160px]">
                <div className="mb-1 text-xs font-medium text-slate-600">Active</div>
                <Select value={isActiveParam} onChange={(e) => setParam("is_active", e.target.value)}>
                  <option value="">All</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </Select>
              </div>

              <div className="min-w-[200px]">
                <div className="mb-1 text-xs font-medium text-slate-600">Sort by</div>
                <Select value={sortByParam} onChange={(e) => setParam("sort_by", e.target.value)}>
                  <option value="">created_at</option>
                  <option value="updated_at">updated_at</option>
                  <option value="full_name">full_name</option>
                  <option value="expected_salary">expected_salary</option>
                  <option value="experience_years">experience_years</option>
                  <option value="status">status</option>
                  <option value="employment_status">employment_status</option>
                </Select>
              </div>

              <div className="min-w-[140px]">
                <div className="mb-1 text-xs font-medium text-slate-600">Order</div>
                <Select value={orderParam} onChange={(e) => setParam("order", e.target.value)}>
                  <option value="">desc</option>
                  <option value="asc">asc</option>
                  <option value="desc">desc</option>
                </Select>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setEmail("");
                  setMobileNumber("");
                  setQualification("");
                  setSkillsText("");
                  clearFilters();
                }}
              >
                Clear
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setEmail("");
                  setMobileNumber("");
                  setQualification("");
                  setSkillsText("");
                  clearFilters();
                }}
              >
                Clear
              </Button>
            </div>
          )}
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
          const params = new URLSearchParams(searchParamsString);
          params.set("page", String(nextPage));
          const qs = params.toString();
          if (qs === searchParamsString) return;
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
