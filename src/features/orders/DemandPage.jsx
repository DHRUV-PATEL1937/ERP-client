import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";
import { downloadCSV } from "../../lib/export";
import {
  PageHeader,
  Button,
  Loading,
  ErrorState,
  Empty,
} from "../../components/ui";
export default function DemandPage() {
  const [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [q, setQ] = useState("");
  const params = new URLSearchParams();
  if (start) params.set("start", start);
  if (end) params.set("end", end);
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["demand", start, end],
    queryFn: () => api(`/orders-demand?${params}`),
  });
  const rows = (data?.data || []).filter((r) =>
    r.name.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <PageHeader
        eyebrow="PROCUREMENT PLANNING"
        title="Consolidated demand"
        description="Product demand from draft and confirmed orders, grouped by product and base unit."
      >
        <Button variant="secondary" onClick={() => window.print()}>
          Print grid
        </Button>
        <Button
          variant="secondary"
          disabled={!rows.length}
          onClick={() =>
            downloadCSV(
              "consolidated-demand.csv",
              [
                ["name", "PRODUCT"],
                ["unit", "UNIT"],
                ["confirmed", "CONFIRMED"],
                ["draft", "UNCONFIRMED"],
              ],
              rows,
            )
          }
        >
          Export demand
        </Button>
      </PageHeader>
      <div className="report-controls">
        <label>
          Deliveries from{" "}
          <input
            type="date"
            aria-label="Demand start"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </label>
        <label>
          Through{" "}
          <input
            type="date"
            aria-label="Demand end"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
        <input
          aria-label="Search demand"
          placeholder="Search products..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        {(start || end) && (
          <Button
            variant="secondary"
            onClick={() => {
              setStart("");
              setEnd("");
            }}
          >
            All dates
          </Button>
        )}
      </div>
      <section className="panel">
        {isPending ? (
          <Loading />
        ) : error ? (
          <ErrorState error={error} retry={refetch} />
        ) : !rows.length ? (
          <Empty title="No matching open demand" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>PRODUCT</th>
                  <th>UNIT</th>
                  <th>CONFIRMED</th>
                  <th>UNCONFIRMED</th>
                  <th>SOURCE ORDERS</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={`${r.product}-${r.unit}`}>
                    <td>
                      <Link
                        className="record-link"
                        to={`/records/products/${r.product}`}
                      >
                        {r.name}
                      </Link>
                    </td>
                    <td>{r.unit}</td>
                    <td>{Number(r.confirmed.toFixed(3))}</td>
                    <td>{Number(r.draft.toFixed(3))}</td>
                    <td>
                      {r.orders.map((o) => (
                        <Link
                          className="source-link"
                          key={o.id}
                          to={`/documents/${o.id}`}
                        >
                          {o.number}
                        </Link>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
