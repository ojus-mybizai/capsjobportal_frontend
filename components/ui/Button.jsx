const base =
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60";

const variantClasses = {
  solid: "bg-[var(--accent)] text-white hover:brightness-95",
  outline:
    "border border-[var(--accent)] text-[var(--accent)] bg-white hover:bg-[var(--accent)]/5",
  ghost: "text-[var(--accent)] hover:bg-[var(--accent)]/10",
  danger: "bg-red-500 text-white hover:bg-red-600",
};

const sizeClasses = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

export default function Button({
  as: Comp = "button",
  variant = "solid",
  size = "md",
  className = "",
  children,
  ...props
}) {
  const variantClass = variantClasses[variant] || variantClasses.solid;
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  return (
    <Comp className={`${base} ${variantClass} ${sizeClass} ${className}`} {...props}>
      {children}
    </Comp>
  );
}
