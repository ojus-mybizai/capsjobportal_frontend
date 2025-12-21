"use client";

import clsx from "clsx";

export default function Skeleton({ className }) {
  return (
    <div
      className={clsx(
        "animate-pulse rounded-md bg-slate-200/70",
        className || "h-4 w-full"
      )}
    />
  );
}
