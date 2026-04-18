import { api } from "./api";
import { stripEmpty, ensurePagedResult, ensureObjectData } from "./formatters";

export function listPlacementIncomes(params = {}) {
  return api
    .get("placement-incomes", { params })
    .then((payload) => ensurePagedResult(payload, "Failed to load placement incomes"));
}

export function getPlacementIncome(id) {
  return api
    .get(`placement-incomes/${id}`)
    .then((payload) => ensureObjectData(payload, "Failed to load placement income"));
}

export function createPlacementIncome(payload) {
  const body = stripEmpty(payload);
  return api
    .post("placement-incomes", body)
    .then((result) => ensureObjectData(result, "Failed to create placement income"));
}

export function updatePlacementIncome(id, payload) {
  const body = stripEmpty(payload);
  return api
    .put(`placement-incomes/${id}`, body)
    .then((result) => ensureObjectData(result, "Failed to update placement income"));
}

export function deletePlacementIncome(id) {
  return api.delete(`placement-incomes/${id}`);
}

export function createPlacementIncomePayment(incomeId, payload) {
  const body = stripEmpty(payload);
  return api
    .post(`placement-incomes/${incomeId}/payments`, body)
    .then((result) => ensureObjectData(result, "Failed to create placement income payment"));
}

export function updatePlacementIncomePayment(paymentId, payload) {
  const body = stripEmpty(payload);
  return api
    .put(`placement-incomes/payments/${paymentId}`, body)
    .then((result) => ensureObjectData(result, "Failed to update placement income payment"));
}

export function deletePlacementIncomePayment(paymentId) {
  return api.delete(`placement-incomes/payments/${paymentId}`);
}
