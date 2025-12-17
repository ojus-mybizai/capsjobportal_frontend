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
  experience_level: z.string().optional(),
  employment_type: z.string().optional(),
  skills: z.array(z.string().min(1)).optional(),
  education: z.array(z.string().min(1)).optional(),
  location_area_id: z.string().optional(),
  description: z.string().optional(),
  responsibilities: z.string().optional(),
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
  const [skillInput, setSkillInput] = useState("");
  const [educationInput, setEducationInput] = useState("");

  const skills = watch("skills") || [];
  const education = watch("education") || [];

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        await loadMaster("location");
        if (!active) return;

        setLocationOptions(getOptions("location"));
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

  function removeEducation(index) {
    const current = Array.isArray(education) ? education : [];
    setValue(
      "education",
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
            <option value="0-2 YEARS">0-2 years</option>
            <option value="2-5 YEARS">2-5 years</option>
            <option value="5+ YEARS">5+ years</option>
          </Select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Employment type
          </label>
          <Select {...register("employment_type")}>
            <option value="">Select employment type</option>
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
            Skills
          </label>
          <div className="flex gap-2">
            <Input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addSkillFromInput();
                }
              }}
              placeholder="Add a skill and press Enter"
            />
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
            <Input
              value={educationInput}
              onChange={(e) => setEducationInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addEducationFromInput();
                }
              }}
              placeholder="Add an education entry and press Enter"
            />
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
