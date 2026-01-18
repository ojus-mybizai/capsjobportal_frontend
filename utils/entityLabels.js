import { cachedRequest } from "./requestCache";
import { getCompany } from "../services/companies";
import { getJob } from "../services/jobs";
import { getCandidate } from "../services/candidates";
import { useCompaniesStore } from "../stores/companies";
import { useJobsStore } from "../stores/jobs";
import { useCandidatesStore } from "../stores/candidates";

function safeId(value) {
  if (value == null) return "";
  const s = String(value).trim();
  return s;
}

function extractLabel(entity, type) {
  if (!entity) return null;
  if (type === "company") {
    return entity?.name || entity?.title || entity?.company_name;
  }
  if (type === "job") {
    return entity?.title || entity?.name;
  }
  if (type === "candidate") {
    return entity?.full_name || entity?.name || entity?.candidate_name;
  }
  return null;
}

export function getCompanyLabel(id, { ttlMs = 5 * 60 * 1000 } = {}) {
  const keyId = safeId(id);
  if (!keyId) return Promise.resolve("-");
  
  // Check store cache first
  const storeState = useCompaniesStore.getState();
  const cached = storeState.byId[keyId];
  if (cached) {
    const label = extractLabel(cached, "company");
    if (label) return Promise.resolve(label);
  }
  
  return cachedRequest(
    `company:${keyId}`,
    async () => {
      const c = await getCompany(keyId);
      // Store will be updated when components use store.get() method
      return extractLabel(c, "company") || `Company #${keyId}`;
    },
    { ttlMs }
  ).catch(() => `Company #${keyId}`);
}

export function getJobLabel(id, { ttlMs = 5 * 60 * 1000 } = {}) {
  const keyId = safeId(id);
  if (!keyId) return Promise.resolve("-");
  
  // Check store cache first
  const storeState = useJobsStore.getState();
  const cached = storeState.byId[keyId];
  if (cached) {
    const label = extractLabel(cached, "job");
    if (label) return Promise.resolve(label);
  }
  
  return cachedRequest(
    `job:${keyId}`,
    async () => {
      const j = await getJob(keyId);
      // Store will be updated when components use store.get() method
      return extractLabel(j, "job") || `Job #${keyId}`;
    },
    { ttlMs }
  ).catch(() => `Job #${keyId}`);
}

export function getCandidateLabel(id, { ttlMs = 5 * 60 * 1000 } = {}) {
  const keyId = safeId(id);
  if (!keyId) return Promise.resolve("-");
  
  // Check store cache first
  const storeState = useCandidatesStore.getState();
  const cached = storeState.byId[keyId];
  if (cached) {
    const label = extractLabel(cached, "candidate");
    if (label) return Promise.resolve(label);
  }
  
  return cachedRequest(
    `candidate:${keyId}`,
    async () => {
      const c = await getCandidate(keyId);
      // Store will be updated when components use store.get() method
      return extractLabel(c, "candidate") || `Candidate #${keyId}`;
    },
    { ttlMs }
  ).catch(() => `Candidate #${keyId}`);
}
