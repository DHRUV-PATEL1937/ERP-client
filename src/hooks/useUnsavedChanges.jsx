import { useState, useEffect } from "react";
import { useBlocker } from "react-router-dom";
import { Dialog, Button } from "../components/ui";
export function useUnsavedChanges(dirty) {
  const blocker = useBlocker(Boolean(dirty));
  const [pending, setPending] = useState(null);
  useEffect(() => {
    if (!dirty) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  const guard = (fn) => {
    if (dirty) setPending(() => fn);
    else fn();
  };
  const dismiss = () => {
    setPending(null);
    if (blocker.state === "blocked") blocker.reset();
  };
  const proceed = () => {
    const fn = pending;
    setPending(null);
    if (blocker.state === "blocked") blocker.proceed();
    else fn?.();
  };
  const warning =
    pending || blocker.state === "blocked" ? (
      <Dialog title="Discard unsaved changes?" onClose={dismiss}>
        <p>
          Your changes have not been saved. Stay here to continue editing, or
          discard them.
        </p>
        <div className="dialog-actions">
          <Button variant="secondary" onClick={dismiss}>
            Keep editing
          </Button>
          <Button variant="danger" onClick={proceed}>
            Discard changes
          </Button>
        </div>
      </Dialog>
    ) : null;
  return { guard, warning };
}
