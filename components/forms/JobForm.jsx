"use client";

import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { useMastersStore } from "@/stores/masters";
import { getCompany, listCompanies } from "@/services/companies";
import AsyncSearchSelect from "@/components/ui/AsyncSearchSelect";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  company_id: z.string().min(1, "Company is required"),
  num_vacancies: z.string().optional(),
  salary_min: z.string().optional(),
  salary_max: z.string().optional(),
  experience_level: z
    .enum(["FRESHER", "0_1_YEARS", "1_3_YEARS", "3_5_YEARS", "5_PLUS_YEARS"])
    .optional(),
  experience: z.string().optional(),
  qualification: z.string().optional(),
  job_categories: z.array(z.string().min(1)).optional(),
  job_type: z.enum(["FULL_TIME", "PART_TIME", "INTERNSHIP"]).optional(),
  status: z.enum(["OPEN", "FULFILLED", "DROPPED"]).optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "BOTH"]).optional(),
  skills: z.array(z.string().min(1)).optional(),
  education: z.array(z.string().min(1)).optional(),
  degree: z.array(z.string().min(1)).optional(),
  location_area_id: z.string().optional(),
  description: z.string().optional(),
  responsibilities: z.string().optional(),
  contact_person: z.string().optional(),
});

export default function JobForm({
  defaultValues,
  onSubmit,
  submitting,
  disableCompanyField = false,
}) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues || {},
  });

  const loadMaster = useMastersStore((state) => state.loadMaster);
  const getOptions = useMastersStore((state) => state.getOptions);

  const [locationOptions, setLocationOptions] = useState([]);
  const [skillOptions, setSkillOptions] = useState([]);
  const [educationOptions, setEducationOptions] = useState([]);
  const [degreeOptions, setDegreeOptions] = useState([]);
  const [jobCategoryOptions, setJobCategoryOptions] = useState([]);
  const [skillInput, setSkillInput] = useState("");
  const [educationInput, setEducationInput] = useState("");
  const [degreeInput, setDegreeInput] = useState("");
  const [jobCategoryInput, setJobCategoryInput] = useState("");

  const skills = watch("skills") || [];
  const education = watch("education") || [];
  const degree = watch("degree") || [];
  const jobCategories = watch("job_categories") || [];

  useEffect(() => {
    register("job_categories");
    let active = true;

    async function loadData() {
      try {
        await loadMaster("location");
        if (!active) return;
        setLocationOptions(getOptions("location"));
        await loadMaster("skill");
        await loadMaster("education");
        await loadMaster("degree");
        await loadMaster("job_category");
        if (!active) return;
        setSkillOptions(getOptions("skill"));
        setEducationOptions(getOptions("education"));
        setDegreeOptions(getOptions("degree"));
        setJobCategoryOptions(getOptions("job_category"));
      } catch {
        // keep form usable even if masters fail
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, [loadMaster, getOptions]);

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

  function addJobCategoryFromInput() {
    const value = jobCategoryInput.trim();
    if (!value) return;
    const current = Array.isArray(jobCategories) ? jobCategories : [];
    if (current.includes(value)) {
      setJobCategoryInput("");
      return;
    }
    setValue("job_categories", [...current, value], { shouldValidate: true });
    setJobCategoryInput("");
  }

  function removeJobCategory(index) {
    const current = Array.isArray(jobCategories) ? jobCategories : [];
    setValue(
      "job_categories",
      current.filter((_, i) => i !== index),
      { shouldValidate: true }
    );
  }

  function handleFormSubmit(values) {
    if (onSubmit) {
      return onSubmit(values, { setError });
    }
  }

  async function loadCompanyOptions({ query, limit }) {
    const result = await listCompanies({ page: 1, limit: limit || 20, q: query || "" });
    if (Array.isArray(result?.items)) return result.items;
    if (Array.isArray(result?.data)) return result.data;
    if (Array.isArray(result)) return result;
    return [];
  }

  async function resolveCompanyLabel({ value }) {
    const company = await getCompany(value);
    if (!company) return "";
    return company.name || company.title || company.company_name || `Company #${value}`;
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-3 text-sm"
    >
      <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">Company</label>
          <Controller
            control={control}
            name="company_id"
            render={({ field }) => (
              <AsyncSearchSelect
                value={field.value}
                onChange={field.onChange}
                disabled={disableCompanyField}
                placeholder="Select company"
                searchPlaceholder="Search companies..."
                loadOptions={loadCompanyOptions}
                getOptionValue={(c) => c.id}
                getOptionLabel={(c) => c.name || c.title || c.company_name || `Company #${c.id}`}
                resolveSelectedLabel={resolveCompanyLabel}
                allowClear={!disableCompanyField}
              />
            )}
          />
          {errors.company_id && (
            <p className="mt-1 text-xs text-[var(--danger)]">
              {errors.company_id.message}
            </p>
          )}
        </div>
      

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-700">Title</label>
        <Input {...register("title")} />
        {errors.title && (
          <p className="mt-1 text-xs text-[var(--danger)]">{errors.title.message}</p>
        )}
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
            Job type
          </label>
          <Select {...register("job_type")}>
            <option value="">Select job type</option>
            <option value="FULL_TIME">Full time</option>
            <option value="PART_TIME">Part time</option>
            <option value="INTERNSHIP">Internship</option>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">Location</label>
          <Select {...register("location_area_id")}>
            <option value="">Select location</option>
            {locationOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Job categories
          </label>
          <div className="flex gap-2">
            <Select
              value={jobCategoryInput}
              onChange={(e) => setJobCategoryInput(e.target.value)}
              className="bg-white"
            >
              <option value="">Select category</option>
              {jobCategoryOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            <Button type="button" size="sm" onClick={addJobCategoryFromInput}>
              Add
            </Button>
          </div>
          {Array.isArray(jobCategories) && jobCategories.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {jobCategories.map((item, index) => (
                <span
                  key={`${item}-${index}`}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--bg-muted)] px-2 py-0.5 text-[11px] text-slate-700"
                >
                  <span>{item}</span>
                  <button
                    type="button"
                    onClick={() => removeJobCategory(index)}
                    className="text-[10px] text-slate-500 hover:text-slate-700"
                    aria-label="Remove job category"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          {errors.job_categories && (
            <p className="mt-1 text-xs text-[var(--danger)]">
              {errors.job_categories.message}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Contact person
          </label>
          <Input placeholder="Who to contact" {...register("contact_person")} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Qualification
          </label>
          <Input placeholder="e.g. B.Tech" {...register("qualification")} />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Experience text
          </label>
          <Input placeholder="e.g. 5+ years" {...register("experience")} />
        </div>
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
                  <span>{skill}</span>
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
                  <span>{item}</span>
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
                <span>{item}</span>
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

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Status
          </label>
          <Select {...register("status")}>
            <option value="">Select status</option>
            <option value="OPEN">Open</option>
            <option value="FULFILLED">Fulfilled</option>
            <option value="DROPPED">Dropped</option>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Gender preference
          </label>
          <Select {...register("gender")}>
            <option value="">Select gender</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
            <option value="BOTH">Both</option>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Vacancies
          </label>
          <Input type="number" min="1" {...register("num_vacancies")} />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Salary min
          </label>
          <Input type="number" min="0" {...register("salary_min")} />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Salary max
          </label>
          <Input type="number" min="0" {...register("salary_max")} />
        </div>
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-700">
          Description
        </label>
        <textarea
          rows={3}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2 text-sm outline-none ring-0 focus:border-[var(--accent)]"
          {...register("description")}
        />
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-700">
          Responsibilities
        </label>
        <textarea
          rows={3}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2 text-sm outline-none ring-0 focus:border-[var(--accent)]"
          {...register("responsibilities")}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save job"}
        </Button>
      </div>
    </form>
  );
}
