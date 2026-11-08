import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Download, Pencil, Archive } from "lucide-react";
import { api } from "../../lib/api";
import { downloadCSV } from "../../lib/export";
import { useAuth, useToast } from "../../app/providers";
import PermissionGate from "../../app/PermissionGate";
import {
  PageHeader,
  Button,
  Dialog,
  Loading,
  ErrorState,
  Empty,
} from "../../components/ui";
import OperationalTable from "../../components/tables/OperationalTable";
import OperationForm from "./OperationForm";
import { operationConfigs } from "./config";
export default function OperationsPage({ resource }) {
  const config = operationConfigs[resource],
    { session } = useAuth(),
    toast = useToast(),
    client = useQueryClient(),
    navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(""),
    [page, setPage] = useState(1),
    [sort, setSort] = useState({ key: "createdAt", direction: "desc" }),
    [selected, setSelected] = useState(new Set()),
    [edit, setEdit] = useState(null),
    [show, setShow] = useState(params.has("create")),
    [archive, setArchive] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (params.has("create")) setShow(true);
  }, [params]);
  const status = params.get("status") || "";
  const filters = new URLSearchParams({
    page,
    q,
    sort: sort.key,
    direction: sort.direction,
    status,
  });
  for (const key of ["product", "supplier", "customer", "employee"])
    if (params.get(key)) filters.set(key, params.get(key));
  const query = useQuery({
    queryKey: ["operations", resource, filters.toString()],
    queryFn: ({ signal }) => api(`/${resource}?${filters}`, { signal }),
    enabled: !config.admin || session.user.role === "admin",
  });
  if (config.admin && session.user.role !== "admin")
    return (
      <ErrorState
        error={
          new Error(
            "Administrator access is required for people and pay information.",
          )
        }
      />
    );
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
    const result = await api(`/${resource}${edit ? `/${edit._id}` : ""}`, {
      method: edit ? "PATCH" : "POST",
      body,
    });
    close();
    client.invalidateQueries();
    toast("Record saved");
    if (["buying-windows", "harvest", "recurring-orders"].includes(resource))
      navigate(`/work/${resource}/${result.data._id}`);
  };
  const columns = config.columns;
  const canEdit = (r) =>
    !config.readonly &&
    !["ordered", "closed", "posted", "cancelled", "approved"].includes(
      r.status,
    );
  const defaultValues = Object.fromEntries(
    ["product", "supplier", "customer", "employee"]
      .filter((k) => params.has(k))
      .map((k) => [k, params.get(k)]),
  );
  return (
    <>
      <PageHeader
        eyebrow={config.group.toUpperCase()}
        title={config.title}
        description={config.description}
      >
        <Button
          variant="secondary"
          disabled={!query.data?.data.length}
          onClick={() =>
            downloadCSV(
              `${resource}.csv`,
              columns,
              selected.size
                ? query.data.data.filter((r) => selected.has(r._id))
                : query.data.data,
            )
          }
        >
          <Download size={15} />
          {selected.size ? "Export selected" : "Export page"}
        </Button>
        {!config.readonly && (
          <PermissionGate admin={config.admin}>
            <Button onClick={() => setShow(true)}>
              <Plus size={16} /> New {config.singular}
            </Button>
          </PermissionGate>
        )}
      </PageHeader>
      <section className="panel list-panel">
        <div className="table-toolbar">
          <div className="table-tabs">
            <strong>{config.title}</strong>
            <span className="count">{query.data?.meta.total || 0}</span>
            {selected.size > 0 && (
              <span className="selection-count">{selected.size} selected</span>
            )}
          </div>
          <div className="table-controls">
            <div className="search-box">
              <Search size={16} />
              <input
                aria-label="Search records"
                placeholder="Search records…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                  setSelected(new Set());
                }}
              />
            </div>
            {config.statuses && (
              <select
                aria-label="Filter status"
                value={status}
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
                {config.statuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        {query.isPending ? (
          <Loading />
        ) : query.error ? (
          <ErrorState error={query.error} retry={query.refetch} />
        ) : !query.data.data.length ? (
          <Empty
            title={`No ${config.title.toLowerCase()} found`}
            text="Create a record or adjust your search and filters."
          />
        ) : (
          <OperationalTable
            rows={query.data.data}
            columns={columns}
            organization={session.organization}
            sort={sort}
            onSort={
              config.readonly
                ? undefined
                : (key) => {
                    setSort({
                      key,
                      direction:
                        sort.key === key && sort.direction === "asc"
                          ? "desc"
                          : "asc",
                    });
                    setPage(1);
                  }
            }
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
            rowLink={
              resource === "photo-review"
                ? (r) => `/records/products/${r._id}`
                : [
                      "buying-windows",
                      "harvest",
                      "recurring-orders",
                      "timesheets",
                      "articles",
                    ].includes(resource)
                  ? (r) => `/work/${resource}/${r._id}`
                  : undefined
            }
            actions={(r) => (
              <PermissionGate admin={config.admin}>
                <div className="row-actions">
                  {canEdit(r) && (
                    <button
                      className="icon-button"
                      aria-label="Edit record"
                      onClick={() => {
                        setEdit(r);
                        setShow(true);
                      }}
                    >
                      <Pencil size={15} />
                    </button>
                  )}
                  {resource === "freshness" && r.remaining > 0 && (
                    <Link
                      className="text-action"
                      to={`/work/freshness/${r._id}`}
                    >
                      Manage batch
                    </Link>
                  )}
                  {!config.readonly &&
                    ![
                      "harvest",
                      "timesheets",
                      "buying-windows",
                      "recurring-orders",
                    ].includes(resource) && (
                      <button
                        className="icon-button"
                        aria-label="Archive record"
                        onClick={() => {
                          setArchive(r);
                          setError("");
                        }}
                      >
                        <Archive size={15} />
                      </button>
                    )}
                </div>
              </PermissionGate>
            )}
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
          <OperationForm
            config={config}
            initial={edit || defaultValues}
            onSave={save}
            onClose={close}
          />
        </Dialog>
      )}
      {archive && (
        <Dialog title="Archive this record?" onClose={() => setArchive(null)}>
          <p>This removes it from active lists while retaining its history.</p>
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <Button variant="secondary" onClick={() => setArchive(null)}>
              Keep record
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api(`/${resource}/${archive._id}`, {
                    method: "DELETE",
                  });
                  setArchive(null);
                  client.invalidateQueries();
                  toast("Record archived");
                } catch (e) {
                  setError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Archive record
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
