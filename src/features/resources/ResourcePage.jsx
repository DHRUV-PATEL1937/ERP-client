import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { Plus, Search, Download, Pencil, Archive } from "lucide-react";
import { api } from "../../lib/api";
import { downloadCSV } from "../../lib/export";
import { useAuth, useToast } from "../../app/providers";
import PermissionGate from "../../app/PermissionGate";
import { configs } from "./config";
import {
  PageHeader,
  Button,
  Loading,
  ErrorState,
  Empty,
  Dialog,
} from "../../components/ui";
import OperationalTable from "../../components/tables/OperationalTable";
import ResourceForm from "../../components/forms/ResourceForm";
export default function ResourcePage({ resource }) {
  const config = configs[resource],
    [params, setParams] = useSearchParams(),
    navigate = useNavigate(),
    client = useQueryClient(),
    toast = useToast(),
    { session } = useAuth();
  const [q, setQ] = useState(""),
    [page, setPage] = useState(1),
    [sort, setSort] = useState({ key: "createdAt", direction: "desc" }),
    [selected, setSelected] = useState(new Set()),
    [visible, setVisible] = useState(config.columns.map((c) => c[0])),
    [edit, setEdit] = useState(null),
    [show, setShow] = useState(params.has("create") && !config.document),
    [archive, setArchive] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (params.has("create")) {
      if (config.document) navigate(`/new/${resource}`);
      else setShow(true);
    }
  }, [params, config.document, resource, navigate]);
  const filters = new URLSearchParams({
    page,
    q,
    sort: sort.key,
    direction: sort.direction,
  });
  for (const key of ["status", "contact", "category", "lowStock"])
    if (params.has(key)) filters.set(key, params.get(key));
  const query = useQuery({
    queryKey: [resource, filters.toString()],
    queryFn: ({ signal }) => api(`/${resource}?${filters}`, { signal }),
  });
  const close = () => {
    setShow(false);
    setEdit(null);
    if (params.has("create")) {
      const next = new URLSearchParams(params);
      next.delete("create");
      setParams(next);
    }
  };
  const save = async (body) => {
    await api(`/${resource}${edit ? `/${edit._id}` : ""}`, {
      method: edit ? "PATCH" : "POST",
      body,
    });
    close();
    await client.invalidateQueries();
    toast("Record saved successfully");
  };
  const archiveRecords = async () => {
    setBusy(true);
    setError("");
    try {
      if (Array.isArray(archive))
        await api("/bulk/archive", {
          method: "POST",
          body: { resource, ids: archive },
        });
      else await api(`/${resource}/${archive._id}`, { method: "DELETE" });
      setArchive(null);
      setSelected(new Set());
      await client.invalidateQueries();
      toast("Records archived");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const columns = config.columns.filter((c) => visible.includes(c[0]));
  const rowLink = config.document
    ? (r) => `/documents/${r._id}`
    : ["products", "inventory", "customers", "suppliers"].includes(resource)
      ? (r) =>
          `/records/${resource === "inventory" ? "products" : resource}/${r._id}`
      : undefined;
  const statusOptions =
    resource === "purchase-orders"
      ? ["draft", "confirmed", "partial", "received", "cancelled"]
      : ["invoices", "vendor-invoices"].includes(resource)
        ? ["draft", "issued", "confirmed", "partial", "paid"]
        : ["draft", "confirmed", "fulfilled", "cancelled"];
  return (
    <>
      <PageHeader
        eyebrow={config.document ? "OPERATIONS & FINANCE" : "YOUR WORKSPACE"}
        title={config.title}
        description={config.description}
      >
        <Button
          variant="secondary"
          onClick={() =>
            downloadCSV(
              `${resource}.csv`,
              columns,
              selected.size
                ? query.data.data.filter((r) => selected.has(r._id))
                : query.data.data,
            )
          }
          disabled={!query.data?.data.length}
        >
          <Download size={16} />
          {selected.size ? "Export selected" : "Export page"}
        </Button>
        {!config.readonly && (
          <PermissionGate>
            <Button
              onClick={() =>
                config.document
                  ? navigate(
                      `/new/${resource}${params.has("contact") ? "?contact=" + params.get("contact") : ""}`,
                    )
                  : setShow(true)
              }
            >
              <Plus size={17} /> New {config.singular}
            </Button>
          </PermissionGate>
        )}
      </PageHeader>
      {resource === "inventory" && (
        <div className="info-banner">
          Stock changes through receiving, harvest, fulfillment, and explicit
          batch write-offs.<Link to="/stock-movements">Movement history →</Link>
        </div>
      )}
      <section className="panel list-panel">
        <div className="table-toolbar">
          <div className="table-tabs">
            <strong>All {config.title.toLowerCase()}</strong>
            <span className="count">{query.data?.meta.total || 0}</span>
            {selected.size > 0 && (
              <span className="selection-count">{selected.size} selected</span>
            )}
            {selected.size > 0 && !config.document && !config.readonly && (
              <PermissionGate>
                <Button
                  variant="danger small"
                  onClick={() => {
                    setArchive([...selected]);
                    setError("");
                  }}
                >
                  Archive selected
                </Button>
              </PermissionGate>
            )}
          </div>
          <div className="table-controls">
            <div className="search-box">
              <Search size={16} />
              <input
                aria-label="Search records"
                placeholder="Search records..."
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                  setSelected(new Set());
                }}
              />
            </div>
            {config.document && (
              <select
                aria-label="Filter status"
                value={params.get("status") || ""}
                onChange={(e) => {
                  const next = new URLSearchParams(params);
                  e.target.value
                    ? next.set("status", e.target.value)
                    : next.delete("status");
                  setParams(next);
                  setPage(1);
                  setSelected(new Set());
                }}
              >
                <option value="">All statuses</option>
                {statusOptions.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            )}
            <details className="column-picker">
              <summary>Columns</summary>
              <div>
                {config.columns.map(([key, label]) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={visible.includes(key)}
                      disabled={visible.length === 1 && visible.includes(key)}
                      onChange={(e) =>
                        setVisible((v) =>
                          e.target.checked
                            ? [...v, key]
                            : v.filter((k) => k !== key),
                        )
                      }
                    />
                    {label}
                  </label>
                ))}
              </div>
            </details>
          </div>
        </div>
        {query.isPending ? (
          <Loading />
        ) : query.error ? (
          <ErrorState error={query.error} retry={query.refetch} />
        ) : !query.data.data.length ? (
          <Empty
            title={`No ${config.title.toLowerCase()} found`}
            text="Create a record or adjust the current search and filters."
          />
        ) : (
          <OperationalTable
            rows={query.data.data}
            columns={columns}
            organization={session.organization}
            sort={sort}
            onSort={(key) => {
              setSort({
                key,
                direction:
                  sort.key === key && sort.direction === "asc" ? "desc" : "asc",
              });
              setPage(1);
              setSelected(new Set());
            }}
            selected={selected}
            onSelect={(id, checked) =>
              setSelected((s) => {
                const next = new Set(s);
                checked ? next.add(id) : next.delete(id);
                return next;
              })
            }
            onSelectAll={(checked) =>
              setSelected(
                checked
                  ? new Set(query.data.data.map((r) => r._id))
                  : new Set(),
              )
            }
            rowLink={rowLink}
            actions={
              !config.document && !config.readonly
                ? (r) => (
                    <PermissionGate>
                      <div className="row-actions">
                        <button
                          className="icon-button"
                          aria-label={`Edit ${r.name}`}
                          onClick={() => {
                            setEdit({ ...r, date: r.date?.slice(0, 10) });
                            setShow(true);
                          }}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Archive ${r.name}`}
                          onClick={() => {
                            setArchive(r);
                            setError("");
                          }}
                        >
                          <Archive size={15} />
                        </button>
                      </div>
                    </PermissionGate>
                  )
                : undefined
            }
          />
        )}
      </section>
      {query.data && (
        <div className="pagination">
          <span>
            {query.data.meta.total} records · Page {page} of{" "}
            {query.data.meta.pages || 1}
          </span>
          <div>
            <Button
              variant="secondary small"
              disabled={page === 1}
              onClick={() => {
                setPage((p) => p - 1);
                setSelected(new Set());
              }}
            >
              Previous
            </Button>
            <Button
              variant="secondary small"
              disabled={page >= query.data.meta.pages}
              onClick={() => {
                setPage((p) => p + 1);
                setSelected(new Set());
              }}
            >
              Next
            </Button>
          </div>
        </div>
      )}
      {show && (
        <Dialog
          title={`${edit ? "Edit" : "New"} ${config.singular}`}
          onClose={close}
        >
          <ResourceForm
            config={config}
            initial={edit}
            onSave={save}
            onClose={close}
          />
        </Dialog>
      )}
      {archive && (
        <Dialog
          title="Archive selected records?"
          onClose={() => !busy && setArchive(null)}
        >
          <p>
            Archived records stay in historical transactions and no longer
            appear in active lists.
          </p>
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <Button
              disabled={busy}
              variant="secondary"
              onClick={() => setArchive(null)}
            >
              Keep records
            </Button>
            <Button disabled={busy} onClick={archiveRecords}>
              {busy ? "Archiving..." : "Archive records"}
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
