import { api } from "./api";
import { stripEmpty, ensurePagedResult, ensureObjectData } from "./formatters";
import { USE_MOCK_DATA } from "./mockData";

export function listPlacementIncomes(params = {}) {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ items: [], total: 0 });
  }

  return api
    .get("placement-incomes", { params })
    .then((payload) => ensurePagedResult(payload, "Failed to load placement incomes"));
}

export function getPlacementIncome(id) {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ id });
  }

  return api
    .get(`placement-incomes/${id}`)
    .then((payload) => ensureObjectData(payload, "Failed to load placement income"));
}

export function createPlacementIncome(payload) {
  const body = stripEmpty(payload);

  if (USE_MOCK_DATA) {
    return Promise.resolve({ id: Date.now().toString(), ...body });
  }

  return api
    .post("placement-incomes", body)
    .then((result) => ensureObjectData(result, "Failed to create placement income"));
}

export function updatePlacementIncome(id, payload) {
  const body = stripEmpty(payload);

  if (USE_MOCK_DATA) {
    return Promise.resolve({ id, ...body });
  }

  return api
    .put(`placement-incomes/${id}`, body)
    .then((result) => ensureObjectData(result, "Failed to update placement income"));
}

export function deletePlacementIncome(id) {
  if (USE_MOCK_DATA) {
    return Promise.resolve({ id });
  }

  return api.delete(`placement-incomes/${id}`);
}

export function createPlacementIncomePayment(incomeId, payload) {
  const body = stripEmpty(payload);

  if (USE_MOCK_DATA) {
    return Promise.resolve({ id: Date.now().toString(), placement_income_id: incomeId, ...body });
  }

  return api
    .post(`placement-incomes/${incomeId}/payments`, body)
    .then((result) => ensureObjectData(result, "Failed to create placement income payment"));
}
