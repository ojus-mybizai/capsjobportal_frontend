/* Basic select component */
export default function Select({ className = "", children, ...props }) {
  return (
    <select
      {...props}
      className={`w-full rounded-md border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1 ${className}`}
    >
      {children}
    </select>
  );
}
