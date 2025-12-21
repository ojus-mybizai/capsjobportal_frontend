import { cachedRequest } from "./requestCache";
import { getCompany } from "../services/companies";
import { getJob } from "../services/jobs";
import { getCandidate } from "../services/candidates";

function safeId(value) {
  if (value == null) return "";
  const s = String(value).trim();
  return s;
}

export function getCompanyLabel(id, { ttlMs = 5 * 60 * 1000 } = {}) {
  const keyId = safeId(id);
  if (!keyId) return Promise.resolve("-");
  return cachedRequest(
    `company:${keyId}`,
    async () => {
      const c = await getCompany(keyId);
      return c?.name || c?.title || c?.company_name || `Company #${keyId}`;
    },
    { ttlMs }
  ).catch(() => `Company #${keyId}`);
}

export function getJobLabel(id, { ttlMs = 5 * 60 * 1000 } = {}) {
  const keyId = safeId(id);
  if (!keyId) return Promise.resolve("-");
  return cachedRequest(
    `job:${keyId}`,
    async () => {
      const j = await getJob(keyId);
      return j?.title || j?.name || `Job #${keyId}`;
    },
    { ttlMs }
  ).catch(() => `Job #${keyId}`);
}

export function getCandidateLabel(id, { ttlMs = 5 * 60 * 1000 } = {}) {
  const keyId = safeId(id);
  if (!keyId) return Promise.resolve("-");
  return cachedRequest(
    `candidate:${keyId}`,
    async () => {
      const c = await getCandidate(keyId);
      return c?.full_name || c?.name || c?.candidate_name || `Candidate #${keyId}`;
    },
    { ttlMs }
  ).catch(() => `Candidate #${keyId}`);
}
