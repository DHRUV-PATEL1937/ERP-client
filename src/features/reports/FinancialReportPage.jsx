import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { downloadCSV } from "../../lib/export";
import { money, date } from "../../lib/format";
import { useAuth } from "../../app/providers";
import {
  PageHeader,
  Button,
  Loading,
  ErrorState,
  Badge,
  Empty,
} from "../../components/ui";
const titles = {
  analytics: "Analytics",
  daily: "Daily Report",
  weekly: "Weekly Report",
  pnl: "Profit and Loss",
  margin: "Weekly Margin",
  owe: "What We Owe",
  bas: "BAS worksheet",
};
const iso = (d) => d.toISOString().slice(0, 10);
function defaultPeriod(view) {
  const today = new Date(),
    start = new Date(today);
  if (["weekly", "margin"].includes(view)) {
    const day = start.getUTCDay();
    start.setUTCDate(start.getUTCDate() - ((day + 6) % 7));
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    return { start: iso(start), end: iso(end) };
  }
  if (view === "daily") return { start: iso(today), end: iso(today) };
  start.setUTCDate(1);
  return { start: iso(start), end: iso(today) };
}
export default function FinancialReportPage({ view = "analytics" }) {
  const { session } = useAuth(),
    org = session.organization;
  const [params, setParams] = useSearchParams(),
    defaults = defaultPeriod(view);
  const start = params.get("start") || defaults.start,
    end = params.get("end") || defaults.end;
  const [tab, setTab] = useState("products");
  const query = useQuery({
    queryKey: ["reports", start, end],
    queryFn: () => api(`/reports/summary?start=${start}&end=${end}`),
  });
  const change = (key, value) => setParams({ start, end, [key]: value });
  const move = (direction) => {
    const a = new Date(start),
      b = new Date(end),
      days = Math.round((b - a) / 86400000) + 1;
    a.setUTCDate(a.getUTCDate() + direction * days);
    b.setUTCDate(b.getUTCDate() + direction * days);
    setParams({ start: iso(a), end: iso(b) });
  };
  const d = query.data?.data;
  return (
    <>
      <PageHeader
        eyebrow="REPORTING / UTC PERIODS"
        title={titles[view]}
        description={
          view === "owe"
            ? "Open supplier invoices and their outstanding balances."
            : "Traceable business results, calculated from your operational records."
        }
      >
        <Button variant="secondary" onClick={() => window.print()}>
          Print
        </Button>
        {d && (
          <Button
            variant="secondary"
            onClick={() =>
              downloadCSV(
                `${view}-${start}-${end}.csv`,
                [
                  ["date", "DATE"],
                  ["orders", "FULFILLED ORDERS"],
                  ["revenue", "SALES (MINOR UNITS)"],
                  ["purchases", "PURCHASE ORDERS"],
                ],
                d.daily,
              )
            }
          >
            Export period
          </Button>
        )}
      </PageHeader>
      <div className="report-controls">
        <Button variant="secondary" onClick={() => move(-1)}>
          ← Previous
        </Button>
        <label>
          From{" "}
          <input
            aria-label="Report start"
            type="date"
            value={start}
            onChange={(e) => change("start", e.target.value)}
          />
        </label>
        <label>
          Through{" "}
          <input
            aria-label="Report end"
            type="date"
            value={end}
            onChange={(e) => change("end", e.target.value)}
          />
        </label>
        <Button variant="secondary" onClick={() => move(1)}>
          Next →
        </Button>
      </div>
      {query.isPending ? (
        <Loading />
      ) : query.error ? (
        <ErrorState error={query.error} retry={query.refetch} />
      ) : (
        <>
          {view === "owe" ? (
            <section className="panel">
              <div className="panel-head">
                <h2>Current supplier liabilities</h2>
                <strong>
                  {money(
                    d.liabilities.reduce((s, r) => s + r.total - r.paid, 0),
                    org,
                  )}
                </strong>
              </div>
              <InvoiceTable rows={d.liabilities} org={org} />
              <p className="report-definition">
                Balances are current, across all issue dates. The period
                selector applies to other reports.
              </p>
            </section>
          ) : view === "bas" ? (
            <section className="panel">
              <div className="panel-head">
                <h2>Source totals for tax review</h2>
              </div>
              <div className="report-line">
                <span>Issued customer invoices</span>
                <strong>{money(d.invoiced, org)}</strong>
              </div>
              <div className="report-line">
                <span>Issued supplier invoices</span>
                <strong>{money(d.vendorInvoiced, org)}</strong>
              </div>
              <div className="report-line">
                <span>Recorded expenses</span>
                <strong>{money(d.expenses, org)}</strong>
              </div>
              <p className="report-definition">
                Tax codes, GST allocation and statutory BAS calculations are not
                configured. These source totals are not a tax return and do not
                populate GST boxes. No filing or tax submission occurs.
              </p>
            </section>
          ) : (
            <>
              <div className="report-strip">
                <span>
                  Fulfilled sales<strong>{money(d.revenue, org)}</strong>
                </span>
                <span>
                  Cost of goods sold
                  <strong>
                    {d.cogs == null ? "Unknown" : money(d.cogs, org)}
                  </strong>
                </span>
                <span>
                  Gross margin
                  <strong>
                    {d.grossMargin == null
                      ? "—"
                      : `${d.grossMargin.toFixed(1)}%`}
                  </strong>
                </span>
                <span>
                  Stock value (current)
                  <strong>{money(d.stockValue, org)}</strong>
                </span>
              </div>
              {["pnl", "margin"].includes(view) ? (
                <section className="panel statement">
                  <div className="panel-head">
                    <h2>
                      {view === "pnl"
                        ? "Operational profit and loss"
                        : "Weekly gross and operating margin"}
                    </h2>
                    <span>
                      {date(start)} — {date(end)}
                    </span>
                  </div>
                  {[
                    ["Fulfilled sales", d.revenue],
                    ["Cost of goods sold", d.cogs],
                    ["Gross profit", d.grossProfit],
                    ["Operating expenses", d.expenses],
                    ["Approved shift costs", d.payroll],
                    ["Stock write-offs", d.writeOffs],
                    [
                      "Operating result before tax and adjustments",
                      d.operatingResult,
                    ],
                  ].map(([label, value]) => (
                    <div className="report-line" key={label}>
                      <span>{label}</span>
                      <strong>
                        {value == null
                          ? "Unknown — missing historical costs"
                          : money(value, org)}
                      </strong>
                    </div>
                  ))}
                </section>
              ) : (
                <section className="panel">
                  <div className="panel-head">
                    <h2>
                      {view === "daily"
                        ? "Daily activity"
                        : view === "weekly"
                          ? "Weekly activity"
                          : "Sales by day"}
                    </h2>
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>DATE</th>
                          <th>FULFILLED ORDERS</th>
                          <th>SALES</th>
                          <th>PURCHASES RAISED</th>
                        </tr>
                      </thead>
                      <tbody>
                        {d.daily.map((day) => (
                          <tr key={day.date}>
                            <td>{date(day.date)}</td>
                            <td>{day.orders}</td>
                            <td>{money(day.revenue, org)}</td>
                            <td>{day.purchases}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
              <section className="panel related-section">
                <div
                  className="report-tabs"
                  role="tablist"
                  aria-label="Report breakdown"
                >
                  {["products", "customers", "suppliers", "stock"].map((t) => (
                    <button
                      role="tab"
                      aria-selected={tab === t}
                      className={tab === t ? "active" : ""}
                      key={t}
                      onClick={() => setTab(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>
                          {tab === "stock"
                            ? "PRODUCT"
                            : tab.slice(0, -1).toUpperCase()}
                        </th>
                        {tab === "products" ? (
                          <>
                            <th>QUANTITY</th>
                            <th>SALES</th>
                          </>
                        ) : tab === "customers" ? (
                          <>
                            <th>FULFILLED ORDERS</th>
                            <th>SALES</th>
                          </>
                        ) : tab === "suppliers" ? (
                          <>
                            <th>PURCHASE ORDERS</th>
                            <th>VALUE</th>
                            <th>LINE FILL RATE</th>
                          </>
                        ) : (
                          <>
                            <th>ON HAND</th>
                            <th>UNIT</th>
                            <th>REORDER AT</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {d[tab].map((r, i) => (
                        <tr key={r.id || r._id || i}>
                          <td>
                            <Link
                              className="record-link"
                              to={`/records/${tab === "stock" || tab === "products" ? "products" : tab}/${r.id || r._id}`}
                            >
                              {r.name}
                            </Link>
                          </td>
                          {tab === "products" ? (
                            <>
                              <td>
                                {r.quantity} {r.unit}
                              </td>
                              <td>{money(r.revenue, org)}</td>
                            </>
                          ) : tab === "customers" ? (
                            <>
                              <td>{r.orders}</td>
                              <td>{money(r.revenue, org)}</td>
                            </>
                          ) : tab === "suppliers" ? (
                            <>
                              <td>{r.orders}</td>
                              <td>{money(r.value, org)}</td>
                              <td>{r.fillRate?.toFixed(1) || "0"}%</td>
                            </>
                          ) : (
                            <>
                              <td>{r.stock}</td>
                              <td>{r.unit}</td>
                              <td>{r.reorderLevel}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {d[tab].length === 0 && (
                  <Empty title="No records in this breakdown" />
                )}
              </section>
              <p className="report-definition">
                {d.definition}
                {d.missingCostOrders > 0 &&
                  ` ${d.missingCostOrders} historical order(s) lack captured costs.`}
              </p>
            </>
          )}
        </>
      )}
    </>
  );
}
function InvoiceTable({ rows, org }) {
  return rows.length ? (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>INVOICE</th>
            <th>SUPPLIER</th>
            <th>DUE</th>
            <th>TOTAL</th>
            <th>OUTSTANDING</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => (
            <tr key={i._id}>
              <td>
                <Link className="record-link" to={`/documents/${i._id}`}>
                  {i.number}
                </Link>
              </td>
              <td>
                <Link
                  className="record-link"
                  to={`/records/suppliers/${i.contact}`}
                >
                  {i.contactName}
                </Link>
              </td>
              <td>{date(i.dueDate)}</td>
              <td>{money(i.total, org)}</td>
              <td>{money(i.total - i.paid, org)}</td>
              <td>
                <Badge value={i.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : (
    <Empty title="No outstanding vendor invoices" />
  );
}
