import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button, Field } from "../../components/ui";
import LookupSelect from "../../components/forms/LookupSelect";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
export default function OperationForm({
  config,
  initial = {},
  onSave,
  onClose,
}) {
  const [error, setError] = useState(""),
    [committed, setCommitted] = useState(false);
  const defaults = {
    packQuantity: 1,
    minimumQuantity: 1,
    quantity: 1,
    breakMinutes: 0,
    frequency: "weekly",
    lines: [{ product: "", quantity: 1 }],
    ...initial,
  };
  for (const [key, , type] of config.fields) {
    if (type === "money") defaults[key] = (initial[key] || 0) / 100;
    if (type === "date") defaults[key] = initial[key]?.slice(0, 10) || "";
    if (type === "datetime-local" && initial[key]) {
      const d = new Date(initial[key]);
      defaults[key] = new Date(+d - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    }
  }
  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    setError: fieldError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm({ defaultValues: defaults });
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const { guard, warning } = useUnsavedChanges(isDirty && !committed);
  const submit = async (values) => {
    try {
      setError("");
      const body = {};
      let invalid = false;
      for (const [key, , type, required] of config.fields) {
        const raw = values[key];
        if (required && (raw == null || raw === "")) {
          fieldError(key, { message: "This field is required" });
          invalid = true;
          continue;
        }
        if (raw == null || raw === "") {
          if (required) body[key] = "";
          continue;
        }
        body[key] =
          type === "money"
            ? Math.round(Number(raw) * 100)
            : ["number", "quantity"].includes(type)
              ? Number(raw)
              : type === "checkbox"
                ? Boolean(raw)
                : type === "date"
                  ? new Date(
                      `${raw}T${["end", "endDate"].includes(key) ? "23:59:59.999" : "00:00:00.000"}Z`,
                    ).toISOString()
                  : type === "datetime-local"
                    ? new Date(raw).toISOString()
                    : raw;
      }
      if (config.lines) {
        body.lines = values.lines.map((l) => ({
          product: l.product,
          quantity: Number(l.quantity),
        }));
        if (body.lines.some((l) => !l.product || l.quantity <= 0)) {
          setError("Select products and positive quantities for every line");
          return;
        }
      }
      if (invalid) return;
      setCommitted(true);
      await onSave(body);
    } catch (e) {
      setCommitted(false);
      setError(e.message);
    }
  };
  return (
    <>
      <form
        data-dirty={isDirty && !committed ? "true" : "false"}
        onSubmit={handleSubmit(submit)}
      >
        <div className="form-grid">
          {config.fields.map(([key, label, type, required, options]) => (
            <Field
              key={key}
              label={`${label}${required ? " *" : ""}`}
              error={errors[key]?.message}
            >
              {type === "reference" ? (
                <LookupSelect
                  resource={options}
                  label={label}
                  value={watch(key)}
                  initialLabel={initial[`${key}Name`]}
                  required={required}
                  onChange={(v) =>
                    setValue(key, v, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
              ) : type === "textarea" ? (
                <textarea rows={key === "body" ? 12 : 3} {...register(key)} />
              ) : type === "select" ? (
                <select {...register(key)}>
                  {options.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : type === "checkbox" ? (
                <input type="checkbox" {...register(key)} />
              ) : (
                <input
                  type={["money", "quantity"].includes(type) ? "number" : type}
                  min={
                    ["money", "quantity", "number"].includes(type)
                      ? 0
                      : undefined
                  }
                  step={
                    type === "money"
                      ? "0.01"
                      : type === "quantity"
                        ? "0.001"
                        : type === "number"
                          ? 1
                          : undefined
                  }
                  {...register(key, {
                    required: required ? "This field is required" : false,
                  })}
                />
              )}
            </Field>
          ))}
        </div>
        {config.lines && (
          <>
            <h3 className="form-section">Products to repeat</h3>
            {fields.map((line, i) => (
              <div className="order-line" key={line.id}>
                <Field label="Product">
                  <LookupSelect
                    resource="products"
                    label="Product"
                    required
                    value={watch(`lines.${i}.product`)}
                    onChange={(v) =>
                      setValue(`lines.${i}.product`, v, { shouldDirty: true })
                    }
                  />
                </Field>
                <Field label="Quantity">
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    {...register(`lines.${i}.quantity`)}
                  />
                </Field>
                <button
                  type="button"
                  className="icon-button"
                  disabled={fields.length === 1}
                  onClick={() => remove(i)}
                  aria-label="Remove recurring line"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() => append({ product: "", quantity: 1 })}
            >
              <Plus size={15} /> Add product
            </Button>
          </>
        )}
        {config.fields.some((f) => f[2] === "money") && (
          <p className="muted">
            Enter amounts in the current default currency, for example 12.50.
            Quantities use the product’s base unit.
          </p>
        )}
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={() => guard(onClose)}
          >
            Cancel
          </Button>
          <Button disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save record"}
          </Button>
        </div>
      </form>
      {warning}
    </>
  );
}
