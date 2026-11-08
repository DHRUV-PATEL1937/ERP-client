import { useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { money, date } from "../../lib/format";
import { useAuth, useToast } from "../../app/providers";
import PermissionGate from "../../app/PermissionGate";
import {
  PageHeader,
  Button,
  Loading,
  ErrorState,
  Badge,
  Dialog,
  Field,
} from "../../components/ui";
export default function DocumentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const { session } = useAuth();
  const toast = useToast();
  const [action, setAction] = useState(null);
  const [amount, setAmount] = useState("");
  const [receipts, setReceipts] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const requestKey = useRef("");
  const {
    data,
    isPending,
    error: loadError,
    refetch,
  } = useQuery({
    queryKey: ["document", id],
    queryFn: () => api(`/documents/${id}`),
  });
  if (isPending) return <Loading />;
  if (loadError) return <ErrorState error={loadError} retry={refetch} />;
  const d = data.data;
  const org = session.organization;
  const currency = d.currency || org.currency;
  const isInvoice = ["invoice", "vendor-invoice"].includes(d.kind);
  const open = (type) => {
    setError("");
    setAction(type);
    requestKey.current = crypto.randomUUID();
    setAmount("");
    setReceipts({});
  };
  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      let result;
      if (["confirmed", "cancelled", "fulfilled"].includes(action))
        result = await api(`/documents/${id}/transition`, {
          method: "POST",
          body: { action },
        });
      else if (action === "receive")
        result = await api(`/documents/${id}/receive`, {
          method: "POST",
          key: requestKey.current,
          body: {
            lines: d.lines
              .map((l) => ({
                product: l.product,
                quantity: Number(receipts[l.product] || 0),
              }))
              .filter((l) => l.quantity > 0),
          },
        });
      else if (action === "pay")
        result = await api(`/documents/${id}/pay`, {
          method: "POST",
          key: requestKey.current,
          body: { amount: Math.round(Number(amount) * 100) },
        });
      else result = await api(`/documents/${id}/invoice`, { method: "POST" });
      setAction(null);
      await client.invalidateQueries();
      toast("Workflow updated successfully");
      if (action === "invoice") navigate(`/documents/${result.data._id}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Link className="back-link" to="/">
        ← Back to overview
      </Link>
      <PageHeader
        eyebrow={d.kind.toUpperCase()}
        title={d.number}
        description={`Created ${date(d.createdAt)} · ${d.contactName}`}
      >
        <Badge value={d.status} />
        {d.status === "draft" && (
          <PermissionGate>
            <Link className="button secondary" to={`/edit/${d._id}`}>
              Edit draft
            </Link>
          </PermissionGate>
        )}
        <Button variant="secondary" onClick={() => window.print()}>
          Print document
        </Button>
      </PageHeader>
      <div className="document-statusbar">
        <span className={d.status === "draft" ? "current" : ""}>Draft</span>
        <span
          className={
            ["confirmed", "issued"].includes(d.status) ? "current" : ""
          }
        >
          {isInvoice ? "Issued" : "Confirmed"}
        </span>
        <span
          className={
            ["fulfilled", "received", "paid"].includes(d.status)
              ? "current"
              : ""
          }
        >
          {isInvoice
            ? "Paid"
            : d.kind === "purchase"
              ? "Received"
              : "Fulfilled"}
        </span>
        <div>
          Delivery: {date(d.deliveryDate)} · Due: {date(d.dueDate)}
        </div>
      </div>
      <div className="detail-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>
                <Link
                  className="record-link"
                  to={`/records/${["purchase", "vendor-invoice"].includes(d.kind) ? "suppliers" : "customers"}/${d.contact}`}
                >
                  {d.contactName}
                </Link>
              </h2>
              <p>
                {d.kind === "purchase" || d.kind === "vendor-invoice"
                  ? "Supplier"
                  : "Client"}
              </p>
            </div>
            <span>{date(d.date)}</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>PRODUCT</th>
                  <th>QUANTITY</th>
                  <th>PRICE</th>
                  <th>LINE TOTAL</th>
                  {d.kind === "purchase" && <th>RECEIVED</th>}
                </tr>
              </thead>
              <tbody>
                {d.lines.map((l) => (
                  <tr key={l.product}>
                    <td>
                      <Link
                        className="record-link"
                        to={`/records/products/${l.product}`}
                      >
                        {l.name}
                      </Link>
                    </td>
                    <td>
                      {l.quantity} {l.unit}
                    </td>
                    <td>{money(l.price, org, currency)}</td>
                    <td>{money(Math.round(l.quantity * l.price), org, currency)}</td>
                    {d.kind === "purchase" && (
                      <td>
                        {l.received} {l.unit}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="document-totals">
            <div>
              <span>Total</span>
                  <strong>{money(d.total, org, currency)}</strong>
            </div>
            {isInvoice && (
              <>
                <div>
                  <span>Paid</span>
                    <strong>{money(d.paid, org, currency)}</strong>
                </div>
                <div>
                  <span>Outstanding</span>
                    <strong>{money(d.total - d.paid, org, currency)}</strong>
                </div>
              </>
            )}
          </div>
          {d.notes && (
            <div className="document-notes">
              <h3>Notes</h3>
              <p>{d.notes}</p>
            </div>
          )}
        </section>
        <section className="panel workflow">
          <div className="panel-head">
            <h2>Next steps</h2>
          </div>
          <PermissionGate>
            {d.status === "draft" && (
              <Button onClick={() => open("confirmed")}>
                {isInvoice ? "Issue invoice" : "Confirm document"}
              </Button>
            )}
            {d.status === "confirmed" && d.kind === "order" && (
              <Button onClick={() => open("fulfilled")}>Fulfill order</Button>
            )}
            {["confirmed", "partial"].includes(d.status) &&
              d.kind === "purchase" && (
                <Button onClick={() => open("receive")}>Receive goods</Button>
              )}
            {["confirmed", "fulfilled", "received", "partial"].includes(
              d.status,
            ) &&
              ["order", "purchase", "quote"].includes(d.kind) && (
                <Button variant="secondary" onClick={() => open("invoice")}>
                  {d.kind === "quote"
                    ? "Convert to order"
                    : "Create / view invoice"}
                </Button>
              )}
            {isInvoice && d.paid < d.total && d.status !== "draft" && (
              <Button onClick={() => open("pay")}>Record payment</Button>
            )}
            {["draft", "confirmed"].includes(d.status) && !isInvoice && (
              <Button variant="danger" onClick={() => open("cancelled")}>
                Cancel document
              </Button>
            )}
          </PermissionGate>
          <p className="muted">
            Confirmed prices are preserved. Stock changes when goods are
            received or an order is fulfilled.
          </p>
          {d.source && (
            <Link to={`/documents/${d.source}`}>View source document →</Link>
          )}
        </section>
      </div>
      {(d.payments.length > 0 || d.movements.length > 0) && (
        <section className="panel history">
          <div className="panel-head">
            <h2>Transaction history</h2>
          </div>
          {d.payments.map((p) => (
            <div className="history-row" key={p._id}>
              <span>Payment · {date(p.createdAt)}</span>
              <strong>{money(p.amount, org, p.currency || currency)}</strong>
            </div>
          ))}
          {d.movements.map((m) => (
            <div className="history-row" key={m._id}>
              <span>
                {m.reason} · {date(m.createdAt)}
              </span>
              <strong>{m.quantity} units</strong>
            </div>
          ))}
        </section>
      )}
      {action && (
        <Dialog
          title={
            action === "invoice"
              ? "Create linked document"
              : action === "pay"
                ? "Record payment"
                : action === "receive"
                  ? "Receive purchase order"
                  : `Confirm: ${action}`
          }
          onClose={() => !busy && setAction(null)}
        >
          {action === "pay" ? (
            <Field label={`Payment amount (${currency})`}>
              <input
                type="number"
                min="0.01"
                max={(d.total - d.paid) / 100}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
          ) : action === "receive" ? (
            <>
              <p>
                Enter quantities received now. Leave zero for products that have
                not arrived.
              </p>
              {d.lines
                .filter((l) => l.received < l.quantity)
                .map((l) => (
                  <Field
                    key={l.product}
                    label={`${l.name} · ${Number((l.quantity - l.received).toFixed(3))} ${l.unit} remaining`}
                  >
                    <input
                      type="number"
                      min="0"
                      max={Number((l.quantity - l.received).toFixed(3))}
                      step="0.001"
                      value={receipts[l.product] || ""}
                      onChange={(e) =>
                        setReceipts((v) => ({
                          ...v,
                          [l.product]: e.target.value,
                        }))
                      }
                    />
                  </Field>
                ))}
            </>
          ) : (
            <p>
              {action === "fulfilled"
                ? "This deducts ordered quantities from inventory. Insufficient stock prevents fulfillment."
                : action === "cancelled"
                  ? "This record will be cancelled. This action cannot be undone."
                  : action === "invoice"
                    ? "Create a linked document or open the existing one."
                    : "This locks the document and enables its next workflow step."}
            </p>
          )}
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <Button
              disabled={busy}
              variant="secondary"
              onClick={() => setAction(null)}
            >
              Go back
            </Button>
            <Button disabled={busy} onClick={submit}>
              {busy ? "Processing…" : "Confirm action"}
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
