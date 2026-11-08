import {
  LayoutDashboard,
  ShoppingBasket,
  CalendarRange,
  Truck,
  Boxes,
  Package,
  Users,
  Store,
  FileText,
  Receipt,
  ChartNoAxesCombined,
  BookOpen,
  Settings,
  Leaf,
  Layers,
  Repeat,
  Wallet,
  Clock,
  Coins,
  Activity,
  Percent,
  ClipboardList,
  Grid2X2,
} from "lucide-react";
export const navigation = [
  [
    "Overview",
    [
      ["Overview", "/", LayoutDashboard],
      ["Applications", "/apps", Grid2X2],
    ],
  ],
  [
    "Operations",
    [
      ["Orders", "/orders", ShoppingBasket],
      ["Consolidated demand", "/demand", Layers],
      ["Buying Windows", "/buying-windows", CalendarRange],
      ["Purchase orders", "/purchase-orders", Truck],
    ],
  ],
  [
    "Products & inventory",
    [
      ["Products", "/products", Package],
      ["Categories", "/categories", Layers],
      ["Photos to review", "/photo-review", Package],
      ["Inventory", "/inventory", Boxes],
      ["Stock movements", "/stock-movements", Activity],
      ["Freshness", "/freshness", Leaf],
      ["Our Harvest", "/harvest", Leaf],
    ],
  ],
  [
    "Sales",
    [
      ["Clients", "/customers", Users],
      ["Quotes", "/quotes", FileText],
      ["Weekly Pricing", "/pricing", Coins],
      ["Recurring Orders", "/recurring-orders", Repeat],
      ["Credit on Account", "/credits", Wallet],
    ],
  ],
  [
    "Purchasing",
    [
      ["Suppliers", "/suppliers", Store],
      ["Supplier catalogue", "/supplier-offers", ClipboardList],
    ],
  ],
  [
    "Finance",
    [
      ["Customer invoices", "/invoices", Receipt],
      ["Vendor invoices", "/vendor-invoices", FileText],
      ["What We Owe", "/what-we-owe", Wallet],
      ["Expenses", "/expenses", Receipt],
      ["Profit and Loss", "/profit-and-loss", ChartNoAxesCombined],
      ["Weekly Margin", "/weekly-margin", Percent],
      ["BAS worksheet", "/bas-worksheet", ClipboardList],
    ],
  ],
  [
    "Reporting",
    [
      ["Analytics", "/reports", ChartNoAxesCombined],
      ["Daily Report", "/daily-report", CalendarRange],
      ["Weekly Report", "/weekly-report", CalendarRange],
    ],
  ],
  [
    "People",
    [
      ["Employees", "/employees", Users],
      ["Timesheets", "/timesheets", Clock],
      ["Pay Rates", "/pay-rates", Coins],
    ],
    true,
  ],
  [
    "Administration",
    [
      ["Users & roles", "/users", Users, true],
      ["Handbook", "/handbook", BookOpen],
      ["Handbook articles", "/articles", FileText],
      ["Settings", "/settings", Settings],
      ["Trade applications", "/submissions", ClipboardList],
    ],
  ],
];
