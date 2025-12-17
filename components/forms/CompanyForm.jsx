"use client";

import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useMastersStore } from "@/stores/masters";
import AsyncSearchSelect from "@/components/ui/AsyncSearchSelect";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  category_id: z.string().optional(),
  location_area_id: z.string().optional(),
  address: z.string().optional(),
  location_link: z.string().optional(),
  contact_person: z.string().optional(),
  contact_number: z.string().optional(),
  email: z.string().email("Enter a valid email").optional(),
  notes: z.string().optional(),
});

export default function CompanyForm({ defaultValues, onSubmit, submitting }) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues || {},
  });

  const loadMaster = useMastersStore((state) => state.loadMaster);
  const createMasterItem = useMastersStore((state) => state.createMasterItem);
  const categoryItems = useMastersStore((state) => state.masters.company_category || []);
  const locationItems = useMastersStore((state) => state.masters.location || []);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        await Promise.all([
          loadMaster("company_category"),
          loadMaster("location"),
        ]);
        if (!active) return;
      } catch {
        // masters errors are surfaced elsewhere; keep form usable
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [loadMaster]);

  function handleFormSubmit(values) {
    if (onSubmit) {
      return onSubmit(values, { setError });
    }
  }

  function getMasterLabel(item) {
    if (!item) return "";
    return item.label || item.name || String(item.value || item.id || "");
  }

  function getMasterValue(item) {
    if (!item) return "";
    return item.value || item.id || item.name;
  }

  async function loadCategoryOptions({ query, limit }) {
    const q = String(query || "").trim().toLowerCase();
    const items = Array.isArray(categoryItems) ? categoryItems : [];
    const filtered = q
      ? items.filter((it) => getMasterLabel(it).toLowerCase().includes(q))
      : items;
    return filtered.slice(0, limit || 20);
  }

  async function loadLocationOptions({ query, limit }) {
    const q = String(query || "").trim().toLowerCase();
    const items = Array.isArray(locationItems) ? locationItems : [];
    const filtered = q
      ? items.filter((it) => getMasterLabel(it).toLowerCase().includes(q))
      : items;
    return filtered.slice(0, limit || 20);
  }

  async function resolveCategoryLabel({ value }) {
    const items = Array.isArray(categoryItems) ? categoryItems : [];
    const found = items.find((it) => String(getMasterValue(it)) === String(value));
    return found ? getMasterLabel(found) : "";
  }

  async function resolveLocationLabel({ value }) {
    const items = Array.isArray(locationItems) ? locationItems : [];
    const found = items.find((it) => String(getMasterValue(it)) === String(value));
    return found ? getMasterLabel(found) : "";
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-3 text-sm"
    >
      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-700">Name</label>
        <Input {...register("name")} />
        {errors.name && (
          <p className="mt-1 text-xs text-[var(--danger)]">{errors.name.message}</p>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Category
          </label>
          <Controller
            control={control}
            name="category_id"
            render={({ field }) => (
              <AsyncSearchSelect
                value={field.value}
                onChange={field.onChange}
                placeholder="Select category"
                searchPlaceholder="Search categories..."
                loadOptions={loadCategoryOptions}
                getOptionValue={getMasterValue}
                getOptionLabel={getMasterLabel}
                resolveSelectedLabel={resolveCategoryLabel}
                onCreateOption={({ query }) =>
                  createMasterItem("company_category", { name: query })
                }
                createLabel="Add"
                allowClear
              />
            )}
          />
          {errors.category_id && (
            <p className="mt-1 text-xs text-[var(--danger)]">
              {errors.category_id.message}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Location
          </label>
          <Controller
            control={control}
            name="location_area_id"
            render={({ field }) => (
              <AsyncSearchSelect
                value={field.value}
                onChange={field.onChange}
                placeholder="Select location"
                searchPlaceholder="Search locations..."
                loadOptions={loadLocationOptions}
                getOptionValue={getMasterValue}
                getOptionLabel={getMasterLabel}
                resolveSelectedLabel={resolveLocationLabel}
                onCreateOption={({ query }) => createMasterItem("location", { name: query })}
                createLabel="Add"
                allowClear
              />
            )}
          />
          {errors.location_area_id && (
            <p className="mt-1 text-xs text-[var(--danger)]">
              {errors.location_area_id.message}
            </p>
          )}
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
        {errors.address && (
          <p className="mt-1 text-xs text-[var(--danger)]">
            {errors.address.message}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-700">Location link</label>
        <Input type="url" {...register("location_link")} />
        {errors.location_link && (
          <p className="mt-1 text-xs text-[var(--danger)]">
            {errors.location_link.message}
          </p>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Contact person
          </label>
          <Input {...register("contact_person")} />
          {errors.contact_person && (
            <p className="mt-1 text-xs text-[var(--danger)]">
              {errors.contact_person.message}
            </p>
          )}
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">
            Contact number
          </label>
          <Input {...register("contact_number")} />
          {errors.contact_number && (
            <p className="mt-1 text-xs text-[var(--danger)]">
              {errors.contact_number.message}
            </p>
          )}
        </div>
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
      </div>

      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-700">Notes</label>
        <textarea
          rows={3}
          className="w-full rounded-md border border-[var(--border)] bg-[var(--bg-muted)] px-3 py-2 text-sm outline-none ring-0 focus:border-[var(--accent)]"
          {...register("notes")}
        />
        {errors.notes && (
          <p className="mt-1 text-xs text-[var(--danger)]">
            {errors.notes.message}
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save company"}
        </Button>
      </div>
    </form>
  );
}
