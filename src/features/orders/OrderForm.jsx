import { useState, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import LookupSelect from "../../components/forms/LookupSelect";
import { money } from "../../lib/format";
import { useAuth } from "../../app/providers";
import { Button, Field } from "../../components/ui";
import { useUnsavedChanges } from "../../hooks/useUnsavedChanges";
export default function OrderForm({ config, initial = {}, onSave, onClose }) {
  const [error, setError] = useState(""),
    [committed, setCommitted] = useState(false),
    [productInfo, setProductInfo] = useState(
      Object.fromEntries(
        (initial.lines || []).map((l) => [
          l.product,
          { label: l.name, price: l.price, cost: l.price, unit: l.unit },
        ]),
      ),
    );
  const key = useRef(crypto.randomUUID());
  const { session } = useAuth();
  const {
    register,
    control,
    watch,
    setValue,
    handleSubmit,
    formState: { isDirty, isSubmitting },
  } = useForm({
    defaultValues: {
      contact: initial.contact || "",
      lines: initial.lines?.map((l) => ({
        ...l,
        price: (l.price || 0) / 100,
      })) || [{ product: "", quantity: 1, price: 0 }],
      deliveryDate:
        initial.deliveryDate?.slice(0, 10) ||
        new Date().toISOString().slice(0, 10),
      dueDate: initial.dueDate?.slice(0, 10) || "",
      notes: initial.notes || "",
    },
  });
  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const lines = watch("lines");
  const { guard, warning } = useUnsavedChanges(isDirty && !committed);
  return (
    <>
      <form
        onSubmit={handleSubmit(async (values) => {
          try {
            setError("");
            if (!values.contact || values.lines.some((l) => !l.product)) {
              setError("Select a contact and a product for every line.");
              return;
            }
            const body = {
              contact: values.contact,
              notes: values.notes,
              lines: values.lines.map((l) => ({
                product: l.product,
                quantity: Number(l.quantity),
                ...(config.supplier
                  ? { price: Math.round(Number(l.price) * 100) }
                  : {}),
              })),
              deliveryDate: `${values.deliveryDate}T00:00:00.000Z`,
              ...(values.dueDate
                ? { dueDate: `${values.dueDate}T23:59:59.999Z` }
                : {}),
            };
            setCommitted(true);
            await onSave(body, key.current);
          } catch (e) {
            setCommitted(false);
            setError(e.message);
          }
        })}
      >
        <section className="form-section-block">
          <h2>
            {config.supplier ? "Supplier & delivery" : "Client & delivery"}
          </h2>
          <div className="form-grid">
            <Field label={config.supplier ? "Supplier *" : "Client *"}>
              <LookupSelect
                resource={config.supplier ? "suppliers" : "customers"}
                label={config.supplier ? "Supplier" : "Client"}
                required
                value={watch("contact")}
                initialLabel={initial.contactName}
                onChange={(v) => setValue("contact", v, { shouldDirty: true })}
              />
            </Field>
            <Field label="Delivery date *">
              <input
                type="date"
                required
                {...register("deliveryDate", { required: true })}
              />
            </Field>
            <Field
              label={
                config.singular === "quote"
                  ? "Quote expires"
                  : "Payment due (optional)"
              }
            >
              <input type="date" {...register("dueDate")} />
            </Field>
          </div>
        </section>
        <section className="form-section-block">
          <h2>Product lines</h2>
          <p className="muted">
            Use the product base unit. Sales prices are resolved by the server
            for the delivery date, including customer-specific price rules.
          </p>
          {fields.map((field, i) => (
            <div
              className={`order-line ${config.supplier ? "purchase-line" : ""}`}
              key={field.id}
            >
              <Field label="Product">
                <LookupSelect
                  resource="products"
                  label="Product"
                  required
                  value={watch(`lines.${i}.product`)}
                  initialLabel={productInfo[watch(`lines.${i}.product`)]?.label}
                  onChange={(v, row) => {
                    setValue(`lines.${i}.product`, v, { shouldDirty: true });
                    setValue(`lines.${i}.price`, (row?.cost || 0) / 100, {
                      shouldDirty: true,
                    });
                    setProductInfo((p) => ({ ...p, [v]: row }));
                  }}
                />
              </Field>
              <Field
                label={`Quantity${productInfo[watch(`lines.${i}.product`)]?.unit ? " (" + productInfo[watch(`lines.${i}.product`)].unit + ")" : ""}`}
              >
                <input
                  type="number"
                  required
                  min="0.001"
                  max="1000000"
                  step="0.001"
                  {...register(`lines.${i}.quantity`, {
                    required: true,
                    min: 0.001,
                  })}
                />
              </Field>
              {config.supplier && (
                <Field label="Unit price">
                  <input
                    type="number"
                    min="0"
                    max="1000000"
                    step="0.01"
                    required
                    {...register(`lines.${i}.price`)}
                  />
                </Field>
              )}
              <button
                type="button"
                className="icon-button"
                disabled={fields.length === 1}
                aria-label="Remove product line"
                onClick={() => remove(i)}
              >
                <Trash2 size={17} />
              </button>
            </div>
          ))}
          <Button
            type="button"
            variant="secondary small"
            onClick={() => append({ product: "", quantity: 1, price: 0 })}
          >
            <Plus size={15} /> Add product
          </Button>
        </section>
        <div className="order-estimate">
          <span>Catalogue estimate</span>
          <strong>
            {money(
              lines.reduce(
                (sum, line) =>
                  sum +
                  Math.round(
                    (config.supplier
                      ? Number(line.price || 0) * 100
                      : productInfo[line.product]?.price || 0) *
                      Number(line.quantity || 0),
                  ),
                0,
              ),
              session.organization,
            )}
          </strong>
        </div>
        <p className="muted">
          The saved total is authoritative and may differ when an effective
          price rule applies.
        </p>
        <Field label="Delivery / internal notes">
          <textarea {...register("notes")} />
        </Field>
        {error && (
          <p role="alert" className="error-text">
            {error}
          </p>
        )}
        <div className="dialog-actions">
          <Button
            type="button"
            disabled={isSubmitting}
            variant="secondary"
            onClick={() => guard(onClose)}
          >
            Cancel
          </Button>
          <Button disabled={isSubmitting}>
            {isSubmitting
              ? "Saving..."
              : initial._id
                ? "Save draft"
                : `Create ${config.singular}`}
          </Button>
        </div>
      </form>
      {warning}
    </>
  );
}
