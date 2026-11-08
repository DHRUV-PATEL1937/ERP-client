import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
export default function LookupSelect({
  resource,
  value,
  onChange,
  label,
  id,
  initialLabel,
  required = false,
  disabled = false,
}) {
  const [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(initialLabel || "");
  const [open, setOpen] = useState(false);
  const { data, error, isFetching } = useQuery({
    queryKey: ["lookup-search", resource, search, page],
    queryFn: ({ signal }) =>
      api(
        `/lookups?resource=${resource}&q=${encodeURIComponent(search)}&page=${page}`,
        { signal },
      ),
    enabled: open,
  });
  const { data: current } = useQuery({
    queryKey: ["lookup-value", resource, value],
    queryFn: () => api(`/lookups?resource=${resource}&id=${value}`),
    enabled: Boolean(value) && !selected,
  });
  useEffect(() => {
    if (current?.data[0]) setSelected(current.data[0].label);
  }, [current]);
  return (
    <div className="lookup">
      <button
        id={id}
        type="button"
        className="lookup-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
      >
        {value ? selected || "Loading record…" : `Select ${label || resource}`}
        <span>⌄</span>
      </button>
      {open && (
        <div className="lookup-menu">
          <input
            aria-label={`Search ${label || resource}`}
            placeholder="Type a name or SKU…"
            value={search}
            autoFocus
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <div role="listbox" aria-label={label || resource}>
            {data?.data.map((row) => (
              <button
                key={row.id}
                role="option"
                aria-selected={value === row.id}
                type="button"
                onClick={() => {
                  setSelected(row.label);
                  onChange(row.id, row);
                  setOpen(false);
                }}
              >
                {row.label}
                {row.unit && <small>{row.unit}</small>}
              </button>
            ))}
          </div>
          {error && <p role="alert">{error.message}</p>}
          {isFetching ? (
            <p>Searching…</p>
          ) : data?.data.length === 0 ? (
            <p>No matching records</p>
          ) : null}
          <div className="lookup-footer">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} / {data?.meta.pages || 1}
            </span>
            <button
              type="button"
              disabled={!data || page >= data.meta.pages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
          {!required && (
            <button
              className="lookup-clear"
              type="button"
              onClick={() => {
                onChange("");
                setSelected("");
                setOpen(false);
              }}
            >
              Clear selection
            </button>
          )}
          <button
            className="lookup-clear"
            type="button"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
