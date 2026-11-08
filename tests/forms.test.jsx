import React from "react";
import { describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { afterEach } from "vitest";
import ResourceForm from "../src/components/forms/ResourceForm";
import HandbookPage from "../src/features/administration/HandbookPage";
import { configs } from "../src/features/resources/config";
import { money } from "../src/lib/format";
afterEach(cleanup);
describe("forms and guidance", () => {
  it("validates required product fields before submission", async () => {
    const save = vi.fn();
    render(
      <ResourceForm
        config={configs.products}
        onSave={save}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("Save record"));
    expect(await screen.findAllByText("This field is required")).toHaveLength(
      2,
    );
    expect(save).not.toHaveBeenCalled();
  });
  it("sends numeric product prices and surfaces server errors", async () => {
    const save = vi.fn().mockRejectedValue(new Error("SKU already exists"));
    render(
      <ResourceForm
        config={configs.products}
        initial={{
          name: "Carrot",
          sku: "C1",
          price: 100,
          cost: 80,
          unit: "kg",
          reorderLevel: 2,
        }}
        onSave={save}
        onClose={() => {}}
      />,
    );
    fireEvent.click(screen.getByText("Save record"));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "SKU already exists",
    );
    expect(save.mock.calls[0][0].price).toBe(100);
  });
  it("searches handbook content", () => {
    render(<HandbookPage />);
    fireEvent.change(screen.getByLabelText("Search handbook"), {
      target: { value: "Overpayments" },
    });
    expect(screen.getByText("Invoices & payments")).toBeInTheDocument();
    expect(screen.queryByText("Customer orders")).not.toBeInTheDocument();
  });
  it("formats integer minor units in organization currency", () => {
    expect(money(12345, { currency: "USD", locale: "en-US" })).toBe("$123.45");
  });
});
