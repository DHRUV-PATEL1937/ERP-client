import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button, Field } from "../ui";
export default function ResourceForm({ config, initial, onSave, onClose }) {
  const [error, setError] = useState("");
  const defaults = {
    ...(initial || {
      unit: "kg",
      price: 0,
      cost: 0,
      reorderLevel: 10,
      date: new Date().toISOString().slice(0, 10),
    }),
  };
  for (const [key, , type] of config.fields)
    if (type === "money") defaults[key] = (defaults[key] || 0) / 100;
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    defaultValues: defaults,
  });
  return (
    <form
      data-dirty={isDirty && !isSubmitting ? "true" : "false"}
      onSubmit={handleSubmit(async (values) => {
        try {
          setError("");
          const data = Object.fromEntries(
            config.fields.map(([key, , type]) => [
              key,
              type === "money"
                ? Math.round(Number(values[key] || 0) * 100)
                : type === "number"
                  ? Number(values[key] || 0)
                  : type === "date"
                    ? new Date(values[key]).toISOString()
                    : values[key] || "",
            ]),
          );
          await onSave(data);
        } catch (e) {
          setError(e.message);
        }
      })}
    >
      <div className="form-grid">
        {config.fields.map(([key, label, type, required]) => (
          <Field
            key={key}
            label={`${label}${required ? " *" : ""}`}
            error={errors[key]?.message}
          >
            {type === "unit" ? (
              <select {...register(key)}>
                {["kg", "g", "piece", "bunch", "box", "bag", "pack", "punnet"].map((u) => (
                  <option key={u}>{u}</option>
                ))}
              </select>
            ) : type === "textarea" ? (
              <textarea {...register(key)} />
            ) : (
              <input
                type={type === "money" ? "number" : type}
                min={["number", "money"].includes(type) ? 0 : undefined}
                step={
                  type === "money" ? "0.01" : type === "number" ? 1 : undefined
                }
                {...register(key, {
                  required: required ? "This field is required" : false,
                  min:
                    type === "number"
                      ? { value: 0, message: "Must be zero or greater" }
                      : undefined,
                })}
              />
            )}
          </Field>
        ))}
      </div>
      <p className="muted">
        Enter money in the current default currency, for example 12.50.
      </p>
      {error && (
        <p className="error-text" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : "Save record"}
        </Button>
      </div>
    </form>
  );
}
