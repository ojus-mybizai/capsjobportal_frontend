"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import {
  createCompany,
  createCompanyPayment,
  deleteCompany,
  deleteCompanyPayment,
  getCompany,
  listCompanies,
  listCompanyOptions,
  listCompanyPayments,
  updateCompany,
  updateCompanyPayment,
  uploadCompanyMedia,
} from "@/services/companies";

export const companiesKeys = {
  all: ["companies"],
  lists: () => [...companiesKeys.all, "list"],
  list: (filters) => [...companiesKeys.lists(), filters],
  options: (q) => [...companiesKeys.all, "options", q],
  details: () => [...companiesKeys.all, "detail"],
  detail: (id) => [...companiesKeys.details(), String(id)],
  payments: (companyId) => [...companiesKeys.detail(companyId), "payments"],
};

export function useCompaniesList(filters) {
  return useQuery({
    queryKey: companiesKeys.list(filters),
    queryFn: () => listCompanies(filters),
    placeholderData: keepPreviousData,
  });
}

export function useCompany(id, options = {}) {
  return useQuery({
    queryKey: companiesKeys.detail(id),
    queryFn: () => getCompany(id),
    enabled: !!id && options.enabled !== false,
  });
}

export function useCompanyOptions(q) {
  return useQuery({
    queryKey: companiesKeys.options(q || ""),
    queryFn: () => listCompanyOptions({ q }),
    staleTime: 60_000,
  });
}

export function useCompanyPaymentsList(companyId) {
  return useQuery({
    queryKey: companiesKeys.payments(companyId),
    queryFn: () => listCompanyPayments(companyId),
    enabled: !!companyId,
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCompany,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: companiesKeys.lists() });
    },
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateCompany(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: companiesKeys.lists() });
      if (vars?.id) {
        qc.invalidateQueries({ queryKey: companiesKeys.detail(vars.id) });
      }
    },
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCompany,
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: companiesKeys.lists() });
      qc.removeQueries({ queryKey: companiesKeys.detail(id) });
    },
  });
}

export function useUploadCompanyMedia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }) => uploadCompanyMedia(id, formData),
    onSuccess: (_data, vars) => {
      if (vars?.id) {
        qc.invalidateQueries({ queryKey: companiesKeys.detail(vars.id) });
      }
    },
  });
}

export function useCreateCompanyPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, payload }) => createCompanyPayment(companyId, payload),
    onSuccess: (_data, vars) => {
      if (vars?.companyId) {
        qc.invalidateQueries({ queryKey: companiesKeys.payments(vars.companyId) });
        qc.invalidateQueries({ queryKey: companiesKeys.detail(vars.companyId) });
      }
    },
  });
}

export function useUpdateCompanyPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, payload, companyId }) =>
      updateCompanyPayment(paymentId, payload).then((res) => ({ ...res, companyId })),
    onSuccess: (data, vars) => {
      const cid = vars?.companyId || data?.companyId;
      if (cid) {
        qc.invalidateQueries({ queryKey: companiesKeys.payments(cid) });
        qc.invalidateQueries({ queryKey: companiesKeys.detail(cid) });
      }
    },
  });
}

export function useDeleteCompanyPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, companyId }) =>
      deleteCompanyPayment(paymentId).then((res) => ({ ...res, companyId })),
    onSuccess: (_data, vars) => {
      if (vars?.companyId) {
        qc.invalidateQueries({ queryKey: companiesKeys.payments(vars.companyId) });
        qc.invalidateQueries({ queryKey: companiesKeys.detail(vars.companyId) });
      }
    },
  });
}
