import dayjs from "dayjs";

export function formatDate(value, format = "DD MMM YYYY") {
  if (!value) return "";
  return dayjs(value).format(format);
}

export function formatDateTime(value, format = "DD MMM YYYY HH:mm") {
  if (!value) return "";
  return dayjs(value).format(format);
}

export function fromNow(value) {
  if (!value) return "";
  return dayjs(value).fromNow();
}
