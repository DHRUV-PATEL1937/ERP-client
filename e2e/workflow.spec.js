import { test, expect } from "@playwright/test";
async function login(page) {
  await page.goto("/");
  await page.getByLabel("Email address").fill("e2e@harvest.test");
  await page
    .getByLabel("Password", { exact: true })
    .fill("Test-Only-Password-123");
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(page.locator(".metrics")).toBeVisible();
}
async function nav(page, name) {
  await page
    .locator("aside nav")
    .getByRole("link", { name, exact: true })
    .click();
}
async function pick(page, label, option) {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name: option }).click();
}
async function confirm(page) {
  await page
    .getByRole("button", { name: "Confirm action", exact: true })
    .click();
}

test("customer order, procurement, invoice and payment work end to end", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  await page.screenshot({
    path: "../docs/dashboard-desktop.png",
    fullPage: true,
    animations: "disabled",
  });
  await nav(page, "Clients");
  await page.getByRole("button", { name: "New client" }).click();
  await page.getByLabel("Client name").fill("E2E Kitchen");
  await page.getByRole("button", { name: "Save record" }).click();
  await expect(
    page.getByRole("cell", { name: "E2E Kitchen", exact: true }),
  ).toBeVisible();
  await nav(page, "Orders");
  await page.getByRole("button", { name: "New order", exact: true }).click();
  await pick(page, "Client *", "E2E Kitchen");
  await pick(page, "Product", /Heirloom tomatoes/);
  await page.getByLabel(/^Quantity/).fill("2");
  await page.getByRole("button", { name: "Create order", exact: true }).click();
  await page.getByRole("button", { name: "Confirm document" }).click();
  await confirm(page);
  await expect(
    page.getByRole("button", { name: "Fulfill order" }),
  ).toBeVisible();
  await nav(page, "Purchase orders");
  await page.getByRole("button", { name: "New purchase order" }).click();
  await pick(page, "Supplier *", "Valley Fresh Farms");
  await pick(page, "Product", /Heirloom tomatoes/);
  await page.getByLabel(/^Quantity/).fill("10");
  await page.getByRole("button", { name: "Create purchase order" }).click();
  await page.getByRole("button", { name: "Confirm document" }).click();
  await confirm(page);
  await page.getByRole("button", { name: "Receive goods" }).click();
  await page.getByRole("spinbutton").fill("10");
  await confirm(page);
  await expect(page.locator(".badge.received")).toBeVisible();
  await nav(page, "Orders");
  await page
    .getByRole("row")
    .filter({ hasText: "E2E Kitchen" })
    .getByRole("link")
    .click();
  await page.getByRole("button", { name: "Fulfill order" }).click();
  await confirm(page);
  await expect(page.locator(".badge.fulfilled")).toBeVisible();
  await page.getByRole("button", { name: "Create / view invoice" }).click();
  await confirm(page);
  await page.getByRole("button", { name: "Record payment" }).click();
  await page.getByLabel("Payment amount").fill("170");
  await confirm(page);
  await expect(page.locator(".badge.paid")).toBeVisible();
  await nav(page, "Inventory");
  await expect(
    page.getByRole("cell", { name: "8", exact: true }),
  ).toBeVisible();
  await nav(page, "Orders");
  await page
    .getByRole("row")
    .filter({ hasText: "E2E Kitchen" })
    .getByRole("link")
    .click();
  await page
    .getByRole("link", { name: "Heirloom tomatoes", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Heirloom tomatoes", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Recent stock movements" }),
  ).toBeVisible();
  const photo=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=','base64');
  await page.getByLabel('Product photo').setInputFiles({name:'test-product.png',mimeType:'image/png',buffer:photo});
  await page.getByRole('button',{name:'Save photo'}).click();await expect(page.locator('.product-image-preview img')).toBeVisible();
  await nav(page, "Overview");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".metrics")).toBeVisible();
  await page.screenshot({
    path: "../docs/dashboard-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", 390);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page
      .locator("aside nav")
      .getByRole("link", { name: "Products", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("every reference module renders and operational lists support sorting and columns", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  const names = [
    "Applications",
    "Orders",
    "Consolidated demand",
    "Buying Windows",
    "Purchase orders",
    "Products",
    "Categories",
    "Photos to review",
    "Inventory",
    "Stock movements",
    "Freshness",
    "Our Harvest",
    "Clients",
    "Quotes",
    "Weekly Pricing",
    "Recurring Orders",
    "Credit on Account",
    "Suppliers",
    "Supplier catalogue",
    "Customer invoices",
    "Vendor invoices",
    "What We Owe",
    "Expenses",
    "Profit and Loss",
    "Weekly Margin",
    "BAS worksheet",
    "Analytics",
    "Daily Report",
    "Weekly Report",
    "Employees",
    "Timesheets",
    "Pay Rates",
    "Users & roles",
    "Handbook",
    "Handbook articles",
    "Settings",
  ];
  for (const name of names) {
    await nav(page, name);
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator("main .spin")).toHaveCount(0);
    await expect(page.locator("main [role=alert]")).toHaveCount(0);
  }
  await nav(page, "Orders");
  await page.getByRole("button", { name: /CLIENT/ }).click();
  await expect(page.locator('th[aria-sort="ascending"]')).toHaveCount(1);
  await page
    .getByRole("checkbox", { name: "Select all rows on this page" })
    .check();
  await expect(
    page.getByRole("button", { name: "Export selected" }),
  ).toBeEnabled();
  await page.getByText("Columns", { exact: true }).click();
  await page.getByRole("checkbox", { name: "DATE", exact: true }).uncheck();
  await expect(
    page.getByRole("columnheader", { name: "DATE", exact: true }),
  ).toHaveCount(0);
  await page.screenshot({ path: "../docs/orders-refined.png", fullPage: true });
  await page.getByText("Columns", { exact: true }).click();
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(page.locator(".workspace")).toHaveClass(/sidebar-collapsed/);
  await page.getByRole("button", { name: "Expand sidebar" }).click();
  await nav(page, "Applications");
  await expect(page.locator(".applications")).toBeVisible();
  await page.screenshot({ path: "../docs/applications.png", fullPage: true });
  expect(errors).toEqual([]);
});

test("buying windows raise connected supplier purchases from demand", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  await nav(page, "Orders");
  await page.getByRole("button", { name: "New order", exact: true }).click();
  await pick(page, "Client *", "The Green Table");
  await pick(page, "Product", /Heirloom tomatoes/);
  await page.getByLabel(/^Quantity/).fill("20");
  await page.getByRole("button", { name: "Create order", exact: true }).click();
  await page.getByRole("button", { name: "Confirm document" }).click();
  await confirm(page);
  await nav(page, "Supplier catalogue");
  await page.getByRole("button", { name: "New supplier offer" }).click();
  await pick(page, "Product *", /Heirloom tomatoes/);
  await pick(page, "Supplier *", "Valley Fresh Farms");
  await page.getByLabel("Price per base unit *").fill("48");
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Heirloom tomatoes", exact: true }),
  ).toBeVisible();
  await nav(page, "Buying Windows");
  await page.getByRole("button", { name: "New buying window" }).click();
  await page.getByLabel("Window name *").fill("E2E procurement");
  const today = new Date().toISOString().slice(0, 10);
  await page.getByLabel("Delivery period starts *").fill(today);
  await page.getByLabel("Delivery period ends *").fill(today);
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "E2E procurement", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Consolidated delivery demand" }),
  ).toBeVisible();
  await page.screenshot({ path: "../docs/buying-window.png", fullPage: true });
  await page.getByRole("button", { name: "Raise purchase orders" }).click();
  await confirm(page);
  await expect(
    page.getByRole("heading", { name: "Linked purchase orders" }),
  ).toBeVisible();
  await page
    .locator(".related-pill")
    .filter({ hasText: "Valley Fresh Farms" })
    .click();
  await expect(
    page.getByRole("button", { name: "Confirm document" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("harvest and customer credit forms persist connected records", async ({
  page,
}) => {
  await login(page);
  await nav(page, "Our Harvest");
  await page.getByRole("button", { name: "New harvest" }).click();
  await page.getByLabel("Batch / harvest name *").fill("E2E field harvest");
  await pick(page, "Product *", /Heirloom tomatoes/);
  await page
    .getByLabel("Harvest date *")
    .fill(new Date().toISOString().slice(0, 10));
  await page.getByLabel("Harvested quantity (base units) *").fill("3");
  await page.getByLabel("Cost per base unit *").fill("40");
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await page.getByRole("button", { name: "Post to inventory" }).click();
  await confirm(page);
  await expect(page.locator(".badge.posted")).toBeVisible();
  await nav(page, "Credit on Account");
  await page.getByRole("button", { name: "Add credit", exact: true }).click();
  await pick(page, "Client", "The Green Table");
  await page.getByLabel("Amount", { exact: true }).fill("50");
  await page.getByRole("button", { name: "Record transaction" }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "The Green Table" }),
  ).toContainText("50.00");
  await page
    .getByRole("row")
    .filter({ hasText: "The Green Table" })
    .getByRole("button", { name: "History", exact: true })
    .click();
  await expect(
    page.getByRole("cell", { name: "credit", exact: true }),
  ).toBeVisible();
});

test("effective pricing, recurrence and approved timesheets work through their forms", async ({
  page,
}) => {
  await login(page);
  await nav(page, "Employees");
  await page.getByRole("button", { name: "New employee" }).click();
  await page.getByLabel("Full name *").fill("E2E Grower");
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "E2E Grower", exact: true }),
  ).toBeVisible();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10),
    today = new Date().toISOString().slice(0, 10);
  await nav(page, "Pay Rates");
  await page.getByRole("button", { name: "New pay rate" }).click();
  await pick(page, "Employee *", "E2E Grower");
  await page.getByLabel("Effective from *").fill(yesterday);
  await page.getByLabel("Hourly rate *").fill("200");
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "E2E Grower", exact: true }),
  ).toBeVisible();
  await nav(page, "Timesheets");
  await page.getByRole("button", { name: "New timesheet" }).click();
  await pick(page, "Employee *", "E2E Grower");
  await page.getByLabel("Shift starts *").fill(yesterday + "T08:00");
  await page.getByLabel("Shift ends *").fill(yesterday + "T16:00");
  await page.getByLabel("Unpaid break (minutes) *").fill("30");
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await page
    .getByRole("row")
    .filter({ hasText: "E2E Grower" })
    .getByRole("link")
    .click();
  await page.getByRole("button", { name: "Approve timesheet" }).click();
  await confirm(page);
  await expect(page.locator(".badge.approved")).toBeVisible();
  await nav(page, "Weekly Pricing");
  await page.getByRole("button", { name: "New price rule" }).click();
  await pick(page, "Product *", /Heirloom tomatoes/);
  await pick(page, "Client (optional)", "The Green Table");
  await page.getByLabel("Effective from *").fill(today);
  await page.getByLabel("Effective through *").fill(today);
  await page.getByLabel("Selling price per base unit *").fill("80");
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(
    page.getByRole("cell", { name: "Heirloom tomatoes", exact: true }),
  ).toBeVisible();
  await nav(page, "Recurring Orders");
  await page.getByRole("button", { name: "New recurring order" }).click();
  await page.getByLabel("Schedule name *").fill("E2E weekly kitchen");
  await pick(page, "Client *", "The Green Table");
  await page.getByLabel("First / next delivery date *").fill(today);
  await pick(page, "Product", /Heirloom tomatoes/);
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await page.getByRole("button", { name: "Generate due order" }).click();
  await confirm(page);
  await expect(
    page.getByRole("button", { name: "Confirm document" }),
  ).toBeVisible();
  await expect(page.locator(".document-totals")).toContainText("80.00");
});
