import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { money } from "../../lib/format";
import { useAuth } from "../../app/providers";
import { PageHeader, Loading, ErrorState } from "../../components/ui";
export default function ReportsPage() {
  const { session } = useAuth();
  const { data, isPending, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api("/dashboard"),
  });
  if (isPending) return <Loading />;
  if (error) return <ErrorState error={error} />;
  const d = data.data;
  return (
    <>
      <PageHeader
        eyebrow="FINANCIAL VISIBILITY"
        title="Operational report"
        description="Understand the numbers behind your everyday operations."
      />
      <div className="report-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Revenue & purchasing</h2>
            <span>All time</span>
          </div>
          {[
            ["Issued sales", d.revenue, "/invoices"],
            ["Issued supplier invoices", d.purchaseCosts, "/vendor-invoices"],
            ["Recorded expenses", d.expenses, "/expenses"],
            [
              "Sales less purchases and expenses",
              d.operatingSurplus,
              "/reports",
            ],
          ].map(([label, value, path]) => (
            <Link key={label} className="report-line" to={path}>
              <span>{label}</span>
              <strong>{money(value, session.organization)}</strong>
            </Link>
          ))}
        </section>
        <section className="panel">
          <div className="panel-head">
            <h2>Outstanding accounts</h2>
          </div>
          <Link className="report-line" to="/invoices">
            <span>Customers owe you</span>
            <strong>{money(d.receivable, session.organization)}</strong>
          </Link>
          <Link className="report-line" to="/vendor-invoices">
            <span>You owe suppliers</span>
            <strong>{money(d.payable, session.organization)}</strong>
          </Link>
          <div className="document-notes">
            <h3>Report definitions</h3>
            <p>
              All-time sales and purchases include issued invoices, whether paid
              or unpaid. Draft documents are excluded. Expenses include active
              expense records.
            </p>
            <p>
              Purchases are not cost of goods sold. This operational surplus is
              not a full profit-and-loss statement. Stock valuation,
              depreciation, payroll, and tax liabilities are excluded.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
