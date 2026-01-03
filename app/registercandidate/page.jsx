"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/services/api";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

function MultiPick({
  title,
  items,
  value,
  onChange,
  disabled,
  placeholder,
  className = "",
}) {
  const byId = useMemo(() => {
    const m = new Map();
    (Array.isArray(items) ? items : []).forEach((it) => {
      const id = it?.id != null ? String(it.id) : "";
      if (!id) return;
      m.set(id, it);
    });
    return m;
  }, [items]);

  const selected = useMemo(() => {
    const ids = Array.isArray(value) ? value : [];
    return ids
      .map((id) => {
        const it = byId.get(String(id));
        return {
          id: String(id),
          label: it?.name || it?.label || String(id),
        };
      })
      .filter(Boolean);
  }, [value, byId]);

  const availableItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  function toggle(id) {
    const key = String(id);
    const current = Array.isArray(value) ? value.map(String) : [];
    if (current.includes(key)) {
      onChange(current.filter((x) => x !== key));
    } else {
      onChange([...current, key]);
    }
  }

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-slate-700">{title}</div>
          <div className="mt-0.5 text-[11px] text-slate-500">
            {selected.length ? `${selected.length} selected` : placeholder || "Optional"}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange([])}
          disabled={disabled || selected.length === 0}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Clear
        </button>
      </div>

      {selected.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {selected.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id)}
              disabled={disabled}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
              title="Tap to remove"
            >
              <span className="max-w-[220px] truncate">{s.label}</span>
              <span className="text-slate-500">×</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-3 max-h-44 overflow-auto rounded-xl border border-slate-200 bg-white">
        <div className="divide-y divide-slate-100">
          {availableItems.map((it) => {
            const id = it?.id != null ? String(it.id) : "";
            if (!id) return null;
            const label = it?.name || it?.label || id;
            const checked = Array.isArray(value) ? value.map(String).includes(id) : false;
            return (
              <label
                key={id}
                className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm text-slate-800 transition hover:bg-slate-50"
              >
                <input type="checkbox" checked={checked} onChange={() => toggle(id)} disabled={disabled} />
                <span className="truncate">{label}</span>
              </label>
            );
          })}
          {!availableItems.length ? (
            <div className="px-3 py-3 text-xs text-slate-400">No options available</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function RegisterCandidatePage() {
  const EXPERIENCE_OPTIONS = [
    { value: "FRESHER", label: "Fresher" },
    { value: "0_1_YEARS", label: "0-1 years" },
    { value: "1_3_YEARS", label: "1-3 years" },
    { value: "3_5_YEARS", label: "3-5 years" },
    { value: "5_PLUS_YEARS", label: "5+ years" },
  ];

  const GENDER_OPTIONS = [
    { value: "MALE", label: "Male" },
    { value: "FEMALE", label: "Female" },
    { value: "OTHER", label: "Other" },
    { value: "BOTH", label: "Any" },
  ];

  const [loadingMasters, setLoadingMasters] = useState(true);
  const [mastersError, setMastersError] = useState("");
  const [locations, setLocations] = useState([]);
  const [education, setEducation] = useState([]);
  const [degrees, setDegrees] = useState([]);

  const [form, setForm] = useState({
    full_name: "",
    mobile_number: "",
    email: "",
    location_area_id: "",
    qualification: "",
    experience_level: "FRESHER",
    expected_salary: "",
    gender: "MALE",
    dob: "",
    address: "",
    notes: "",
    education: [],
    degree: [],
  });

  const [resume, setResume] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(null);

  const hasFiles = useMemo(() => !!resume || !!photo, [resume, photo]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate() {
    const fullName = String(form.full_name || "").trim();
    const mobile = String(form.mobile_number || "").trim();
    const email = String(form.email || "").trim();
    const expectedSalary = String(form.expected_salary || "").trim();

    if (!fullName) return "Full name is required";
    if (!mobile) return "Mobile number is required";
    if (mobile.length < 8) return "Mobile number looks too short";
    if (!form.location_area_id) return "Please select your location";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email";

    if (expectedSalary) {
      const n = Number(expectedSalary);
      if (!Number.isFinite(n) || n < 0) return "Expected salary must be a valid number";
    }

    if (resume) {
      const max = 5 * 1024 * 1024;
      const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
      if (resume.size > max) return "Resume must be less than 5 MB";
      if (resume.type && !allowed.includes(resume.type)) {
        return "Resume must be PDF/DOC/DOCX";
      }
    }

    if (photo) {
      const max = 2 * 1024 * 1024;
      if (photo.size > max) return "Photo must be less than 2 MB";
      if (photo.type && !photo.type.startsWith("image/")) return "Photo must be an image file";
    }

    return "";
  }

  function normalizeApiError(error) {
    const status = error?.status || error?.response?.status;
    const message = error?.message || "";
    if (status === 409) return message || "Already registered with this email/mobile.";
    if (status === 422) return message || "Please check the form fields and try again.";
    return message || "Something went wrong. Please try again.";
  }

  useEffect(() => {
    let active = true;

    async function loadMasters() {
      setLoadingMasters(true);
      setMastersError("");
      try {
        const [loc, edu, deg] = await Promise.all([
          api.get("public/masters/location", { params: { limit: 100 } }),
          api.get("public/masters/education", { params: { limit: 100 } }),
          api.get("public/masters/degree", { params: { limit: 100 } }),
        ]);

        const safeArr = (v) => (Array.isArray(v) ? v : Array.isArray(v?.items) ? v.items : Array.isArray(v?.data) ? v.data : []);

        if (!active) return;
        setLocations(safeArr(loc));
        setEducation(safeArr(edu));
        setDegrees(safeArr(deg));
      } catch (e) {
        if (!active) return;
        setMastersError("Failed to load dropdown options. Please refresh and try again.");
      } finally {
        if (active) setLoadingMasters(false);
      }
    }

    loadMasters();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(e) {
    e?.preventDefault?.();
    if (submitting) return;
    setErrorMsg("");

    const validation = validate();
    if (validation) {
      setErrorMsg(validation);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        full_name: String(form.full_name || "").trim(),
        mobile_number: String(form.mobile_number || "").trim(),
        email: String(form.email || "").trim() || undefined,
        location_area_id: String(form.location_area_id || "").trim(),
        qualification: String(form.qualification || "").trim() || undefined,
        experience_level: String(form.experience_level || "").trim() || undefined,
        expected_salary:
          String(form.expected_salary || "").trim() !== "" ? Number(form.expected_salary) : undefined,
        gender: String(form.gender || "").trim() || undefined,
        dob: String(form.dob || "").trim() || undefined,
        address: String(form.address || "").trim() || undefined,
        notes: String(form.notes || "").trim() || undefined,
        education: Array.isArray(form.education) ? form.education : [],
        degree: Array.isArray(form.degree) ? form.degree : [],
      };

      let result;

      if (hasFiles) {
        const fd = new FormData();
        fd.append("payload", JSON.stringify(payload));
        if (resume) fd.append("resume", resume);
        if (photo) fd.append("photo", photo);
        result = await api.post("public/candidates/multipart", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        result = await api.post("public/candidates", payload);
      }

      const candidateId = result?.id != null ? String(result.id) : "";
      setSuccess({ candidateId });
    } catch (err) {
      setErrorMsg(normalizeApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50 text-slate-900">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-emerald-200/60 blur-3xl" />
        <div className="absolute -bottom-40 right-[-120px] h-[520px] w-[520px] rounded-full bg-sky-200/60 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-4xl px-4 py-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-slate-900">
            Back
          </Link>
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
            No login required
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-100 bg-white/90 shadow-xl backdrop-blur">
          <div className="border-b border-slate-100 bg-gradient-to-r from-white via-slate-50 to-emerald-50 p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Candidate</div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">Register as a candidate</h1>
            <p className="mt-2 text-sm text-slate-600">
              Submit your profile so we can match you with suitable job openings. Status will be saved as
              <span className="font-semibold text-slate-800"> REGISTERED</span>.
            </p>
          </div>

          <div className="p-6">
            {success ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-sm font-semibold text-emerald-700">Registration submitted</div>
                  <div className="mt-1 text-sm text-emerald-800">
                    Thank you! Our team will contact you soon.
                  </div>
                  {success.candidateId ? (
                    <div className="mt-2 text-xs text-emerald-700">Candidate ID: {success.candidateId}</div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                  >
                    Go to Home
                  </Link>
                  <button
                    type="button"
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                    onClick={() => {
                      setSuccess(null);
                      setErrorMsg("");
                      setResume(null);
                      setPhoto(null);
                      setForm({
                        full_name: "",
                        mobile_number: "",
                        email: "",
                        location_area_id: "",
                        qualification: "",
                        experience_level: "FRESHER",
                        expected_salary: "",
                        gender: "MALE",
                        dob: "",
                        address: "",
                        notes: "",
                        education: [],
                        degree: [],
                      });
                    }}
                  >
                    Register another
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {mastersError ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    {mastersError}
                  </div>
                ) : null}
                {errorMsg ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {errorMsg}
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Full name *</label>
                    <Input
                      value={form.full_name}
                      onChange={(e) => updateField("full_name", e.target.value)}
                      placeholder="e.g. Sanjay Patil"
                      className="mt-1 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700">Mobile number *</label>
                    <Input
                      value={form.mobile_number}
                      onChange={(e) => updateField("mobile_number", e.target.value)}
                      placeholder="e.g. 9876543210"
                      inputMode="numeric"
                      className="mt-1 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700">Email</label>
                    <Input
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="e.g. sanjay@gmail.com"
                      type="email"
                      className="mt-1 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700">Location *</label>
                    <select
                      value={form.location_area_id}
                      onChange={(e) => updateField("location_area_id", e.target.value)}
                      disabled={submitting || loadingMasters}
                      className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1"
                    >
                      <option value="">{loadingMasters ? "Loading..." : "Select location"}</option>
                      {locations.map((it) => (
                        <option key={String(it.id)} value={String(it.id)}>
                          {it.name || it.label || String(it.id)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700">Experience level</label>
                    <select
                      value={form.experience_level}
                      onChange={(e) => updateField("experience_level", e.target.value)}
                      disabled={submitting}
                      className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1"
                    >
                      {EXPERIENCE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700">Expected salary</label>
                    <Input
                      value={form.expected_salary}
                      onChange={(e) => updateField("expected_salary", e.target.value)}
                      placeholder="e.g. 25000"
                      type="number"
                      min="0"
                      step="1"
                      className="mt-1 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700">Gender</label>
                    <select
                      value={form.gender}
                      onChange={(e) => updateField("gender", e.target.value)}
                      disabled={submitting}
                      className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1"
                    >
                      {GENDER_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700">Date of birth</label>
                    <Input
                      value={form.dob}
                      onChange={(e) => updateField("dob", e.target.value)}
                      type="date"
                      className="mt-1 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                      disabled={submitting}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-slate-700">Qualification</label>
                    <Input
                      value={form.qualification}
                      onChange={(e) => updateField("qualification", e.target.value)}
                      placeholder="e.g. Graduate"
                      className="mt-1 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <MultiPick
                    title="Education"
                    items={education}
                    value={form.education}
                    onChange={(v) => updateField("education", v)}
                    disabled={submitting || loadingMasters}
                    placeholder="Optional"
                    className="border-slate-200 bg-white text-slate-900"
                  />
                  <MultiPick
                    title="Degree"
                    items={degrees}
                    value={form.degree}
                    onChange={(v) => updateField("degree", v)}
                    disabled={submitting || loadingMasters}
                    placeholder="Optional"
                    className="border-slate-200 bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Address</label>
                  <Input
                    value={form.address}
                    onChange={(e) => updateField("address", e.target.value)}
                    placeholder="Optional"
                    className="mt-1 border-slate-200 bg-white text-slate-900 placeholder:text-slate-400"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    placeholder="Optional (e.g. looking for back office role)"
                    disabled={submitting}
                    className="mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1"
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Resume (optional)</label>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      onChange={(e) => setResume(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                      disabled={submitting}
                      className="mt-2 block w-full text-xs text-slate-700 file:mr-4 file:rounded-lg file:border file:border-slate-200 file:bg-white file:px-4 file:py-2 file:text-xs file:font-semibold file:text-slate-800 hover:file:bg-slate-50"
                    />
                    <div className="mt-1 text-[11px] text-slate-500">PDF/DOC/DOCX, max 5 MB</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Photo (optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPhoto(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                      disabled={submitting}
                      className="mt-2 block w-full text-xs text-slate-700 file:mr-4 file:rounded-lg file:border file:border-slate-200 file:bg-white file:px-4 file:py-2 file:text-xs file:font-semibold file:text-slate-800 hover:file:bg-slate-50"
                    />
                    <div className="mt-1 text-[11px] text-slate-500">JPG/PNG/WebP, max 2 MB</div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-slate-500">
                    Submit mode: <span className="font-semibold text-slate-800">{hasFiles ? "Multipart" : "JSON"}</span>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href="/"
                      className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                      Cancel
                    </Link>
                    <Button type="submit" disabled={submitting || loadingMasters}>
                      {submitting ? "Submitting..." : "Submit"}
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
