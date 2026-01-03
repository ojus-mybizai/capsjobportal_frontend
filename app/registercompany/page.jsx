"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { api } from "@/services/api";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function RegisterCompanyPage() {
  const [form, setForm] = useState({
    name: "",
    contact_person: "",
    contact_number: "",
    alternate_number: "",
    email: "",
    address: "",
    google_map_url: "",
    location_link: "",
    notes: "",
  });

  const [visitingCard, setVisitingCard] = useState(null);
  const [frontImage, setFrontImage] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(null);

  const hasFiles = useMemo(() => !!visitingCard || !!frontImage, [visitingCard, frontImage]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate() {
    const name = String(form.name || "").trim();
    const contactNumber = String(form.contact_number || "").trim();
    const email = String(form.email || "").trim();
    if (!name) return "Company name is required";
    if (contactNumber && contactNumber.length < 8) return "Contact number looks too short";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email";
    if (visitingCard) {
      const max = 5 * 1024 * 1024;
      if (visitingCard.size > max) return "Visiting card must be less than 5 MB";
    }
    if (frontImage) {
      const max = 5 * 1024 * 1024;
      if (frontImage.size > max) return "Front image must be less than 5 MB";
    }
    return "";
  }

  function normalizeApiError(error) {
    const status = error?.status || error?.response?.status;
    const message = error?.message || "";
    if (status === 409) return message || "Already registered with the same details.";
    if (status === 422) return message || "Please check the form fields and try again.";
    return message || "Something went wrong. Please try again.";
  }

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
        name: String(form.name || "").trim(),
        contact_person: String(form.contact_person || "").trim() || undefined,
        contact_number: String(form.contact_number || "").trim() || undefined,
        alternate_number: String(form.alternate_number || "").trim() || undefined,
        email: String(form.email || "").trim() || undefined,
        address: String(form.address || "").trim() || undefined,
        google_map_url: String(form.google_map_url || "").trim() || undefined,
        location_link: String(form.location_link || "").trim() || undefined,
        notes: String(form.notes || "").trim() || undefined,
      };

      let result;

      if (hasFiles) {
        const fd = new FormData();
        fd.append("payload", JSON.stringify(payload));
        if (visitingCard) fd.append("visiting_card", visitingCard);
        if (frontImage) fd.append("front_image", frontImage);

        result = await api.post("public/companies/multipart", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else {
        result = await api.post("public/companies", payload);
      }

      const companyId = result?.id != null ? String(result.id) : "";
      setSuccess({ companyId });
    } catch (err) {
      setErrorMsg(normalizeApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute -bottom-40 right-[-120px] h-[520px] w-[520px] rounded-full bg-emerald-500/15 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-3xl px-4 py-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-slate-200 hover:text-white">
            Back
          </Link>
          <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200">
            No login required
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
          <div className="border-b border-white/10 bg-slate-950/30 p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Company</div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">Register your company</h1>
            <p className="mt-2 text-sm text-slate-200">
              Submit your details. Our team will connect with you to understand requirements and start sharing
              suitable candidates.
            </p>
          </div>

          <div className="p-6">
            {success ? (
              <div className="space-y-3">
                <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
                  <div className="text-sm font-semibold text-emerald-200">Registration submitted</div>
                  <div className="mt-1 text-sm text-slate-200">
                    Thank you! We received your company registration.
                  </div>
                  {success.companyId ? (
                    <div className="mt-2 text-xs text-slate-300">Company ID: {success.companyId}</div>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/"
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Go to Home
                  </Link>
                  <button
                    type="button"
                    className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                    onClick={() => {
                      setSuccess(null);
                      setForm({
                        name: "",
                        contact_person: "",
                        contact_number: "",
                        alternate_number: "",
                        email: "",
                        address: "",
                        google_map_url: "",
                        location_link: "",
                        notes: "",
                      });
                      setVisitingCard(null);
                      setFrontImage(null);
                    }}
                  >
                    Register another
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {errorMsg ? (
                  <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
                    {errorMsg}
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-slate-200">Company name *</label>
                    <Input
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder="e.g. ABC Traders"
                      className="mt-1 border-white/10 bg-slate-950/30 text-white placeholder:text-slate-400"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-200">Contact person</label>
                    <Input
                      value={form.contact_person}
                      onChange={(e) => updateField("contact_person", e.target.value)}
                      placeholder="e.g. Ravi"
                      className="mt-1 border-white/10 bg-slate-950/30 text-white placeholder:text-slate-400"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-200">Contact number</label>
                    <Input
                      value={form.contact_number}
                      onChange={(e) => updateField("contact_number", e.target.value)}
                      placeholder="e.g. 9876543210"
                      inputMode="numeric"
                      className="mt-1 border-white/10 bg-slate-950/30 text-white placeholder:text-slate-400"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-200">Alternate number</label>
                    <Input
                      value={form.alternate_number}
                      onChange={(e) => updateField("alternate_number", e.target.value)}
                      placeholder="Optional"
                      inputMode="numeric"
                      className="mt-1 border-white/10 bg-slate-950/30 text-white placeholder:text-slate-400"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-200">Email</label>
                    <Input
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="e.g. abc@traders.com"
                      type="email"
                      className="mt-1 border-white/10 bg-slate-950/30 text-white placeholder:text-slate-400"
                      disabled={submitting}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-slate-200">Address</label>
                    <Input
                      value={form.address}
                      onChange={(e) => updateField("address", e.target.value)}
                      placeholder="Office address"
                      className="mt-1 border-white/10 bg-slate-950/30 text-white placeholder:text-slate-400"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-200">Google map URL</label>
                    <Input
                      value={form.google_map_url}
                      onChange={(e) => updateField("google_map_url", e.target.value)}
                      placeholder="https://maps.google.com/..."
                      className="mt-1 border-white/10 bg-slate-950/30 text-white placeholder:text-slate-400"
                      disabled={submitting}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-200">Location link</label>
                    <Input
                      value={form.location_link}
                      onChange={(e) => updateField("location_link", e.target.value)}
                      placeholder="Optional"
                      className="mt-1 border-white/10 bg-slate-950/30 text-white placeholder:text-slate-400"
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-200">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    placeholder="Any notes for our team (e.g. call after 6 PM)"
                    disabled={submitting}
                    className="mt-1 w-full rounded-md border border-white/10 bg-slate-950/30 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1"
                    rows={3}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-200">Visiting card (optional)</label>
                    <input
                      type="file"
                      onChange={(e) => setVisitingCard(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                      disabled={submitting}
                      className="mt-2 block w-full text-xs text-slate-200 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-white/15"
                    />
                    <div className="mt-1 text-[11px] text-slate-400">Max 5 MB</div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-200">Front image (optional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setFrontImage(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                      disabled={submitting}
                      className="mt-2 block w-full text-xs text-slate-200 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-white/15"
                    />
                    <div className="mt-1 text-[11px] text-slate-400">JPG/PNG/WebP, max 5 MB</div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs text-slate-300">
                    Submit mode: <span className="font-semibold text-slate-100">{hasFiles ? "Multipart" : "JSON"}</span>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href="/"
                      className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                      Cancel
                    </Link>
                    <Button type="submit" disabled={submitting}>
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
