import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui";
import { api } from "../../lib/api";

export default function PortalAccess({ id }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const endpoint = `/customers/${id}/portal`;

  useEffect(() => {
    let active = true;
    api(endpoint).then(
      response => { if (active) setData(response.data); },
      failure => { if (active) setError(failure.message); },
    );
    return () => { active = false; };
  }, [endpoint]);

  async function save(generateCode = false) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { data: saved } = await api(endpoint, {
        method: "PATCH",
        body: { enabled: data.enabled, showPrices: data.showPrices, generateCode },
      });
      setData({
        enabled: saved.enabled,
        showPrices: saved.showPrices,
        hasCode: data.hasCode || Boolean(saved.code),
      });
      setCode(saved.code || "");
      setNotice("Portal settings saved. Existing customer sessions have been revoked.");
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel portal-access" aria-labelledby="portal-access-title">
      <header className="panel-head portal-access-header">
        <div>
          <h2 id="portal-access-title">Portal ordering</h2>
          <p>Manage this client’s ordering access and price visibility.</p>
        </div>
        <Link className="button secondary" to="/order">Open ordering portal</Link>
      </header>

      <div className="portal-access-body">
        {!data && !error && <p role="status">Loading portal settings…</p>}
        {data && (
          <fieldset className="portal-access-options" disabled={busy} aria-label="Ordering preferences">
            <label className="portal-access-option">
              <input type="checkbox" checked={data.enabled} onChange={event => setData({ ...data, enabled: event.target.checked })} />
              <span>
                <strong>Allow ordering by code</strong>
                <small>{data.hasCode ? "An ordering code has been generated for this client." : "Generate an ordering code to give this client access."}</small>
              </span>
            </label>
            <label className="portal-access-option">
              <input type="checkbox" checked={data.showPrices !== false} onChange={event => setData({ ...data, showPrices: event.target.checked })} />
              <span>
                <strong>Show agreed prices</strong>
                <small>Hidden prices still apply to orders. Invoices show the final amounts.</small>
              </span>
            </label>
          </fieldset>
        )}
        {error && <p className="panel-feedback error-text" role="alert">{error}</p>}
        {notice && <p className="panel-feedback" role="status">{notice}</p>}
        {code && (
          <div className="panel-feedback portal-access-code" role="status">
            <strong>New ordering code</strong>
            <code>{code}</code>
            <p>Copy this code now and share it securely. It is only displayed once.</p>
          </div>
        )}
      </div>

      {data && (
        <footer className="panel-action-row portal-access-footer">
          <Button disabled={busy} onClick={() => save()}>Save portal settings</Button>
          <Button variant="secondary" disabled={busy} onClick={() => save(true)}>
            {data.hasCode ? "Replace ordering code" : "Generate ordering code"}
          </Button>
          <Link className="portal-pricing-link" to={`/pricing?customer=${id}`}>Manage agreed prices →</Link>
        </footer>
      )}
    </section>
  );
}
