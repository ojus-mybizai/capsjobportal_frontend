"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-sky-50 text-slate-900">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-36 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-sky-200/60 blur-3xl" />
        <div className="absolute -bottom-44 right-[-120px] h-[520px] w-[520px] rounded-full bg-emerald-200/60 blur-3xl" />
        <div className="absolute left-[-180px] top-32 h-[480px] w-[480px] rounded-full bg-indigo-200/50 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
              <span className="text-sm font-semibold tracking-tight text-slate-900">CAPS</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900">CAPS Job Placement</div>
              <div className="text-xs text-slate-500">Hiring + Jobs, made simple</div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600">
            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm">No login required</div>
            <div className="rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm">Shareable link</div>
          </div>
        </header>

        <section className="mt-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Fast registration • Quick follow-up
            </div>
            <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl">
              Hire the right people.
              <span className="block text-slate-700">Get placed in the right job.</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-600">
              This is our quick registration page. Companies can share requirements and candidates can register
              for job updates. Our team will contact you after submission.
            </p>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <Link
                href="/registercompany"
                className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-lg shadow-sky-100 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-sky-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
              >
                <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-sky-200/50 blur-2xl" />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">Register Company</div>
                    <div className="mt-1 text-sm text-slate-600">
                      Share hiring needs. Get matched candidates quickly.
                    </div>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-sky-100 text-sky-700 ring-1 ring-sky-200">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </Link>

              <Link
                href="/registercandidate"
                className="group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-lg shadow-emerald-100 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-emerald-200/45 blur-2xl" />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-lg font-semibold text-slate-900">Register Candidate</div>
                    <div className="mt-1 text-sm text-slate-600">
                      Get job calls based on your skills & preferences.
                    </div>
                  </div>
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              </Link>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">For Companies</div>
                <div className="mt-2 text-sm text-slate-700">Hire faster with verified candidate follow-ups.</div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">For Candidates</div>
                <div className="mt-2 text-sm text-slate-700">Get calls for jobs that match your profile.</div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Quick Process</div>
                <div className="mt-2 text-sm text-slate-700">Register in 2 minutes. We’ll contact you soon.</div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white/90 p-6 shadow-xl backdrop-blur">
            <div className="text-sm font-semibold text-slate-900">How it works</div>
            <div className="mt-4 space-y-3">
              <div className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-white text-sm font-semibold text-slate-800 ring-1 ring-slate-200">
                  1
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">Choose your registration</div>
                  <div className="mt-1 text-xs text-slate-600">Company or Candidate—pick one.</div>
                </div>
              </div>
              <div className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-white text-sm font-semibold text-slate-800 ring-1 ring-slate-200">
                  2
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">Submit your details</div>
                  <div className="mt-1 text-xs text-slate-600">You can optionally upload files too.</div>
                </div>
              </div>
              <div className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-white text-sm font-semibold text-slate-800 ring-1 ring-slate-200">
                  3
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">We contact you</div>
                  <div className="mt-1 text-xs text-slate-600">Our team will reach out for next steps.</div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-4 text-xs text-slate-600 shadow-sm">
              Tip: You can share this page link with companies and candidates. No login needed.
            </div>
          </div>
        </section>

        <footer className="mt-12 flex flex-col gap-2 border-t border-slate-100 pt-6 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <div>CAPS Job Placement Portal</div>
          <div className="text-slate-500">© {new Date().getFullYear()} CAPS</div>
        </footer>
      </div>
    </main>
  );
}
