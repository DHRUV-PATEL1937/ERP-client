import { useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { money, date } from "../../lib/format";
import { useAuth, useToast } from "../../app/providers";
import PermissionGate from "../../app/PermissionGate";
import {
  PageHeader,
  Button,
  Badge,
  Loading,
  ErrorState,
  Dialog,
  Field,
  Empty,
} from "../../components/ui";
import OperationForm from "./OperationForm";
import { operationConfigs } from "./config";
export default function OperationDetailPage() {
  const { resource, id } = useParams(),
    config = operationConfigs[resource],
    { session } = useAuth(),
    client = useQueryClient(),
    toast = useToast(),
    navigate = useNavigate();
  const [action, setAction] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [edit, setEdit] = useState(false),
    [plans, setPlans] = useState({}),
    [quantity, setQuantity] = useState(""),
    [notes, setNotes] = useState(""),
    [bestBefore, setBestBefore] = useState("");
  const key = useRef("");
  const query = useQuery({
    queryKey: ["operation", resource, id],
    queryFn: () => api(`/${resource}/${id}`),
    enabled: Boolean(config),
  });
  const demand = useQuery({
    queryKey: ["window-demand", id],
    queryFn: () => api(`/buying-windows/${id}/demand`),
    enabled: resource === "buying-windows",
  });
  if (!config) return <ErrorState error={new Error("Unknown record type")} />;
  if (query.isPending) return <Loading />;
  if (query.error)
    return <ErrorState error={query.error} retry={query.refetch} />;
  const record = query.data.data;
  const open = (value) => {
    setAction(value);
    setError("");
    key.current = crypto.randomUUID();
    setBestBefore(record.bestBefore?.slice(0, 10) || "");
  };
  const purchasePlan = () =>
    demand.data.data.rows
      .map((row) => {
        const plan = plans[row.product] || {};
        const offer =
          row.offers.find((o) => o._id === plan.offer) ||
          [...row.offers].sort(
            (a, b) =>
              Number(b.preferred) - Number(a.preferred) || a.price - b.price,
          )[0];
        return {
          product: row.product,
          offer: offer?._id,
          quantity:
            plan.quantity == null
              ? offer && row.shortfall > 0
                ? Math.max(
                    offer.minimumQuantity,
                    Math.ceil(row.shortfall / offer.packQuantity) *
                      offer.packQuantity,
                  )
                : 0
              : Number(plan.quantity),
        };
      })
      .filter((r) => r.quantity > 0);
  const perform = async () => {
    setBusy(true);
    setError("");
    try {
      let result;
      if (action === "purchase")
        result = await api(`/buying-windows/${id}/purchase`, {
          method: "POST",
          body: { lines: purchasePlan() },
        });
      else if (action === "post")
        result = await api(`/harvest/${id}/post`, { method: "POST" });
      else if (action === "generate")
        result = await api(`/recurring-orders/${id}/generate`, {
          method: "POST",
          key: key.current,
        });
      else if (action === "write-off")
        result = await api(`/freshness/${id}/write-off`, {
          method: "POST",
          key: key.current,
          body: { quantity: Number(quantity), notes },
        });
      else if (action === "batch-dates")
        result = await api(`/freshness/${id}`, {
          method: "PATCH",
          body: bestBefore ? { bestBefore: `${bestBefore}T00:00:00.000Z` } : {},
        });
      else
        result = await api(`/${resource}/${id}/state`, {
          method: "POST",
          body: { status: action },
        });
      setAction("");
      await client.invalidateQueries();
      toast("Workflow updated");
      if (action === "generate") navigate(`/documents/${result.data._id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const statusActions =
    resource === "buying-windows"
      ? record.status === "open"
        ? ["closed", "cancelled"]
        : record.status === "ordered"
          ? ["closed"]
          : []
      : resource === "harvest"
        ? record.status === "draft"
          ? ["cancelled"]
          : []
        : resource === "recurring-orders"
          ? record.status === "active"
            ? ["paused", "cancelled"]
            : record.status === "paused"
              ? ["active", "cancelled"]
              : []
          : resource === "timesheets" && record.status === "submitted"
            ? ["approved", "rejected"]
            : [];
  return (
    <>
      <Link className="back-link" to={`/${resource}`}>
        ← {config.title}
      </Link>
      <PageHeader
        eyebrow={config.group.toUpperCase()}
        title={
          record.name ||
          record.productName ||
          record.employeeName ||
          config.singular
        }
        description={`${config.title} · Created ${date(record.createdAt)}`}
      >
        <Badge value={record.status || "active"} />
        <PermissionGate admin={config.admin}>
          {!config.readonly &&
            !["ordered", "closed", "posted", "approved", "cancelled"].includes(
              record.status,
            ) && (
              <Button variant="secondary" onClick={() => setEdit(true)}>
                Edit record
              </Button>
            )}
          {resource === "harvest" && record.status === "draft" && (
            <Button onClick={() => open("post")}>Post to inventory</Button>
          )}
          {resource === "recurring-orders" && record.status === "active" && (
            <Button onClick={() => open("generate")}>Generate due order</Button>
          )}
          {resource === "freshness" && (
            <>
              <Button variant="secondary" onClick={() => open("batch-dates")}>
                Edit batch dates
              </Button>
              {record.remaining > 0 && (
                <Button variant="danger" onClick={() => open("write-off")}>
                  Record stock loss
                </Button>
              )}
            </>
          )}
          {statusActions.map((a) => (
            <Button variant="secondary" key={a} onClick={() => open(a)}>
              {a === "active"
                ? "Resume schedule"
                : a === "paused"
                  ? "Pause schedule"
                  : a === "approved"
                    ? "Approve timesheet"
                    : a === "rejected"
                      ? "Reject timesheet"
                      : a === "closed"
                        ? "Close window"
                        : "Cancel record"}
            </Button>
          ))}
        </PermissionGate>
      </PageHeader>
      {resource === "timesheets" && (
        <div className="report-strip">
          <span>
            Paid hours<strong>{(record.minutes / 60).toFixed(2)}</strong>
          </span>
          <span>
            Hourly rate snapshot
            <strong>{money(record.hourlyRate, session.organization)}</strong>
          </span>
          <span>
            Calculated shift cost
            <strong>{money(record.amount, session.organization)}</strong>
          </span>
        </div>
      )}
      {resource === "articles" ? (
        <article className="panel article-body">
          <span className="eyebrow">{record.category}</span>
          <div style={{ whiteSpace: "pre-wrap" }}>{record.body}</div>
        </article>
      ) : (
        <section className="panel record-sheet">
          <dl>
            {(
              config.fields || [
                ["productName", "Product"],
                ["quantity", "Original quantity"],
                ["remaining", "Remaining"],
                ["receivedAt", "Received"],
                ["bestBefore", "Best before"],
                ["origin", "Origin"],
              ]
            )
              .filter(([k]) => !["body", "notes"].includes(k))
              .map(([k, label, type]) => (
                <div key={k}>
                  <dt>{label}</dt>
                  <dd>
                    {type === "reference" ? (
                      <Link
                        className="record-link"
                        to={
                          ["product", "customer", "supplier"].includes(k)
                            ? `/records/${k === "product" ? "products" : k === "customer" ? "customers" : "suppliers"}/${record[k]}`
                            : "/employees"
                        }
                      >
                        {record[`${k}Name`] || "All clients"}
                      </Link>
                    ) : type === "money" ? (
                      money(record[k], session.organization)
                    ) : type === "date" ||
                      type === "datetime-local" ||
                      ["receivedAt", "bestBefore"].includes(k) ? (
                      date(record[k])
                    ) : (
                      String(record[k] ?? "—")
                    )}
                  </dd>
                </div>
              ))}
          </dl>
          {record.notes && (
            <div className="document-notes">
              <h3>Notes</h3>
              <p>{record.notes}</p>
            </div>
          )}
          {record.lines && (
            <div className="document-notes">
              <h3>Recurring product lines</h3>
              {record.lines.map((l) => (
                <p key={l.product}>
                  <Link
                    className="record-link"
                    to={`/records/products/${l.product}`}
                  >
                    {l.productName || "Open product"}
                  </Link>{" "}
                  · {l.quantity} {l.unit || "base units"}
                </p>
              ))}
              <p className="muted">
                Manual generation creates one due occurrence. Automatic
                generation runs only when enabled on the backend.
              </p>
            </div>
          )}
        </section>
      )}
      {resource === "buying-windows" && (
        <section className="panel window-demand">
          <div className="panel-head">
            <div>
              <h2>Consolidated delivery demand</h2>
              <p>
                Confirmed orders in this window. Purchase quantities round to
                supplier pack sizes.
              </p>
            </div>
            <PermissionGate>
              {record.status === "open" &&
                demand.data?.data.rows.length > 0 && (
                  <Button onClick={() => open("purchase")}>
                    Raise purchase orders
                  </Button>
                )}
            </PermissionGate>
          </div>
          {demand.isPending ? (
            <Loading />
          ) : demand.error ? (
            <ErrorState error={demand.error} />
          ) : !demand.data.data.rows.length ? (
            <Empty
              title="No confirmed orders in this delivery period"
              text="Set order delivery dates within the window to plan purchases."
            />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>PRODUCT / SOURCE ORDERS</th>
                    <th>DEMAND</th>
                    <th>ON HAND</th>
                    <th>TO BUY</th>
                    <th>SUPPLIER OFFER</th>
                  </tr>
                </thead>
                <tbody>
                  {demand.data.data.rows.map((row) => {
                    const selectedPlan = purchasePlan().find(
                      (p) => String(p.product) === String(row.product),
                    );
                    return (
                      <tr key={row.product}>
                        <td>
                          <Link
                            className="record-link"
                            to={`/records/products/${row.product}`}
                          >
                            {row.name}
                          </Link>
                          {row.orders.map((o) => (
                            <Link
                              key={o.id}
                              className="source-link"
                              to={`/documents/${o.id}`}
                            >
                              {o.number}
                            </Link>
                          ))}
                        </td>
                        <td>
                          {row.demand} {row.unit}
                        </td>
                        <td>
                          {row.stock} {row.unit}
                        </td>
                        <td>
                          <input
                            className="quantity-input"
                            aria-label={`Buy quantity for ${row.name}`}
                            type="number"
                            min="0"
                            step="0.001"
                            disabled={record.status !== "open"}
                            value={
                              plans[row.product]?.quantity ??
                              selectedPlan?.quantity ??
                              0
                            }
                            onChange={(e) =>
                              setPlans((p) => ({
                                ...p,
                                [row.product]: {
                                  ...p[row.product],
                                  quantity: e.target.value,
                                },
                              }))
                            }
                          />
                        </td>
                        <td>
                          <select
                            aria-label={`Supplier for ${row.name}`}
                            disabled={record.status !== "open"}
                            value={
                              plans[row.product]?.offer ||
                              selectedPlan?.offer ||
                              ""
                            }
                            onChange={(e) =>
                              setPlans((p) => ({
                                ...p,
                                [row.product]: {
                                  ...p[row.product],
                                  offer: e.target.value,
                                  quantity: undefined,
                                },
                              }))
                            }
                          >
                            <option value="">Choose supplier offer</option>
                            {row.offers.map((o) => (
                              <option key={o._id} value={o._id}>
                                {o.supplierName} ·{" "}
                                {money(o.price, session.organization)}/
                                {row.unit} · pack {o.packQuantity}
                              </option>
                            ))}
                          </select>
                          {!row.offers.length && (
                            <Link
                              className="source-link"
                              to={`/supplier-offers?create=1&product=${row.product}`}
                            >
                              Add a supplier offer →
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {demand.data?.data.purchases.length > 0 && (
            <div className="document-notes">
              <h3>Linked purchase orders</h3>
              {demand.data.data.purchases.map((p) => (
                <Link
                  className="related-pill"
                  key={p._id}
                  to={`/documents/${p._id}`}
                >
                  {p.number} · {p.contactName} <Badge value={p.status} />
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
      {edit && (
        <Dialog
          title={`Edit ${config.singular}`}
          onClose={() => setEdit(false)}
        >
          <OperationForm
            config={config}
            initial={record}
            onClose={() => setEdit(false)}
            onSave={async (body) => {
              await api(`/${resource}/${id}`, { method: "PATCH", body });
              setEdit(false);
              client.invalidateQueries();
              toast("Record saved");
            }}
          />
        </Dialog>
      )}
      {action && (
        <Dialog
          title={
            action === "purchase"
              ? "Review procurement"
              : action === "post"
                ? "Post harvest to inventory"
                : action === "generate"
                  ? "Generate due occurrence"
                  : action === "write-off"
                    ? "Record batch stock loss"
                    : action === "batch-dates"
                      ? "Edit best-before date"
                      : `Confirm: ${action}`
          }
          onClose={() => !busy && setAction("")}
        >
          {action === "write-off" ? (
            <>
              <Field label="Quantity to remove">
                <input
                  type="number"
                  min="0.001"
                  max={record.remaining}
                  step="0.001"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </Field>
              <Field label="Reason">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>
              <p>
                This records an inventory loss and deducts on-hand stock. It
                cannot be silently undone.
              </p>
            </>
          ) : action === "batch-dates" ? (
            <Field label="Best-before date">
              <input
                type="date"
                value={bestBefore}
                onChange={(e) => setBestBefore(e.target.value)}
              />
            </Field>
          ) : (
            <p>
              {action === "purchase"
                ? `Create ${new Set(purchasePlan().map((p) => p.offer)).size} supplier selections as grouped purchase orders. Orders begin as drafts for review; raising this window twice returns the existing purchases.`
                : action === "post"
                  ? "This creates a stock batch and movement. Retrying will not add the harvest twice."
                  : action === "generate"
                    ? "Generate one due order with prices effective for its delivery date, then advance the schedule. Future occurrences cannot be generated early."
                    : "Apply this status change? Historical records will remain available."}
            </p>
          )}
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setAction("")}
            >
              Go back
            </Button>
            <Button disabled={busy} onClick={perform}>
              {busy ? "Processing…" : "Confirm action"}
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
