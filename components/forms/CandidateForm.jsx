"use client";

import { useCallback, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { useMastersStore } from "@/stores/masters";
import { getJob, listJobs } from "@/services/jobs";
import AsyncSearchSelect from "@/components/ui/AsyncSearchSelect";

const emailSchema = z.string().trim().email("Enter a valid email").or(z.literal("")).optional();

const schema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  email: emailSchema,
  mobile_number: z.string().min(1, "Mobile number is required"),
  alternate_mobile_number: z.string().optional(),
  address: z.string().optional(),
  location_area_id: z.string().optional(),
  experience_level: z
    .enum(["FRESHER", "0_1_YEARS", "1_3_YEARS", "3_5_YEARS", "5_PLUS_YEARS"])
    .optional(),
  status: z.enum(["REGISTERED", "CAPS", "JOC", "FREE"], {
    required_error: "Status is required",
  }),
  employment_status: z.enum(["EMPLOYED", "UNEMPLOYED"]).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "BOTH"]).optional(),
  expected_salary: z.string().optional(),
  dob: z.string().optional(),
  reference: z.string().optional(),
  skills: z.array(z.string().min(1)).optional(),
  education: z.array(z.string().min(1)).optional(),
  degree: z.array(z.string().min(1)).optional(),
  resumeFile: z.any().optional(),
  photoFile: z.any().optional(),
  registration_amount: z.string().optional(),
  registration_date: z.string().optional(),
  joc_total_fee: z.string().optional(),
  joc_due_date: z.string().optional(),
  joc_initial_amount: z.string().optional(),
  joc_initial_payment_date: z.string().optional(),
});

