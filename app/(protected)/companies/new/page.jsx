"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/stores/ui";
import CompanyForm from "@/components/forms/CompanyForm";
import { createCompany } from "@/services/companies";

export default function NewCompanyPage() {
  const router = useRouter();
  const setPageMetadata = useUIStore((state) => state.setPageMetadata);
  const pushToast = useUIStore((state) => state.pushToast);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setPageMetadata("New company", "Create a new hiring company");
  }, [setPageMetadata]);

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const firstInput = main.querySelector("input");
    if (firstInput) firstInput.focus();
  }, []);

  async function handleSubmit(values, { setError }) {
    setSubmitting(true);
    try {
      const payload = {
        name: values.name,
        category_id: values.category_id || undefined,
        location_area_id: values.location_area_id || undefined,
        address: values.address || undefined,
        location_link: values.location_link || undefined,
        contact_person: values.contact_person || undefined,
        contact_number: values.contact_number || undefined,
        email: values.email || undefined,
        notes: values.notes || undefined,
      };

      const company = await createCompany(payload);

      pushToast({
        title: "Company created",
        description: "The company was created successfully.",
      });
      router.replace(`/companies/${company.id}`);
    } catch (error) {
      if (error && error.status === 422 && error.data && typeof error.data === "object") {
        Object.entries(error.data).forEach(([field, detail]) => {
          if (typeof field !== "string") return;
          if (!(field in values)) return;
          const message = Array.isArray(detail)
            ? String(detail[0])
            : typeof detail === "string"
            ? detail
            : String(detail || "Invalid value");
          setError(field, { type: "server", message });
        });
      } else {
        pushToast({
          title: "Failed to save company",
          description:
            (error && error.message) ||
            "An error occurred while saving the company.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <CompanyForm onSubmit={handleSubmit} submitting={submitting} />
    </div>
  );
}
