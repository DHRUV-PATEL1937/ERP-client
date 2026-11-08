import { LoaderCircle, AlertCircle, PackageOpen, X } from "lucide-react";
import { useEffect, useRef, useId, cloneElement, useState } from "react";
export function Button({ children, variant = "", ...props }) {
  return (
    <button className={`button ${variant}`} {...props}>
      {children}
    </button>
  );
}
export function Field({ label, error, children }) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, {
        id,
        "aria-invalid": Boolean(error),
        "aria-describedby": error ? `${id}-error` : undefined,
      })}
      {error && (
        <small id={`${id}-error`} className="error-text">
          {error}
        </small>
      )}
    </div>
  );
}
export function Badge({ value }) {
  return (
    <span className={`badge ${value}`}>{value?.replaceAll("-", " ")}</span>
  );
}
export function Loading() {
  return (
    <div className="state">
      <LoaderCircle className="spin" /> Loading your workspace…
    </div>
  );
}
export function ErrorState({ error, retry }) {
  return (
    <div className="state error-text" role="alert">
      <AlertCircle />
      <p>{error.message}</p>
      {retry && (
        <Button onClick={retry} variant="secondary">
          Try again
        </Button>
      )}
    </div>
  );
}
export function Empty({
  title = "No records yet",
  text = "Create your first record to get started.",
}) {
  return (
    <div className="state">
      <PackageOpen size={36} />
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
export function Dialog({ title, children, onClose }) {
  const ref = useRef();
  const [discard, setDiscard] = useState(false);
  const requestClose = () => {
    if (ref.current?.querySelector('form[data-dirty="true"]')) setDiscard(true);
    else onClose();
  };
  useEffect(() => {
    ref.current.showModal();
    const el = ref.current;
    return () => el.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog"
      onCancel={(e) => {
        e.preventDefault();
        requestClose();
      }}
    >
      <div className="dialog-header">
        <h2>{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={requestClose}
        >
          <X size={20} />
        </button>
      </div>
      {children}
      {discard && (
        <Dialog
          title="Discard unsaved changes?"
          onClose={() => setDiscard(false)}
        >
          <p>Your edits have not been saved.</p>
          <div className="dialog-actions">
            <Button variant="secondary" onClick={() => setDiscard(false)}>
              Keep editing
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setDiscard(false);
                onClose();
              }}
            >
              Discard changes
            </Button>
          </div>
        </Dialog>
      )}
    </dialog>
  );
}
export function PageHeader({
  eyebrow = "WORKSPACE",
  title,
  description,
  children,
}) {
  return (
    <div className="page-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="header-actions">{children}</div>
    </div>
  );
}