export default function CandidateForm({
  defaultValues,
  onSubmit,
  submitting,
  showCreatePaymentFields = false,
  showFileInputs = true,
  disableStatusField = false,
  disableAppliedJobField = false,
}) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    setError,
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues || {
      skills: [],
      education: [],
    },
  });

  const loadMaster = useMastersStore((state) => state.loadMaster);
  const getOptions = useMastersStore((state) => state.getOptions);

  const [locationOptions, setLocationOptions] = useState([]);
  const [skillOptions, setSkillOptions] = useState([]);
  const [educationOptions, setEducationOptions] = useState([]);
  const [degreeOptions, setDegreeOptions] = useState([]);
  const [skillInput, setSkillInput] = useState("");
  const [educationInput, setEducationInput] = useState("");
  const [degreeInput, setDegreeInput] = useState("");

  const formatOptionLabel = useCallback((value, options) => {
    return (
      options.find((opt) => String(opt.value) === String(value))?.label || value
    );
  }, []);

  const skills = watch("skills") || [];
  const education = watch("education") || [];
  const degree = watch("degree") || [];
  const status = watch("status") || "REGISTERED";

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        await loadMaster("location");
        if (!active) return;
        setLocationOptions(getOptions("location"));
        await loadMaster("skill");
        await loadMaster("education");
        await loadMaster("degree");
        if (!active) return;
        setSkillOptions(getOptions("skill"));
        setEducationOptions(getOptions("education"));
        setDegreeOptions(getOptions("degree"));
      } catch {
        if (!active) return;
        setLocationOptions([]);
        setSkillOptions([]);
        setEducationOptions([]);
        setDegreeOptions([]);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, [loadMaster, getOptions]);

  async function loadJobOptions({ query, limit }) {
    const result = await listJobs({ page: 1, limit: limit || 20, q: query || "" });
    if (Array.isArray(result?.items)) return result.items;
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result)) return result;
    return [];
  }

  async function resolveJobLabel({ value }) {
    const job = await getJob(value);
    if (!job) return "";
    return job.title || job.name || `Job #${value}`;
  }

  function handleFileChange(field, event) {
    const file = event.target.files && event.target.files[0];
    setValue(field, file);
  }

  function addSkillFromInput() {
    const value = skillInput.trim();
    if (!value) return;
    const current = Array.isArray(skills) ? skills : [];
    if (current.includes(value)) {
      setSkillInput("");
      return;
    }
    setValue("skills", [...current, value], { shouldValidate: true });
    setSkillInput("");
  }

  function removeSkill(index) {
    const current = Array.isArray(skills) ? skills : [];
    setValue(
      "skills",
      current.filter((_, i) => i !== index),
      { shouldValidate: true }
    );
  }

  function addEducationFromInput() {
    const value = educationInput.trim();
    if (!value) return;
    const current = Array.isArray(education) ? education : [];
    if (current.includes(value)) {
      setEducationInput("");
      return;
    }
    setValue("education", [...current, value], { shouldValidate: true });
    setEducationInput("");
  }

  function addDegreeFromInput() {
    const value = degreeInput.trim();
    if (!value) return;
    const current = Array.isArray(degree) ? degree : [];
    if (current.includes(value)) {
      setDegreeInput("");
      return;
    }
    setValue("degree", [...current, value], { shouldValidate: true });
    setDegreeInput("");
  }

  function removeEducation(index) {
    const current = Array.isArray(education) ? education : [];
    setValue(
      "education",
      current.filter((_, i) => i !== index),
      { shouldValidate: true }
    );
  }

  function removeDegree(index) {
    const current = Array.isArray(degree) ? degree : [];
    setValue(
      "degree",
      current.filter((_, i) => i !== index),
      { shouldValidate: true }
    );
  }

  function handleFormSubmit(values) {
    if (onSubmit) {
      return onSubmit(values, { setError });
    }
  }

  const createdAt = defaultValues && defaultValues.created_at;

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-3 text-sm"
    >
      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-700">
          Full name
        </label>
        <Input {...register("full_name")} />
        {errors.full_name && (
          <p className="mt-1 text-xs text-[var(--danger)]">
            {errors.full_name.message}
          </p>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Email
          </label>
          <Input type="email" {...register("email")} />
          {errors.email && (
            <p className="mt-1 text-xs text-[var(--danger)]">
              {errors.email.message}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Mobile
          </label>
          <Input {...register("mobile_number")} />
          {errors.mobile_number && (
            <p className="mt-1 text-xs text-[var(--danger)]">
              {errors.mobile_number.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Alternate mobile
          </label>
          <Input {...register("alternate_mobile_number")} />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Status
          </label>
          <Select {...register("status")} disabled={disableStatusField}>
            <option value="">Select status</option>
            <option value="REGISTERED">Registered</option>
            <option value="CAPS">CAPS</option>
            <option value="JOC">JOC</option>
            <option value="FREE">Free</option>
          </Select>
          {errors.status && (
            <p className="mt-1 text-xs text-[var(--danger)]">
              {errors.status.message}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Employment status
          </label>
          <Select {...register("employment_status")}>
            <option value="">Select employment status</option>
            <option value="EMPLOYED">Employed</option>
            <option value="UNEMPLOYED">Unemployed</option>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Gender
          </label>
          <Select {...register("gender")}>
            <option value="">Select gender</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
            <option value="BOTH">Both</option>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Expected salary
          </label>
          <Input type="number" min="0" step="1" {...register("expected_salary")} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Date of birth
          </label>
          <Input type="date" {...register("dob")} />
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-700">
          Address
        </label>
        <textarea
          rows={3}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2 text-sm outline-none ring-0 focus:border-[var(--accent)]"
          {...register("address")}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Preferred location area
          </label>
          <Select {...register("location_area_id")}>
            <option value="">Select location</option>
            {locationOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Experience level
          </label>
          <Select {...register("experience_level")}>
            <option value="">Select experience level</option>
            <option value="FRESHER">Fresher</option>
            <option value="0_1_YEARS">0-1 years</option>
            <option value="1_3_YEARS">1-3 years</option>
            <option value="3_5_YEARS">3-5 years</option>
            <option value="5_PLUS_YEARS">5+ years</option>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Reference
          </label>
          <Input {...register("reference")} />
        </div>
        {createdAt && (
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Created at
            </label>
            <p className="rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2 text-[11px] text-slate-700">
              {createdAt}
            </p>
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Skills
          </label>
          <div className="flex gap-2">
            <Select
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              className="bg-white"
            >
              <option value="">Select skill</option>
              {skillOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            <Button type="button" size="sm" onClick={addSkillFromInput}>
              Add
            </Button>
          </div>
          {Array.isArray(skills) && skills.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {skills.map((skill, index) => (
                <span
                  key={`${skill}-${index}`}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-muted)] px-2 py-0.5 text-[11px] text-slate-700"
                >
                  <span>{formatOptionLabel(skill, skillOptions)}</span>
                  <button
                    type="button"
                    onClick={() => removeSkill(index)}
                    className="text-[10px] text-slate-500 hover:text-slate-700"
                    aria-label="Remove skill"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {errors.skills && (
            <p className="mt-1 text-xs text-[var(--danger)]">
              {errors.skills.message}
            </p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Education
          </label>
          <div className="flex gap-2">
            <Select
              value={educationInput}
              onChange={(e) => setEducationInput(e.target.value)}
              className="bg-white"
            >
              <option value="">Select education</option>
              {educationOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            <Button type="button" size="sm" onClick={addEducationFromInput}>
              Add
            </Button>
          </div>
          {Array.isArray(education) && education.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {education.map((item, index) => (
                <span
                  key={`${item}-${index}`}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-muted)] px-2 py-0.5 text-[11px] text-slate-700"
                >
                  <span>{formatOptionLabel(item, educationOptions)}</span>
                  <button
                    type="button"
                    onClick={() => removeEducation(index)}
                    className="text-[10px] text-slate-500 hover:text-slate-700"
                    aria-label="Remove education entry"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {errors.education && (
            <p className="mt-1 text-xs text-[var(--danger)]">
              {errors.education.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-700">
          Degree
        </label>
        <div className="flex gap-2">
          <Select
            value={degreeInput}
            onChange={(e) => setDegreeInput(e.target.value)}
            className="bg-white"
          >
            <option value="">Select degree</option>
            {degreeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
          <Button type="button" size="sm" onClick={addDegreeFromInput}>
            Add
          </Button>
        </div>
        {Array.isArray(degree) && degree.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {degree.map((item, index) => (
              <span
                key={`${item}-${index}`}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-muted)] px-2 py-0.5 text-[11px] text-slate-700"
              >
                <span>{formatOptionLabel(item, degreeOptions)}</span>
                <button
                  type="button"
                  onClick={() => removeDegree(index)}
                  className="text-[10px] text-slate-500 hover:text-slate-700"
                  aria-label="Remove degree entry"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
        {errors.degree && (
          <p className="mt-1 text-xs text-[var(--danger)]">
            {errors.degree.message}
          </p>
        )}
      </div>

      {showCreatePaymentFields && (
        <div className="space-y-3 rounded-md border border-[var(--border)] bg-[var(--bg)] p-3 text-xs">
          {status === "REGISTERED" && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-700">
                  Registration amount
                </label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  {...register("registration_amount")}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-700">
                  Registration date & time
                </label>
                <Input
                  type="datetime-local"
                  {...register("registration_date")}
                />
              </div>
            </div>
          )}

          {status === "JOC" && (
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-700">
                    Total fee
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    {...register("joc_total_fee")}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-700">
                    Fee due date
                  </label>
                  <Input type="date" {...register("joc_due_date")} />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-700">
                    Initial payment amount
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    {...register("joc_initial_amount")}
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-medium text-slate-700">
                    Initial payment date & time
                  </label>
                  <Input
                    type="datetime-local"
                    {...register("joc_initial_payment_date")}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {showFileInputs && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Resume
            </label>
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => handleFileChange("resumeFile", e)}
              className="block w-full text-xs text-slate-600 file:mr-2 file:rounded-md file:border file:border-[var(--border)] file:bg-[var(--bg)] file:px-2 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-50"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-700">
              Photo
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => handleFileChange("photoFile", e)}
              className="block w-full text-xs text-slate-600 file:mr-2 file:rounded-md file:border file:border-[var(--border)] file:bg-[var(--bg)] file:px-2 file:py-1 file:text-xs file:font-medium file:text-slate-700 hover:file:bg-slate-50"
            />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save candidate"}
        </Button>
      </div>
    </form>
  );
}
