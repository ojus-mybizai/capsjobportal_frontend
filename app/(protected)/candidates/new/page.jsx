"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUIStore } from "@/stores/ui";
import CandidateForm from "@/components/forms/CandidateForm";
import { createCandidate, uploadCandidateFile } from "@/services/candidates";

export default function NewCandidatePage() {
  const router = useRouter();
  const setPageMetadata = useUIStore((state) => state.setPageMetadata);
  const pushToast = useUIStore((state) => state.pushToast);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setPageMetadata("New candidate", "Create a new candidate");
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
      const skillsArray = Array.isArray(values.skills)
        ? values.skills.filter((item) => !!item && String(item).trim())
        : [];

      const educationArray = Array.isArray(values.education)
        ? values.education.filter((item) => !!item && String(item).trim())
        : [];

      const degreeArray = Array.isArray(values.degree)
        ? values.degree.filter((item) => !!item && String(item).trim())
        : [];

      const basePayload = {
        full_name: values.full_name,
        email: values.email || undefined,
        mobile_number: values.mobile_number,
        alternate_mobile_number: values.alternate_mobile_number || undefined,
        address: values.address || undefined,
        location_area_id: values.location_area_id || undefined,
        experience_level: values.experience_level || undefined,
        applied_job_id: values.applied_job_id || undefined,
        reference: values.reference || undefined,
        status: values.status,
        employment_status: values.employment_status || undefined,
        gender: values.gender || undefined,
        expected_salary: values.expected_salary
          ? Number(values.expected_salary)
          : undefined,
        dob: values.dob || undefined,
        skills: skillsArray.length > 0 ? skillsArray : undefined,
        education: educationArray.length > 0 ? educationArray : undefined,
        degree: degreeArray.length > 0 ? degreeArray : undefined,
      };

      const payload = { ...basePayload };

      if (values.status === "REGISTERED") {
        const amountNumber = values.registration_amount
          ? Number(values.registration_amount)
          : undefined;
        let paymentDateIso;
        if (values.registration_date) {
          const d = new Date(values.registration_date);
          if (!Number.isNaN(d.getTime())) {
            paymentDateIso = d.toISOString();
          }
        }
        payload.initial_payment = {
          amount:
            Number.isFinite(amountNumber) && amountNumber > 0
              ? amountNumber
              : undefined,
          payment_date: paymentDateIso || undefined,
        };
      } else if (values.status === "JOC") {
        const totalFeeNumber = values.joc_total_fee
          ? Number(values.joc_total_fee)
          : undefined;
        const initAmountNumber = values.joc_initial_amount
          ? Number(values.joc_initial_amount)
          : undefined;
        let initPaymentDateIso;
        if (values.joc_initial_payment_date) {
          const d = new Date(values.joc_initial_payment_date);
          if (!Number.isNaN(d.getTime())) {
            initPaymentDateIso = d.toISOString();
          }
        }

        payload.fee_structure = {
          total_fee:
            Number.isFinite(totalFeeNumber) && totalFeeNumber > 0
              ? totalFeeNumber
              : undefined,
          due_date: values.joc_due_date || undefined,
        };
        payload.initial_payment = {
          amount:
            Number.isFinite(initAmountNumber) && initAmountNumber > 0
              ? initAmountNumber
              : undefined,
          payment_date: initPaymentDateIso || undefined,
        };
      }

      const candidate = await createCandidate(payload);

      if (values.resumeFile || values.photoFile) {
        const formData = new FormData();
        if (values.resumeFile) {
          formData.append("resume", values.resumeFile);
        }
        if (values.photoFile) {
          formData.append("photo", values.photoFile);
        }
        await uploadCandidateFile(candidate.id, formData);
      }

      pushToast({
        title: "Candidate created",
        description: "The candidate was created successfully.",
      });
      router.replace(`/candidates/${candidate.id}`);
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
          title: "Candidate conflict",
          description:
            (error && error.message) ||
            "The candidate could not be created due to a conflict.",
        });
      } else {
        pushToast({
          title: "Failed to save candidate",
          description:
            (error && error.message) ||
            "An error occurred while saving the candidate.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <CandidateForm
        onSubmit={handleSubmit}
        submitting={submitting}
        showCreatePaymentFields
      />
    </div>
  );
}
