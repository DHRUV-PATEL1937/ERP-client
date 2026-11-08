import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { useAuth, useToast } from "../../app/providers";
import {
  PageHeader,
  Loading,
  ErrorState,
  Button,
  Dialog,
  Field,
  Badge,
} from "../../components/ui";
export default function UsersPage() {
  const { session } = useAuth();
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const client = useQueryClient();
  const {
    data,
    isPending,
    error: loadError,
  } = useQuery({
    queryKey: ["users"],
    queryFn: () => api("/users"),
    enabled: session.user.role === "admin",
  });
  if (session.user.role !== "admin")
    return <ErrorState error={new Error("Administrator access required")} />;
  return (
    <>
      <PageHeader
        eyebrow="YOUR TEAM"
        title="Users & roles"
        description="Give the right people the right access."
      >
        <Button onClick={() => setShow(true)}>Add user</Button>
      </PageHeader>
      <section className="panel">
        {isPending ? (
          <Loading />
        ) : loadError ? (
          <ErrorState error={loadError} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>NAME</th>
                  <th>EMAIL</th>
                  <th>ROLE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((u) => (
                  <tr key={u._id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <Badge value={u.role} />
                    </td>
                    <td>{u.active ? "Active" : "Inactive"}</td>
                    <td>
                      <button
                        className="text-action"
                        onClick={() => {
                          setEditing(u);
                          setError("");
                        }}
                      >
                        Manage access
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {show && (
        <Dialog title="Add team member" onClose={() => setShow(false)}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const values = Object.fromEntries(new FormData(e.currentTarget));
              setBusy(true);
              try {
                await api("/users", { method: "POST", body: values });
                setShow(false);
                client.invalidateQueries({ queryKey: ["users"] });
                toast("Team member created");
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Full name">
              <input name="name" required />
            </Field>
            <Field label="Email">
              <input name="email" type="email" required />
            </Field>
            <Field label="Initial password (12+ characters)">
              <input
                name="password"
                type="password"
                minLength="12"
                required
                autoComplete="new-password"
              />
            </Field>
            <Field label="Role">
              <select name="role">
                <option>viewer</option>
                <option>manager</option>
                <option>admin</option>
              </select>
            </Field>
            {error && (
              <p role="alert" className="error-text">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <Button disabled={busy}>
                {busy ? "Creating…" : "Create user"}
              </Button>
            </div>
          </form>
        </Dialog>
      )}
      {editing && (
        <Dialog
          title={`Manage ${editing.name}`}
          onClose={() => !busy && setEditing(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await api(`/users/${editing._id}`, {
                  method: "PATCH",
                  body: {
                    name: editing.name,
                    role: editing.role,
                    active: editing.active,
                  },
                });
                setEditing(null);
                client.invalidateQueries();
                toast("User access updated");
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Name">
              <input
                required
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
            </Field>
            <Field label="Role">
              <select
                value={editing.role}
                onChange={(e) =>
                  setEditing({ ...editing, role: e.target.value })
                }
              >
                {["admin", "manager", "viewer"].map((role) => (
                  <option key={role}>{role}</option>
                ))}
              </select>
            </Field>
            <Field label="Account status">
              <select
                value={String(editing.active)}
                onChange={(e) =>
                  setEditing({ ...editing, active: e.target.value === "true" })
                }
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </Field>
            <p className="muted">
              Access changes revoke this person's current sessions. At least one
              active administrator must remain.
            </p>
            {error && (
              <p role="alert" className="error-text">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <Button disabled={busy}>Save access</Button>
            </div>
          </form>
        </Dialog>
      )}
      <p className="muted">
        Viewers read records. Managers run operations. Administrators also
        manage users and settings.
      </p>
    </>
  );
}
