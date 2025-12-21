/* Basic text input component */
export default function Input({ className = "", ...props }) {
  return (
    <input
      {...props}
      className={`w-full rounded-md border px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-1 ${className}`}
    />
  );
}
