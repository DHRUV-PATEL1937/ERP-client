import ProductImage from "../products/ProductImage";
import PortalAccess from "../customer/PortalAccess";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { money, date } from "../../lib/format";
import { useAuth } from "../../app/providers";
import PermissionGate from "../../app/PermissionGate";
import {
  PageHeader,
  Button,
  Loading,
  ErrorState,
  Badge,
  Empty,
} from "../../components/ui";
export default function RelatedRecordPage() {
  const { resource, id } = useParams(),
    { session } = useAuth();
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["record", resource, id],
    queryFn: () => api(`/records/${resource}/${id}`),
  });
  if (isPending) return <Loading />;
  if (error) return <ErrorState error={error} retry={refetch} />;
  const {
    record,
    documents = [],
    movements = [],
    batches = [],
    offers = [],
    outstanding,
  } = data.data;
  const product = resource === "products";
  return (
    <>
      <Link className="back-link" to={`/${resource}`}>
        ← {resource === "customers" ? "Clients" : resource}
      </Link>
      <PageHeader
        eyebrow={
          product
            ? "PRODUCT RECORD"
            : resource === "customers"
              ? "CLIENT RECORD"
              : "SUPPLIER RECORD"
        }
        title={record.name}
        description={
          product
            ? `${record.sku} · ${record.category || "Uncategorized"} · base unit ${record.unit}`
            : record.email || record.phone || "Contact & business activity"
        }
      >
        <Badge value={record.archived ? "archived" : "active"} />
        <PermissionGate>
          {resource === "customers" && (
            <Link className="button" to={`/new/orders?contact=${id}`}>
              New order
            </Link>
          )}
          {resource === "suppliers" && (
            <>
              <Link
                className="button"
                to={`/new/purchase-orders?contact=${id}`}
              >
                New purchase
              </Link>
              <Link
                className="button secondary"
                to={`/supplier-offers?supplier=${id}`}
              >
                Supplier catalogue
              </Link>
            </>
          )}
          {product && (
            <Link
              className="button"
              to={`/supplier-offers?create=1&product=${id}`}
            >
              Add supplier offer
            </Link>
          )}
        </PermissionGate>
      </PageHeader>
      {product && <ProductImage product={record} />}
      <section className="panel record-sheet">
        <dl>
          {product ? (
            <>
              <div>
                <dt>On hand</dt>
                <dd>
                  {record.stock} {record.unit}
                </dd>
              </div>
              <div>
                <dt>Reorder threshold</dt>
                <dd>
                  {record.reorderLevel} {record.unit}
                </dd>
              </div>
              <div>
                <dt>Selling price</dt>
                <dd>
                  {money(record.price, session.organization)} / {record.unit}
                </dd>
              </div>
              <div>
                <dt>Fallback unit cost</dt>
                <dd>{money(record.cost, session.organization)}</dd>
              </div>
            </>
          ) : (
            <>
              <div>
                <dt>Email</dt>
                <dd>{record.email || "—"}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{record.phone || "—"}</dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>{record.address || "—"}</dd>
              </div>
              <div>
                <dt>Outstanding invoices</dt>
                <dd>{money(outstanding, session.organization)}</dd>
              </div>
            </>
          )}
        </dl>
        {record.notes && (
          <div className="document-notes">
            <h3>Notes</h3>
            <p>{record.notes}</p>
          </div>
        )}
      </section>
      {resource === "customers" && (
        <PermissionGate><PortalAccess key={id} id={id} /></PermissionGate>
      )}
      <div className="related-toolbar">
        {product ? (
          <>
            <Link className="related-pill" to={`/freshness?product=${id}`}>
              Batch freshness →
            </Link>
            <Link
              className="related-pill"
              to={`/stock-movements?product=${id}`}
            >
              Stock movements →
            </Link>
            <Link className="related-pill" to={`/pricing?product=${id}`}>
              Effective prices →
            </Link>
          </>
        ) : resource === "customers" ? (
          <>
            <Link className="related-pill" to={`/orders?contact=${id}`}>
              All orders →
            </Link>
            <Link className="related-pill" to={`/invoices?contact=${id}`}>
              All invoices →
            </Link>
            <Link className="related-pill" to="/credits">
              Credit account →
            </Link>
          </>
        ) : (
          <>
            <Link
              className="related-pill"
              to={`/purchase-orders?contact=${id}`}
            >
              All purchases →
            </Link>
            <Link
              className="related-pill"
              to={`/vendor-invoices?contact=${id}`}
            >
              All vendor invoices →
            </Link>
          </>
        )}
      </div>
      <section className="panel">
        <div className="panel-head">
          <div>
            <h2>Related transactions</h2>
            <p>
              Latest {product ? "50" : "100"} documents. Open a record for
              lines, status, and payment history.
            </p>
          </div>
        </div>
        {!documents.length ? (
          <Empty title="No transactions yet" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>DOCUMENT</th>
                  <th>TYPE</th>
                  <th>CONTACT</th>
                  <th>DATE</th>
                  <th>TOTAL</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((d) => (
                  <tr key={d._id}>
                    <td>
                      <Link className="record-link" to={`/documents/${d._id}`}>
                        {d.number}
                      </Link>
                    </td>
                    <td>{d.kind}</td>
                    <td>{d.contactName}</td>
                    <td>{date(d.date)}</td>
                    <td className="numeric">
                      {money(d.total, session.organization, d.currency)}
                    </td>
                    <td>
                      <Badge value={d.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {product && offers.length > 0 && (
        <section className="panel related-section">
          <div className="panel-head">
            <h2>Supplier offers</h2>
            <Link to={`/supplier-offers?product=${id}`}>Manage offers →</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>SUPPLIER</th>
                  <th>PRICE / BASE UNIT</th>
                  <th>PACK QUANTITY</th>
                  <th>MINIMUM ORDER</th>
                </tr>
              </thead>
              <tbody>
                {offers.map((o) => (
                  <tr key={o._id}>
                    <td>
                      <Link
                        className="record-link"
                        to={`/records/suppliers/${o.supplier}`}
                      >
                        {o.supplierName}
                      </Link>
                    </td>
                    <td>{money(o.price, session.organization, o.currency)}</td>
                    <td>
                      {o.packQuantity} {record.unit}
                    </td>
                    <td>
                      {o.minimumQuantity} {record.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {product && batches.length > 0 && (
        <section className="panel related-section">
          <div className="panel-head">
            <h2>Available batches</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>BATCH</th>
                  <th>REMAINING</th>
                  <th>RECEIVED</th>
                  <th>BEST BEFORE</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b._id}>
                    <td>
                      <Link
                        className="record-link"
                        to={`/work/freshness/${b._id}`}
                      >
                        {b.name}
                      </Link>
                    </td>
                    <td>
                      {b.remaining} {record.unit}
                    </td>
                    <td>{date(b.receivedAt)}</td>
                    <td>{date(b.bestBefore)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {product && movements.length > 0 && (
        <section className="panel related-section">
          <div className="panel-head">
            <h2>Recent stock movements</h2>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>REASON</th>
                  <th>QUANTITY</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m._id}>
                    <td>{date(m.createdAt)}</td>
                    <td>{m.reason}</td>
                    <td>
                      {m.quantity} {record.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
