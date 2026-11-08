import { Link } from "react-router-dom";
import { useAuth } from "../../app/providers";
import { PageHeader } from "../../components/ui";
import { navigation } from "../../components/layout/navigation";
export default function ApplicationsPage() {
  const { session } = useAuth();
  const groups = navigation
    .filter(
      ([group, , admin]) =>
        group !== "Overview" && (!admin || session.user.role === "admin"),
    )
    .map(([group, links]) => [
      group,
      links.filter((l) => !l[3] || session.user.role === "admin"),
    ]);
  const columns = [
    ["Operations", "Purchasing", "People"],
    ["Products & inventory", "Finance", "Administration"],
    ["Sales", "Reporting"],
  ].map((names) => names.map((name) => groups.find(([group]) => group === name)).filter(Boolean));
  return (
    <>
      <PageHeader
        eyebrow="YOUR CONNECTED WORKSPACE"
        title="Applications"
        description="Choose a business area. Every application shares the same records and workflows."
      />
      <div className="applications">
        {columns.map((column, index) => (
          <div className="applications-column" key={index}>
            {column.map(([group, links]) => (
              <section key={group}>
                <h2>{group}</h2>
                <div>
                  {links.map(([name, path, Icon]) => (
                    <Link key={path} to={path}>
                      <span>
                        <Icon size={21} />
                      </span>
                      {name}
                      <b>→</b>
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
