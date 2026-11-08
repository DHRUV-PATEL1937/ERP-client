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
  Settings,
  Leaf,
  Layers,
  Coins,
} from "lucide-react";

export const navigation = [
  ["Today", [
    ["Dashboard", "/", LayoutDashboard],
    ["Buying window", "/buying-windows", CalendarRange],
  ]],
  ["Buy", [
    ["Purchase orders", "/purchase-orders", Truck],
  ]],
  ["Sell", [
    ["Orders", "/orders", ShoppingBasket],
    ["Clients", "/customers", Users],
    ["Quotes", "/quotes", FileText],
    ["Weekly pricing", "/pricing", Coins],
    ["Invoices", "/invoices", Receipt],
  ]],
  ["Catalogue", [
    ["Products", "/products", Package],
    ["Categories", "/categories", Layers],
    ["Suppliers", "/suppliers", Store],
    ["Inventory", "/inventory", Boxes],
    ["Freshness", "/freshness", Leaf],
  ]],
  ["Produce", [
    ["Our harvest", "/produce", Leaf],
  ]],
  ["Insight", [
    ["Analytics", "/reports", ChartNoAxesCombined],
    ["Daily report", "/daily-report", CalendarRange],
    ["Weekly report", "/weekly-report", CalendarRange],
  ]],
  ["Admin", [
    ["Settings", "/settings", Settings],
    ["Users", "/users", Users, true],
  ]],
];
