"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/stores/auth";
import { useUIStore } from "@/stores/ui";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(4, "Password is too short"),
});

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const login = useAuthStore((state) => state.login);
  const pushToast = useUIStore((state) => state.pushToast);
  const [serverError, setServerError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values) {
    setServerError("");
    setIsSubmitting(true);
    try {
      await login(values.email, values.password);
      pushToast({
        title: "Welcome back",
        description: "You have been signed in successfully",
      });
      const nextRaw = (searchParams && searchParams.get("next")) || "";
      const next = String(nextRaw || "");
      const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
      router.replace(safeNext || "/dashboard");
    } catch (error) {
      const message = error && error.message ? error.message : "Login failed";
      setServerError(message);
      pushToast({
        title: "Login failed",
        description: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg-muted)] px-4">
      <div className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--bg)] p-6 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-soft)] text-sm font-semibold text-[var(--accent)]">
            C
          </div>
          <h1 className="text-lg font-semibold text-[var(--text)]">
            CAPS Job Placement Portal
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Sign in with your work email to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              autoComplete="email"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2 text-sm outline-none ring-0 focus:border-[var(--accent)]"
              {...register("email")}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-[var(--danger)]">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2 text-sm outline-none ring-0 focus:border-[var(--accent)]"
              {...register("password")}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-[var(--danger)]">
                {errors.password.message}
              </p>
            )}
          </div>

          {serverError && (
            <div className="rounded-md border border-[var(--danger)] bg-red-50 px-3 py-2 text-xs text-[var(--danger)]">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#2493c3] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
