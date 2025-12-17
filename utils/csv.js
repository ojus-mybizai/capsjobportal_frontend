function escapeCsvValue(value) {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes("\n") || str.includes("\"")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(rows) {
  if (!rows || rows.length === 0) return "";

  const headers = Object.keys(rows[0]);
  const headerLine = headers.map(escapeCsvValue).join(",");

  const lines = rows.map((row) =>
    headers.map((key) => escapeCsvValue(row[key])).join(",")
  );

  return [headerLine, ...lines].join("\n");
}

export function downloadCsv(filename, rows) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename || "export.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
