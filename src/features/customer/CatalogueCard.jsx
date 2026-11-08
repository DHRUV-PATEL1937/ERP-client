import { Minus, Plus } from "lucide-react";
import { money } from "../../lib/format";

export default function CatalogueCard({
  product, photo, icon, quantity, selectedUnit, onUnitChange, onQuantityChange, organization, showPrices,
}) {
  const inputId = "qty-" + product.id;
  const baseLabel = product.unit === "piece" ? "each" : product.unit;
  const options = product.unitOptions?.length
    ? product.unitOptions
    : [{ label: baseLabel, factor: 1 }];
  const unit = options.find(option => option.label === selectedUnit) || options[0];
  const whole = unit.label !== "kg" && unit.label !== "g" && product.referenceSample;
  const displayedQuantity = Number((Number(quantity || 0) / unit.factor).toFixed(6));

  function updateQuantity(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0 || (whole && !Number.isInteger(amount))) return;
    const baseAmount = Math.round(amount * unit.factor * 1000) / 1000;
    if (baseAmount <= 1000000) onQuantityChange(baseAmount);
  }

  return (
    <article className={"customer-product-card" + (quantity > 0 ? " is-selected" : "")}>
      <label htmlFor={inputId}>
        <div className="customer-product-photo">
          {photo ? <img src={photo} alt={product.name} loading="lazy" /> : <span aria-hidden="true">{icon}</span>}
        </div>
        <h3>{product.name}</h3>
      </label>
      {options.length > 1 && (
        <fieldset className="customer-unit-options" aria-label={"Unit for " + product.name}>
          {options.map(option => (
            <label key={option.label} title={!option.factor ? "Conversion needs confirmation" : undefined}>
              <input
                type="radio"
                name={"unit-" + product.id}
                checked={unit.label === option.label}
                disabled={!option.factor}
                onChange={() => onUnitChange(option)}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>
      )}
      <div className="customer-card-bottom">
        <small>per {unit.label}{showPrices ? " · " + money(product.price * unit.factor, organization, product.currency) : ""}</small>
        <div className="customer-quantity">
          {quantity > 0 && (
            <button className="customer-minus" aria-label={"Remove one " + product.name} onClick={() => updateQuantity(Math.max(0, displayedQuantity - 1))}>
              <Minus size={18} />
            </button>
          )}
          <input
            id={inputId}
            aria-label={"Quantity for " + product.name}
            type="number"
            min="0"
            step={whole ? "1" : "0.001"}
            placeholder="0"
            value={displayedQuantity || ""}
            onChange={event => updateQuantity(event.target.value)}
          />
          <button aria-label={"Add one " + product.name} onClick={() => updateQuantity(displayedQuantity + 1)}>
            <Plus size={24} />
          </button>
        </div>
      </div>
    </article>
  );
}
