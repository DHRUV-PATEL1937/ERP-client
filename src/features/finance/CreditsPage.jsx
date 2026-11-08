import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { money, date } from "../../lib/format";
import { useAuth, useToast } from "../../app/providers";
import PermissionGate from "../../app/PermissionGate";
import LookupSelect from "../../components/forms/LookupSelect";
import {
  PageHeader,
  Button,
  Dialog,
  Field,
  Loading,
  ErrorState,
  Empty,
} from "../../components/ui";
export default function CreditsPage() {
  const { session } = useAuth(),
    toast = useToast(),
    client = useQueryClient();
  const [q, setQ] = useState(""),
    [show, setShow] = useState(false),
    [customer, setCustomer] = useState(""),
    [type, setType] = useState("credit"),
    [amount, setAmount] = useState(""),
    [invoice, setInvoice] = useState(""),
    [notes, setNotes] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [history, setHistory] = useState(null);
  const key = useRef("");
  const query = useQuery({
    queryKey: ["credits"],
    queryFn: () => api("/credits"),
  });
  const open = (row, action) => {
    key.current = crypto.randomUUID();
    setCustomer(row?.customer || "");
    setType(action || "credit");
    setAmount("");
    setInvoice("");
    setNotes("");
    setError("");
    setShow(true);
  };
  const account = query.data?.data.find((r) => r.customer === customer);
  return (
    <>
      <PageHeader
        eyebrow="SALES / CUSTOMER ACCOUNTS"
        title="Credit on Account"
        description="Customer prepayments, allocations, refunds, and a permanent transaction history."
      >
        <PermissionGate>
          <Button onClick={() => open()}>Add credit</Button>
        </PermissionGate>
      </PageHeader>
      <div className="report-strip">
        <span>
          Credit held{" "}
          <strong>
            {money(
              query.data?.data.reduce((s, r) => s + r.credit, 0),
              session.organization,
            )}
          </strong>
        </span>
        <span>
          Invoice receivables{" "}
          <strong>
            {money(
              query.data?.data.reduce((s, r) => s + r.outstanding, 0),
              session.organization,
            )}
          </strong>
        </span>
      </div>
      <section className="panel list-panel">
        <div className="table-toolbar">
          <strong>Client accounts</strong>
          <input
            aria-label="Search client accounts"
            placeholder="Search clients…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {query.isPending ? (
          <Loading />
        ) : query.error ? (
          <ErrorState error={query.error} />
        ) : !query.data.data.length ? (
          <Empty title="Create a client to start an account" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>CLIENT</th>
                  <th>CREDIT HELD</th>
                  <th>OUTSTANDING INVOICES</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {query.data.data
                  .filter((r) => r.name.toLowerCase().includes(q.toLowerCase()))
                  .map((row) => (
                    <tr key={row.customer}>
                      <td>
                        <Link
                          className="record-link"
                          to={`/records/customers/${row.customer}`}
                        >
                          {row.name}
                        </Link>
                      </td>
                      <td className="numeric">
                        {money(row.credit, session.organization)}
                      </td>
                      <td className="numeric">
                        {money(row.outstanding, session.organization)}
                      </td>
                      <td>
                        <div className="row-actions">
                          <button
                            className="text-action"
                            onClick={() => setHistory(row)}
                          >
                            History
                          </button>
                          <PermissionGate>
                            <button
                              className="text-action"
                              onClick={() => open(row, "credit")}
                            >
                              Add credit
                            </button>
                            {row.credit > 0 && (
                              <>
                                <button
                                  className="text-action"
                                  onClick={() => open(row, "application")}
                                >
                                  Apply to invoice
                                </button>
                                <button
                                  className="text-action"
                                  onClick={() => open(row, "refund")}
                                >
                                  Record refund
                                </button>
                              </>
                            )}
                          </PermissionGate>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {show && (
        <Dialog
          title={
            type === "credit"
              ? "Add customer credit"
              : type === "refund"
                ? "Record credit refund"
                : "Apply credit to invoice"
          }
          onClose={() => !busy && setShow(false)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await api("/credits", {
                  method: "POST",
                  key: key.current,
                  body: {
                    customer,
                    type,
                    amount: Math.round(Number(amount) * 100),
                    ...(type === "application" ? { invoice } : {}),
                    notes,
                  },
                });
                setShow(false);
                client.invalidateQueries();
                toast("Account transaction recorded");
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Client">
              <LookupSelect
                resource="customers"
                label="Client"
                value={customer}
                onChange={setCustomer}
              />
            </Field>
            {account && (
              <p className="muted">
                Available credit: {money(account.credit, session.organization)}
              </p>
            )}
            {type === "application" && (
              <Field label="Outstanding invoice">
                <select
                  value={invoice}
                  onChange={(e) => setInvoice(e.target.value)}
                  required
                >
                  <option value="">Choose an invoice</option>
                  {account?.invoices.map((i) => (
                    <option key={i._id} value={i._id}>
                      {i.number} ·{" "}
                      {money(i.total - i.paid, session.organization, i.currency)}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <Field label="Amount">
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </Field>
            <Field label="Reference / notes">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
            <p className="muted">
              Records an offline credit or refund. No funds are transferred by
              this application.
            </p>
            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <Button disabled={busy}>
                {busy ? "Recording…" : "Record transaction"}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
      {history && (
        <Dialog
          title={`${history.name} — credit history`}
          onClose={() => setHistory(null)}
        >
          {history.entries.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>DATE</th>
                    <th>TYPE</th>
                    <th>AMOUNT</th>
                    <th>REFERENCE</th>
                  </tr>
                </thead>
                <tbody>
                  {history.entries.map((e) => (
                    <tr key={e._id}>
                      <td>{date(e.createdAt)}</td>
                      <td>{e.type}</td>
                      <td>{money(e.amount, session.organization, e.currency)}</td>
                      <td>
                        {e.invoice ? (
                          <Link
                            className="record-link"
                            to={`/documents/${e.invoice}`}
                          >
                            Invoice
                          </Link>
                        ) : (
                          e.notes || "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="No credit transactions yet" />
          )}
        </Dialog>
      )}
    </>
  );
}
