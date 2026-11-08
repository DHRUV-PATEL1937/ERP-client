import { useContext } from "react";
import { QueryClientContext, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { useState } from "react";
import { PageHeader } from "../../components/ui";
const articles = [
  [
    "Customer orders",
    "Create a client and an order with product quantities. Prices come from the catalogue and are frozen at creation. Confirm the order, receive enough stock, then fulfill it. Fulfillment deducts inventory atomically.",
  ],
  [
    "Purchasing & receiving",
    "Create a supplier and purchase order. Confirm it, then receive quantities as deliveries arrive. Unique request keys protect retries. Partial deliveries remain open until fully received.",
  ],
  [
    "Invoices & payments",
    "Generate invoices from confirmed orders or purchases. Standalone invoices begin as drafts and must be issued. Payments use the invoice currency. Overpayments are rejected; payment history is preserved.",
  ],
  [
    "Access & security",
    "Records belong to your organization. Administrators create users; managers run operations; viewers have read-only business access. Sessions expire after 30 minutes. Signing out revokes your current sessions.",
  ],
  [
    "Stock & money",
    "Stock uses each product’s base unit. Units are never converted implicitly. Money uses integer minor units; quantity × price lines round to the nearest minor unit. Taxes and discounts are not implemented.",
  ],
];
export default function HandbookPage() {
  const [q, setQ] = useState("");
  const client = useContext(QueryClientContext);
  return (
    <>
      <PageHeader
        eyebrow="A LITTLE GUIDANCE"
        title="Workspace handbook"
        description="Practical answers for a smoother working day."
      />
      <input
        className="handbook-search"
        aria-label="Search handbook"
        placeholder="Search the handbook…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {client && <PublishedArticles q={q} />}
      <div className="handbook-grid">
        {articles
          .filter((a) => a.join(" ").toLowerCase().includes(q.toLowerCase()))
          .map(([title, body], i) => (
            <article className="panel handbook-card" key={title}>
              <span className="eyebrow">
                GUIDE {String(i + 1).padStart(2, "0")}
              </span>
              <h2>{title}</h2>
              <p>{body}</p>
            </article>
          ))}
      </div>
    </>
  );
}

function PublishedArticles({ q }) {
  const { data, error } = useQuery({
    queryKey: ["published-articles", q],
    queryFn: () => api(`/articles?q=${encodeURIComponent(q)}&limit=100`),
  });
  return (
    <section className="panel related-section">
      <div className="panel-head">
        <h2>Organization handbook</h2>
        <Link to="/articles">Manage articles</Link>
      </div>
      {error ? (
        <p className="report-definition">{error.message}</p>
      ) : data?.data.length ? (
        data.data.map((a) => (
          <Link
            key={a._id}
            className="handbook-article-link"
            to={`/work/articles/${a._id}`}
          >
            <strong>{a.name}</strong>
            <span>{a.category}</span>
          </Link>
        ))
      ) : (
        <p className="report-definition">
          No published articles match. Use the quick-start guides below or add
          organization guidance.
        </p>
      )}
    </section>
  );
}
