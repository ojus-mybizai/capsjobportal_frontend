"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/stores/ui";
import { useInterviewsStore } from "@/stores/interviews";
import InterviewForm from "@/components/interviews/InterviewForm";

export default function NewInterviewPage() {
  const router = useRouter();
  const setPageMetadata = useUIStore((state) => state.setPageMetadata);
  const pushToast = useUIStore((state) => state.pushToast);

  const createInterview = useInterviewsStore((state) => state.create);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setPageMetadata("Schedule interview", "Create a new interview");
  }, [setPageMetadata]);

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const firstInput = main.querySelector("input, select, textarea");
    if (firstInput) firstInput.focus();
  }, []);

  async function handleSubmit(values, { setError }) {
    setSubmitting(true);
    try {
      let interviewDateIso;
      if (values.interviewDate) {
        const d = new Date(values.interviewDate);
        if (!Number.isNaN(d.getTime())) {
          interviewDateIso = d.toISOString();
        }
      }

      const payload = {
        company_id: values.companyId,
        job_id: values.jobId,
        candidate_id: values.candidateId,
        interview_date: interviewDateIso || undefined,
        remarks: values.remarks || undefined,
        // Do not allow JOINED on creation; fallback to SCHEDULED
        status:
          values.status && values.status !== "JOINED" ? values.status : "SCHEDULED",
      };

      const interview = await createInterview(payload);

      pushToast({
        title: "Interview created",
        description: "The interview was created successfully.",
      });
      router.replace("/interviews");
    } catch (error) {
      if (error && error.status === 422 && error.data && typeof error.data === "object") {
        const fieldMap = {
          company_id: "companyId",
          job_id: "jobId",
          candidate_id: "candidateId",
          interview_date: "interviewDate",
          remarks: "remarks",
          status: "status",
        };

        Object.entries(error.data).forEach(([field, detail]) => {
          if (typeof field !== "string") return;
          const mappedField = fieldMap[field] || field;
          if (!(mappedField in values)) return;
          const message =
            Array.isArray(detail)
              ? String(detail[0])
              : typeof detail === "string"
              ? detail
              : String(detail || "Invalid value");
          setError(mappedField, { type: "server", message });
        });
      } else if (error && error.status === 409) {
        pushToast({
          title: "Interview conflict",
          description:
            (error && error.message) ||
            "The interview could not be created due to a conflict.",
        });
      } else {
        pushToast({
          title: "Failed to save interview",
          description:
            (error && error.message) ||
            "An error occurred while saving the interview.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <InterviewForm
        onSubmit={handleSubmit}
        submitting={submitting}
        allowJoinedStatus={false}
      />
    </div>
  );
}
