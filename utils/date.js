import dayjs from "dayjs";

/** Display format: day, short month name, year (e.g. 15 Jan 2025). No time. */
const DISPLAY_DATE_FORMAT = "DD MMM YYYY";

/** API/input format for date-only fields. */
const API_DATE_FORMAT = "YYYY-MM-DD";

export function formatDate(value, format = DISPLAY_DATE_FORMAT) {
  if (!value) return "";
  return dayjs(value).format(format);
}

/** Format for display only - date with month name, no time. Use everywhere for user-facing dates. */
export function formatDateOnly(value) {
  return formatDate(value, DISPLAY_DATE_FORMAT);
}

/** Value for type="date" inputs (YYYY-MM-DD). Use when setting date input value. */
export function toDateInputValue(value) {
  if (!value) return "";
  return dayjs(value).format(API_DATE_FORMAT);
}

/** @deprecated Use formatDate or formatDateOnly for date-only display. Time not shown in app. */
export function formatDateTime(value, format = DISPLAY_DATE_FORMAT) {
  if (!value) return "";
  return dayjs(value).format(format);
}

export function fromNow(value) {
  if (!value) return "";
  return dayjs(value).fromNow();
}
