"use client";

import clsx from "clsx";

export default function Skeleton({ className }) {
  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-md bg-slate-200/70",
        "before:absolute before:inset-0 before:-translate-x-full",
        "before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent",
        "before:animate-[shimmer_1.6s_infinite]",
        className || "h-4 w-full"
      )}
    />
  );
}
