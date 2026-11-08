export function downloadCSV(filename, columns, rows) {
  const cell = (value) =>
    '"' +
    String(value ?? "")
      .replaceAll('"', '""')
      .replace(/^[\s]*[=+@-]/, "'$&") +
    '"';
  const content = [
    columns
      .map((c) => cell(c[1] + (c[2] === "money" ? " (currency units)" : "")))
      .join(","),
    ...rows.map((row) =>
      columns
        .map(([key, , type]) =>
          cell(
            type === "money"
              ? ((row[key] || 0) / 100).toFixed(2)
              : type === "hours"
                ? ((row[key] || 0) / 60).toFixed(2)
                : row[key],
          ),
        )
        .join(","),
    ),
  ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
