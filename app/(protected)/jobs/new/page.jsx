"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/stores/ui";
import JobForm from "@/components/forms/JobForm";
import { createJob } from "@/services/jobs";

export default function NewJobPage() {
  const router = useRouter();
  const setPageMetadata = useUIStore((state) => state.setPageMetadata);
  const pushToast = useUIStore((state) => state.pushToast);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setPageMetadata("New job", "Create a new job opening");
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
      const numVacancies = values.num_vacancies
        ? Number(values.num_vacancies)
        : undefined;
      const salaryMin = values.salary_min ? Number(values.salary_min) : undefined;
      const salaryMax = values.salary_max ? Number(values.salary_max) : undefined;
      const skillsArray = Array.isArray(values.skills)
        ? values.skills.filter((item) => !!item && String(item).trim())
        : [];

      const educationArray = Array.isArray(values.education)
        ? values.education.filter((item) => !!item && String(item).trim())
        : [];

      const payload = {
        title: values.title,
        company_id: values.company_id,
        num_vacancies:
          Number.isFinite(numVacancies) && numVacancies > 0
            ? numVacancies
            : undefined,
        salary_min:
          Number.isFinite(salaryMin) && salaryMin >= 0 ? salaryMin : undefined,
        salary_max:
          Number.isFinite(salaryMax) && salaryMax >= 0 ? salaryMax : undefined,
        experience_level: values.experience_level || undefined,
        employment_type: values.employment_type || undefined,
        skills: skillsArray.length > 0 ? skillsArray : undefined,
        education: educationArray.length > 0 ? educationArray : undefined,
        location_area_id: values.location_area_id || undefined,
        description: values.description || undefined,
        responsibilities: values.responsibilities || undefined,
      };

      const job = await createJob(payload);

      pushToast({
        title: "Job created",
        description: "The job was created successfully.",
      });
      router.replace(`/jobs/${job.id}`);
    } catch (error) {
      if (error && error.status === 422 && error.data && typeof error.data === "object") {
        Object.entries(error.data).forEach(([field, detail]) => {
          if (typeof field !== "string") return;
          if (!(field in values)) return;
          const message =
            Array.isArray(detail)
              ? String(detail[0])
              : typeof detail === "string"
              ? detail
              : String(detail || "Invalid value");
          setError(field, { type: "server", message });
        });
      } else if (error && error.status === 409) {
        pushToast({
          title: "Job conflict",
          description:
            (error && error.message) ||
            "The job could not be saved due to a conflict.",
        });
      } else {
        pushToast({
          title: "Failed to save job",
          description:
            (error && error.message) ||
            "An error occurred while saving the job.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <JobForm onSubmit={handleSubmit} submitting={submitting} />
    </div>
  );
}
