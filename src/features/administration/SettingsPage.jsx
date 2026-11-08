import { useState } from "react";
import { useAuth, useToast } from "../../app/providers";
import PermissionGate from "../../app/PermissionGate";
import { api } from "../../lib/api";
import { PageHeader, Button, Field } from "../../components/ui";
export default function SettingsPage() {
  const { session, setSession } = useAuth();
  const [values, setValues] = useState(session.organization);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <>
      <PageHeader
        eyebrow="MAKE IT YOURS"
        title="Organization settings"
        description="One shared identity for your entire workspace."
      />
      <section className="panel settings-panel">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const body = Object.fromEntries(
                ["name", "currency", "locale", "timezone"].map((k) => [
                  k,
                  values[k],
                ]),
              );
              const { data } = await api("/settings", {
                method: "PATCH",
                body,
              });
              setSession({ ...session, organization: data });
              toast("Settings updated");
              setError("");
            } catch (e) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="form-grid">
            {[
              ["name", "Organization name", null],
              ["currency", "Currency", ["INR", "USD", "AUD", "GBP", "EUR"]],
              ["locale", "Locale", ["en-IN", "en-US", "en-AU", "en-GB"]],
              [
                "timezone",
                "Time zone",
                ["Asia/Kolkata", "UTC", "Australia/Sydney", "Europe/London"],
              ],
            ].map(([key, label, options]) => (
              <Field key={key} label={label}>
                {options ? (
                  <select
                    value={values[key]}
                    onChange={(e) =>
                      setValues({ ...values, [key]: e.target.value })
                    }
                  >
                    {options.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    required
                    value={values[key]}
                    onChange={(e) =>
                      setValues({ ...values, [key]: e.target.value })
                    }
                  />
                )}
              </Field>
            ))}
          </div>
          <p className="muted">
            Changing the currency sets the default for new records. Existing
            transactions keep the currency they were created in. Locale and
            timezone control organization preferences; the sales chart uses UTC.
          </p>
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
          <PermissionGate admin>
            <Button disabled={busy}>
              {busy ? "Saving…" : "Save settings"}
            </Button>
          </PermissionGate>
        </form>
      </section>
    </>
  );
}
