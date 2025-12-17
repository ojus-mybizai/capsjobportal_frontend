"use client";

import clsx from "clsx";

export default function PageHeader({
  title,
  subtitle,
  status,
  statusSlot,
  actions,
  className,
}) {
  return (
    <div className={clsx("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {title}
            </h1>
            {statusSlot || status}
          </div>
          {subtitle ? (
            <div className="mt-1 text-sm text-slate-600">{subtitle}</div>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
