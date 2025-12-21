"use client";

import clsx from "clsx";
import PageHeader from "@/components/ui/PageHeader";
import Tabs from "@/components/ui/Tabs";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";

function PlaceholderOverview({ rows = 6 }) {
  const items = Array.from({ length: rows });
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-4">
      <div className="grid gap-4 md:grid-cols-3">
        {items.slice(0, 3).map((_, idx) => (
          <div key={idx}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-6 w-32" />
          </div>
        ))}
      </div>
      <div className="mt-5 space-y-2">
        {items.map((_, idx) => (
          <Skeleton key={idx} className="h-3 w-full" />
        ))}
      </div>
    </div>
  );
}

export default function DetailShell({
  title,
  subtitle,
  statusSlot,
  actions,
  tabs,
  tab,
  setTab,
  loading,
  loadingTitle = "Loading...",
  notFound,
  onBack,
  children,
  className,
}) {
  if (loading) {
    return (
      <div className={clsx("max-w-4xl space-y-4", className)}>
        <PageHeader
          title={loadingTitle}
          subtitle={" "}
          actions={
            <Button type="button" variant="ghost" onClick={onBack}>
              Back
            </Button>
          }
        />
        {tabs && tabs.length ? (
          <Tabs value={tab} onChange={setTab} items={tabs} />
        ) : null}
        <PlaceholderOverview />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className={clsx("max-w-4xl space-y-4", className)}>
        <PageHeader
          title={title || "Not found"}
          subtitle={subtitle || "The record does not exist."}
          actions={
            <Button type="button" variant="ghost" onClick={onBack}>
              Back
            </Button>
          }
        />
        <div className="rounded-md border border-[var(--border)] bg-[var(--bg)] p-4 text-sm text-[var(--danger)]">
          Record not found.
        </div>
      </div>
    );
  }

  return (
    <div className={clsx("max-w-4xl space-y-4", className)}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        statusSlot={statusSlot}
        actions={
          <>
            {actions}
            <Button type="button" variant="ghost" onClick={onBack}>
              Back
            </Button>
          </>
        }
      />

      {tabs && tabs.length ? <Tabs value={tab} onChange={setTab} items={tabs} /> : null}

      {children}
    </div>
  );
}
