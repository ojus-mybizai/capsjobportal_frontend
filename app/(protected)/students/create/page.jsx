"use client";

import { useEffect } from "react";
import { useUIStore } from "@/stores/ui";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function CreateStudentPage() {
  const setPageMetadata = useUIStore((state) => state.setPageMetadata);

  useEffect(() => {
    setPageMetadata("New student", "Create a new student");
  }, [setPageMetadata]);

  useEffect(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const firstInput = main.querySelector("input");
    if (firstInput) firstInput.focus();
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
  }

  return (
    <div className="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-3 text-sm">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">Name</label>
          <Input name="name" placeholder="Student name" />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">Email</label>
          <Input name="email" type="email" placeholder="name@example.com" />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-700">Phone</label>
          <Input name="phone" placeholder="Phone number" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="submit">Save student</Button>
        </div>
      </form>
    </div>
  );
}
