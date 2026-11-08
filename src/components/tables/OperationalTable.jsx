import { Link } from "react-router-dom";
import { Badge } from "../ui";
import { money, date } from "../../lib/format";
export default function OperationalTable({
  rows,
  columns,
  organization,
  selected = new Set(),
  onSelect,
  onSelectAll,
  sort,
  onSort,
  rowLink,
  actions,
}) {
  const cell = (row, key, type) => {
    if (type === "money")
      return (
        <span className="numeric">
          {money(row[key], organization, row.currency)}
        </span>
      );
    if (type === "badge") return <Badge value={row[key]} />;
    if (type === "date") return date(row[key]);
    if (type === "datetime")
      return row[key]
        ? new Date(row[key]).toLocaleString(organization?.locale || "en-IN")
        : "—";
    if (type === "hours") return ((row[key] || 0) / 60).toFixed(2);
    if (type === "boolean") return row[key] ? "Yes" : "—";
    if (["product", "supplier", "customer"].includes(type))
      return row[type] ? (
        <Link
          className="record-link"
          to={`/records/${type === "product" ? "products" : type === "supplier" ? "suppliers" : "customers"}/${row[type]}`}
        >
          {row[key] || "View record"}
        </Link>
      ) : (
        row[key] || "All clients"
      );
    if (type === "source")
      return row[key] ? (
        <Link
          className="record-link"
          to={
            row.reason?.startsWith("Our harvest")
              ? `/work/harvest/${row[key]}`
              : row.reason?.startsWith("Write-off:")
                ? "/freshness"
                : `/documents/${row[key]}`
          }
        >
          View source →
        </Link>
      ) : (
        "—"
      );
    return String(row[key] ?? "—");
  };
  return (
    <div className="table-wrap">
      <table className="operational-table">
        <thead>
          <tr>
            {onSelect && (
              <th className="selection-cell">
                <input
                  type="checkbox"
                  aria-label="Select all rows on this page"
                  checked={
                    rows.length > 0 && rows.every((r) => selected.has(r._id))
                  }
                  onChange={(e) => onSelectAll(e.target.checked)}
                />
              </th>
            )}
            {columns.map(([key, title]) => (
              <th
                key={key}
                aria-sort={
                  sort?.key === key
                    ? sort.direction === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                {onSort ? (
                  <button className="sort-button" onClick={() => onSort(key)}>
                    {title}
                    <span>
                      {sort?.key === key
                        ? sort.direction === "asc"
                          ? "↑"
                          : "↓"
                        : "↕"}
                    </span>
                  </button>
                ) : (
                  title
                )}
              </th>
            ))}
            {actions && <th className="action-cell">ACTIONS</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row._id}>
              {onSelect && (
                <td className="selection-cell">
                  <input
                    type="checkbox"
                    aria-label={`Select ${row.name || row.number || row._id}`}
                    checked={selected.has(row._id)}
                    onChange={(e) => onSelect(row._id, e.target.checked)}
                  />
                </td>
              )}
              {columns.map(([key, , type], i) => (
                <td key={key}>
                  {i === 0 && rowLink ? (
                    <Link className="record-link row-title" to={rowLink(row)}>
                      {cell(row, key, type)}
                    </Link>
                  ) : (
                    cell(row, key, type)
                  )}
                </td>
              ))}
              {actions && <td className="action-cell">{actions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
