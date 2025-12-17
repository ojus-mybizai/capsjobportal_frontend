import "./globals.css";
import ClientLayout from "./client-layout";

export const metadata = {
  title: "CAPS Job Placement Portal",
  description: "CAPS Job Placement Portal frontend",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--bg-muted)] text-[var(--text)] antialiased">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
