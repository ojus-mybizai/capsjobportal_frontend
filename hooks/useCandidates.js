"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import {
  changeCandidateStatus,
  createCandidate,
  createCandidatePayment,
  deleteCandidate,
  deleteCandidatePayment,
  deleteJocFee,
  getCandidate,
  listCandidateAppliedJobs,
  listCandidateOptions,
  listCandidatePayments,
  listCandidateRelatedJobs,
  listCandidates,
  updateCandidate,
  updateCandidatePayment,
  updateJocFee,
  uploadCandidateFile,
} from "@/services/candidates";

export const candidatesKeys = {
  all: ["candidates"],
  lists: () => [...candidatesKeys.all, "list"],
  list: (filters) => [...candidatesKeys.lists(), filters],
  options: (q) => [...candidatesKeys.all, "options", q],
  details: () => [...candidatesKeys.all, "detail"],
  detail: (id) => [...candidatesKeys.details(), String(id)],
  payments: (candidateId) => [...candidatesKeys.detail(candidateId), "payments"],
  appliedJobs: (candidateId) => [...candidatesKeys.detail(candidateId), "applied-jobs"],
  relatedJobs: (candidateId, params) => [
    ...candidatesKeys.detail(candidateId),
    "related-jobs",
    params || {},
  ],
};

export function useCandidatesList(filters) {
  return useQuery({
    queryKey: candidatesKeys.list(filters),
    queryFn: () => listCandidates(filters),
    placeholderData: keepPreviousData,
  });
}

export function useCandidate(id, options = {}) {
  return useQuery({
    queryKey: candidatesKeys.detail(id),
    queryFn: () => getCandidate(id),
    enabled: !!id && options.enabled !== false,
  });
}

export function useCandidateOptions(q) {
  return useQuery({
    queryKey: candidatesKeys.options(q || ""),
    queryFn: () => listCandidateOptions({ q }),
    staleTime: 60_000,
  });
}

export function useCandidatePaymentsList(candidateId) {
  return useQuery({
    queryKey: candidatesKeys.payments(candidateId),
    queryFn: () => listCandidatePayments(candidateId),
    enabled: !!candidateId,
  });
}

export function useCandidateAppliedJobs(candidateId, options = {}) {
  return useQuery({
    queryKey: candidatesKeys.appliedJobs(candidateId),
    queryFn: () => listCandidateAppliedJobs(candidateId),
    enabled: !!candidateId && options.enabled !== false,
  });
}

export function useCandidateRelatedJobs(candidateId, params, options = {}) {
  return useQuery({
    queryKey: candidatesKeys.relatedJobs(candidateId, params),
    queryFn: () => listCandidateRelatedJobs(candidateId, params),
    enabled: !!candidateId && options.enabled !== false,
  });
}

export function useCreateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createCandidate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: candidatesKeys.lists() });
    },
  });
}

export function useUpdateCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => updateCandidate(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: candidatesKeys.lists() });
      if (vars?.id) {
        qc.invalidateQueries({ queryKey: candidatesKeys.detail(vars.id) });
      }
    },
  });
}

export function useChangeCandidateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => changeCandidateStatus(id, payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: candidatesKeys.lists() });
      if (vars?.id) {
        qc.invalidateQueries({ queryKey: candidatesKeys.detail(vars.id) });
      }
    },
  });
}

export function useDeleteCandidate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteCandidate,
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: candidatesKeys.lists() });
      qc.removeQueries({ queryKey: candidatesKeys.detail(id) });
    },
  });
}

export function useUploadCandidateFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }) => uploadCandidateFile(id, formData),
    onSuccess: (_data, vars) => {
      if (vars?.id) {
        qc.invalidateQueries({ queryKey: candidatesKeys.detail(vars.id) });
      }
    },
  });
}

export function useCreateCandidatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ candidateId, payload }) => createCandidatePayment(candidateId, payload),
    onSuccess: (_data, vars) => {
      if (vars?.candidateId) {
        qc.invalidateQueries({ queryKey: candidatesKeys.payments(vars.candidateId) });
        qc.invalidateQueries({ queryKey: candidatesKeys.detail(vars.candidateId) });
      }
    },
  });
}

export function useUpdateCandidatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, payload, candidateId }) =>
      updateCandidatePayment(paymentId, payload).then((res) => ({ ...res, candidateId })),
    onSuccess: (data, vars) => {
      const cid = vars?.candidateId || data?.candidateId;
      if (cid) {
        qc.invalidateQueries({ queryKey: candidatesKeys.payments(cid) });
        qc.invalidateQueries({ queryKey: candidatesKeys.detail(cid) });
      }
    },
  });
}

export function useDeleteCandidatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, candidateId }) =>
      deleteCandidatePayment(paymentId).then((res) => ({ ...res, candidateId })),
    onSuccess: (_data, vars) => {
      if (vars?.candidateId) {
        qc.invalidateQueries({ queryKey: candidatesKeys.payments(vars.candidateId) });
        qc.invalidateQueries({ queryKey: candidatesKeys.detail(vars.candidateId) });
      }
    },
  });
}

export function useUpdateJocFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ feeId, payload, candidateId }) =>
      updateJocFee(feeId, payload).then((res) => ({ ...res, candidateId })),
    onSuccess: (_data, vars) => {
      if (vars?.candidateId) {
        qc.invalidateQueries({ queryKey: candidatesKeys.detail(vars.candidateId) });
      }
    },
  });
}

export function useDeleteJocFee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ feeId, candidateId }) =>
      deleteJocFee(feeId).then((res) => ({ ...res, candidateId })),
    onSuccess: (_data, vars) => {
      if (vars?.candidateId) {
        qc.invalidateQueries({ queryKey: candidatesKeys.detail(vars.candidateId) });
      }
    },
  });
}
