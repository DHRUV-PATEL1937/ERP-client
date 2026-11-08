import {
  useParams,
  useNavigate,
  useSearchParams,
  Link,
} from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuth, useToast } from "../../app/providers";
import { PageHeader, Loading, ErrorState } from "../../components/ui";
import { configs } from "../resources/config";
import OrderForm from "./OrderForm";
export default function DocumentEditorPage() {
  const { resource: requested, id } = useParams(),
    [params] = useSearchParams(),
    navigate = useNavigate(),
    client = useQueryClient(),
    toast = useToast(),
    { session } = useAuth();
  const query = useQuery({
    queryKey: ["document", id],
    queryFn: () => api(`/documents/${id}`),
    enabled: Boolean(id),
  });
  const initial = id
    ? query.data?.data
    : { contact: params.get("contact") || "" };
  if (session.user.role === "viewer")
    return <ErrorState error={new Error("Your role has read-only access")} />;
  if (id && query.isPending) return <Loading />;
  if (query.error) return <ErrorState error={query.error} />;
  const resource =
    requested ||
    {
      order: "orders",
      purchase: "purchase-orders",
      quote: "quotes",
      invoice: "invoices",
      "vendor-invoice": "vendor-invoices",
    }[initial?.kind];
  const config = configs[resource];
  if (!config?.document)
    return <ErrorState error={new Error("Unknown document type")} />;
  if (id && initial.status !== "draft")
    return (
      <ErrorState error={new Error("Only draft documents can be edited")} />
    );
  const cancel = () => navigate(id ? `/documents/${id}` : `/${resource}`);
  return (
    <>
      <Link className="back-link" to={id ? `/documents/${id}` : `/${resource}`}>
        ← {id ? "Record details" : config.title}
      </Link>
      <PageHeader
        eyebrow="DRAFT DOCUMENT"
        title={id ? `Edit ${initial.number}` : `New ${config.singular}`}
        description="Create a clear commercial record, then review and confirm it."
      />
      <section className="panel document-editor">
        <OrderForm
          config={config}
          initial={initial}
          onClose={cancel}
          onSave={async (body, key) => {
            const result = await api(id ? `/documents/${id}` : `/${resource}`, {
              method: id ? "PATCH" : "POST",
              key,
              body: {
                ...body,
                ...(id ? { expectedUpdatedAt: initial.updatedAt } : {}),
              },
            });
            await client.invalidateQueries();
            toast(id ? "Draft updated" : "Draft created");
            navigate(`/documents/${result.data._id}`);
          }}
        />
      </section>
    </>
  );
}
