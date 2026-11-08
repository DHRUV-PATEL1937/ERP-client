import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  ShoppingBasket,
  Wallet,
  Truck,
  Package,
  ArrowRight,
  Sun,
  Leaf,
  Clock,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { api } from "../../lib/api";
import { money, date } from "../../lib/format";
import { useAuth } from "../../app/providers";
import {
  PageHeader,
  Loading,
  ErrorState,
  Badge,
  Empty,
} from "../../components/ui";
export default function DashboardPage() {
  const { session } = useAuth();
  const org = session.organization;
  const { data, isPending, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api("/dashboard"),
  });
  if (isPending) return <Loading />;
  if (error) return <ErrorState error={error} retry={refetch} />;
  const d = data.data;
  const cards = [
    [
      "Total orders",
      d.orders,
      "Across your workspace",
      ShoppingBasket,
      "/orders",
    ],
    [
      "Invoiced sales",
      money(d.revenue, org),
      "Issued customer invoices",
      Wallet,
      "/invoices",
    ],
    [
      "Open purchases",
      d.purchases,
      "Confirmed or partially received",
      Truck,
      "/purchase-orders",
    ],
    [
      "Customer balance",
      money(d.receivable, org),
      "Outstanding invoices",
      ReceiptIcon,
      "/invoices",
    ],
  ];
  return (
    <>
      <PageHeader
        eyebrow="YOUR BUSINESS, AT A GLANCE"
        title={`Good ${new Date().getHours() < 12 ? "morning" : "afternoon"}, ${session.user.name.split(" ")[0]}.`}
        description="A fresh perspective on everything that matters today."
      >
        <span className="date-chip">
          <Sun size={16} />
          {date(new Date())}
        </span>
      </PageHeader>
      <div className="welcome-banner">
        <div className="banner-icon">
          <Leaf size={27} />
        </div>
        <div>
          <strong>From the farm. To the table. All in sync.</strong>
          <p>Your orders, inventory, and finances — growing together.</p>
        </div>
        <Link to="/demand">
          Plan your next delivery <ArrowRight size={16} />
        </Link>
        <div className="banner-leaf">
          <SproutIcon />
        </div>
      </div>
      <div className="metrics">
        {cards.map(([title, value, desc, Icon, path]) => (
          <Link to={path} className="metric" key={title}>
            <div>
              <span>{title}</span>
              <Icon size={18} />
            </div>
            <strong>{value}</strong>
            <small>
              {desc}
              <ArrowUpRight size={14} />
            </small>
          </Link>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel chart-panel">
          <div className="panel-head">
            <div>
              <h2>Sales overview</h2>
              <p>Issued invoice value · last 7 days · UTC</p>
            </div>
            <span className="legend">
              <i /> Sales
            </span>
          </div>
          <div className="chart">
            {d.days.some((day) => day.sales > 0) ? (
              <ResponsiveContainer width="100%" height={235}>
                <AreaChart
                  data={d.days}
                  margin={{ left: 0, right: 15, top: 15, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="#36865e"
                        stopOpacity={0.18}
                      />
                      <stop offset="100%" stopColor="#36865e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#edf0ed" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) =>
                      new Date(v).toLocaleDateString("en", { weekday: "short" })
                    }
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#8a918c" }}
                  />
                  <YAxis
                    tickFormatter={(v) => money(v, org)}
                    axisLine={false}
                    tickLine={false}
                    width={75}
                    tick={{ fontSize: 10, fill: "#8a918c" }}
                  />
                  <Tooltip formatter={(v) => money(v, org)} />
                  <Area
                    isAnimationActive={false}
                    type="monotone"
                    dataKey="sales"
                    stroke="#347653"
                    strokeWidth={2.5}
                    fill="url(#salesFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <Empty
                title="A fresh start for sales"
                text="Issued invoices from the last seven days will appear here."
              />
            )}
          </div>
          <div className="chart-foot">
            <span>
              Receivables <strong>{money(d.receivable, org)}</strong>
            </span>
            <span>
              Supplier balance <strong>{money(d.payable, org)}</strong>
            </span>
            <Link to="/reports">
              View financial report <ArrowUpRight size={14} />
            </Link>
          </div>
        </section>
        <section className="panel attention">
          <div className="panel-head">
            <div>
              <h2>Needs your attention</h2>
              <p>A little care goes a long way.</p>
            </div>
            <span className="count">
              {d.awaiting + d.fulfillment + d.lowStock.length}
            </span>
          </div>
          {[
            [
              d.awaiting,
              "Orders to confirm",
              "Review incoming customer orders",
              "/orders?status=draft",
              ShoppingBasket,
              "amber",
            ],
            [
              d.fulfillment,
              "Ready for fulfillment",
              "Confirmed orders awaiting dispatch",
              "/orders?status=confirmed",
              Truck,
              "green",
            ],
            [
              d.lowStock.length,
              "Products running low",
              "Review stock and plan purchasing",
              "/inventory?lowStock=true",
              Package,
              "red",
            ],
          ].map(([count, title, desc, path, Icon, color]) => (
            <Link to={path} className="attention-row" key={title}>
              <span className={`attention-icon ${color}`}>
                <Icon size={18} />
              </span>
              <div>
                <strong>{title}</strong>
                <small>{desc}</small>
              </div>
              <b>{count}</b>
              <ChevronIcon />
            </Link>
          ))}
          <div className="attention-note">
            <Leaf size={15} /> A clearer day starts with a connected workflow.
          </div>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Recent orders</h2>
              <p>The latest from your customers.</p>
            </div>
            <Link to="/orders">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {d.recentOrders.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ORDER / CUSTOMER</th>
                    <th>PLACED</th>
                    <th>AMOUNT</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {d.recentOrders.map((o) => (
                    <tr key={o._id}>
                      <td>
                        <Link
                          className="record-link"
                          to={`/documents/${o._id}`}
                        >
                          {o.number}
                        </Link>
                        <small>{o.contactName}</small>
                      </td>
                      <td>{date(o.date)}</td>
                      <td className="numeric">
                        {money(o.total, org, o.currency)}
                      </td>
                      <td>
                        <Badge value={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty title="Your first order starts here" />
          )}
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Workspace activity</h2>
              <p>The latest changes, in one place.</p>
            </div>
            <Clock size={17} />
          </div>
          <div className="activity-list">
            {d.activity.length ? (
              d.activity.map((a) => (
                <div className="activity" key={a._id}>
                  <span className="activity-dot" />
                  <div>
                    <strong>{a.message}</strong>
                    <small>
                      {a.actor} · {date(a.createdAt)}
                    </small>
                  </div>
                </div>
              ))
            ) : (
              <Empty
                title="A fresh start"
                text="Workspace activity will appear here."
              />
            )}
          </div>
        </section>
      </div>
    </>
  );
}
function ReceiptIcon() {
  return <Wallet size={18} />;
}
function ChevronIcon() {
  return <ArrowRight size={14} />;
}
function SproutIcon() {
  return <Leaf size={120} />;
}
