import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge, Button, Empty, ErrorState, Loading, PageHeader } from "../../components/ui";
import { api } from "../../lib/api";

const kinds = { trade: "Trade application", contact: "Enquiry", newsletter: "Newsletter signup" };
const fields = {
  businessName: "Business name",
  abn: "ABN",
  name: "Name",
  contactName: "Contact name",
  email: "Email",
  phone: "Phone",
  address: "Delivery address",
  topic: "Topic",
  message: "Message",
};

export default function SubmissionsPage() {
  const queryClient = useQueryClient();
  const { data, error, isPending, refetch } = useQuery({
    queryKey: ["submissions"],
    queryFn: () => api("/submissions"),
  });
  const review = useMutation({
    mutationFn: id => api(`/submissions/${id}`, { method: "PATCH" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["submissions"] }),
  });

  return (
    <>
      <PageHeader
        eyebrow="ADMINISTRATION"
        title="Trade applications & enquiries"
        description="Review requests from the public website. Set up approved clients in Clients and enable portal ordering there."
      />
      {isPending && <Loading />}
      {error && <ErrorState error={error} retry={refetch} />}
      {data?.data.length === 0 && (
        <section className="panel">
          <Empty title="No applications or enquiries yet" text="New requests from the public site will appear here." />
        </section>
      )}
      <div className="submission-list">
        {data?.data.map(submission => (
          <article className="panel record-sheet submission-card" key={submission._id}>
            <header className="panel-head">
              <div>
                <h2>{submission.data.businessName || submission.data.name || submission.data.email}</h2>
                <p>{kinds[submission.kind]} · {new Date(submission.createdAt).toLocaleString()}</p>
              </div>
              <Badge value={submission.status} />
            </header>
            <dl>
              {Object.entries(fields).filter(([key]) => submission.data[key]).map(([key, label]) => (
                <div key={key}>
                  <dt>{label}</dt>
                  <dd>{submission.data[key]}</dd>
                </div>
              ))}
            </dl>
            {submission.status === "new" && (
              <footer className="panel-action-row">
                <Button disabled={review.isPending} onClick={() => review.mutate(submission._id)}>
                  {review.isPending && review.variables === submission._id ? "Marking reviewed…" : "Mark reviewed"}
                </Button>
                {review.isError && review.variables === submission._id && (
                  <p className="panel-feedback error-text" role="alert">{review.error.message}</p>
                )}
              </footer>
            )}
          </article>
        ))}
      </div>
    </>
  );
}
