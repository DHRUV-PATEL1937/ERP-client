import { useState, useEffect } from "react";
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Sprout,
  Search,
  Menu,
  LogOut,
  ChevronRight,
  Plus,
  X,
  PanelLeftClose,
  LayoutDashboard,
} from "lucide-react";
import { useAuth } from "../../app/providers";
import { api } from "../../lib/api";
import { navigation } from "./navigation";
export default function Shell() {
  const { session, logout } = useAuth(),
    location = useLocation();
  const [open, setOpen] = useState(false),
    [collapsed, setCollapsed] = useState(false),
    [q, setQ] = useState(""),
    [expanded, setExpanded] = useState(
      Object.fromEntries(navigation.map((g) => [g[0], true])),
    );
  const links = navigation.flatMap((g) => g[1]);
  const match = links.find((i) => i[1] === location.pathname);
  const section = navigation.find((g) =>
    g[1].some((i) => i[1] === location.pathname),
  )?.[0];
  useEffect(() => {
    if (section) setExpanded((v) => ({ ...v, [section]: true }));
    setOpen(false);
    setQ("");
  }, [location.pathname, section]);
  const { data } = useQuery({
    queryKey: ["search", q],
    queryFn: ({ signal }) =>
      api(`/search?q=${encodeURIComponent(q)}`, { signal }),
    enabled: q.length >= 2,
  });
  const parts = location.pathname.split("/").filter(Boolean);
  const parent =
    parts[0] === "records"
      ? links.find((l) => l[1] === "/" + parts[1])
      : parts[0] === "work"
        ? links.find((l) => l[1] === "/" + parts[1])
        : parts[0] === "new"
          ? links.find((l) => l[1] === "/" + parts[1])
          : null;
  const title =
    match?.[0] ||
    (parts[0] === "new"
      ? "New document"
      : parts[0] === "edit"
        ? "Edit draft"
        : parts[0] === "documents"
          ? "Document details"
          : "Record details");
  return (
    <div className={`workspace ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand-row">
          <Link className="brand" to="/">
            <span className="brand-mark">
              <Sprout size={23} />
            </span>
            <span className="brand-word">harvest</span>
          </Link>
          <button
            className="icon-button collapse-toggle"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed((v) => !v)}
          >
            <PanelLeftClose size={16} />
          </button>
        </div>
        <div className="organization">
          <span className="org-avatar">
            {session.organization.name.slice(0, 1)}
          </span>
          <div>
            <strong>{session.organization.name}</strong>
            <small>Farm-to-market workspace</small>
          </div>
        </div>
        <nav>
          {navigation
            .filter(([, , admin]) => !admin || session.user.role === "admin")
            .map(([label, items]) => (
              <div className="nav-group" key={label}>
                <button
                  className="nav-group-toggle"
                  aria-expanded={Boolean(expanded[label])}
                  onClick={() =>
                    setExpanded((v) => ({ ...v, [label]: !v[label] }))
                  }
                >
                  {label}
                  <ChevronRight size={12} />
                </button>
                {(expanded[label] || collapsed) &&
                  items
                    .filter((i) => !i[3] || session.user.role === "admin")
                    .map(([name, path, Icon]) => (
                      <NavLink
                        key={path}
                        title={collapsed ? name : undefined}
                        to={path}
                        end={path === "/"}
                      >
                        <Icon size={17} />
                        <span>{name}</span>
                      </NavLink>
                    ))}
              </div>
            ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="avatar">{session.user.name.slice(0, 1)}</div>
          <div>
            <strong>{session.user.name}</strong>
            <small>{session.user.role}</small>
          </div>
          <button title="Sign out" aria-label="Sign out" onClick={logout}>
            <LogOut size={17} />
          </button>
        </div>
      </aside>
      {open && (
        <button
          className="scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="main">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
            >
              <Menu size={20} />
            </button>
            <Link
              to="/"
              title="Dashboard"
              aria-label="Dashboard"
            >
              <LayoutDashboard size={17} />
            </Link>
            <ChevronRight size={14} />
            {parent && (
              <>
                <Link to={parent[1]}>{parent[0]}</Link>
                <ChevronRight size={14} />
              </>
            )}
            <strong>{title}</strong>
          </div>
          <div className="topbar-tools">
            <div className="global-search">
              <Search size={16} />
              <input
                aria-label="Search workspace"
                placeholder="Search your workspace..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              {q && (
                <button aria-label="Clear search" onClick={() => setQ("")}>
                  <X size={14} />
                </button>
              )}
              {q.length >= 2 && (
                <div className="search-results">
                  {data?.data.length ? (
                    data.data.map((r) => (
                      <Link key={r.id} to={r.path} onClick={() => setQ("")}>
                        {r.label}
                        <ChevronRight size={14} />
                      </Link>
                    ))
                  ) : (
                    <p>{data ? "No matching records" : "Searching..."}</p>
                  )}
                </div>
              )}
            </div>
            {session.user.role !== "viewer" && (
              <details className="quick-create">
                <summary className="button small secondary">
                  <Plus size={15} /> Create
                </summary>
                <div>
                  {[
                    ["Order", "/new/orders"],
                    ["Client", "/customers?create=1"],
                    ["Product", "/products?create=1"],
                    ["Supplier", "/suppliers?create=1"],
                    ["Purchase order", "/new/purchase-orders"],
                    ["Quote", "/new/quotes"],
                  ].map(([name, path]) => (
                    <Link
                      key={path}
                      to={path}
                      onClick={(e) =>
                        e.currentTarget
                          .closest("details")
                          .removeAttribute("open")
                      }
                    >
                      {name}
                    </Link>
                  ))}
                </div>
              </details>
            )}
            <div className="top-avatar" title={session.user.name}>
              {session.user.name.slice(0, 1)}
            </div>
          </div>
        </header>
        <main>
          <Outlet />
        </main>
        <footer>
          <span>
            <Sprout size={13} /> Harvest · Connected from farm to market
          </span>
          <span>{session.organization.name}</span>
        </footer>
      </div>
    </div>
  );
}
