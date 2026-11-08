import { lazy, Suspense } from "react";
import { createBrowserRouter, Link } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import Shell from "../components/layout/Shell";
import LoginPage from "../features/auth/LoginPage";
const CustomerPortalPage = lazy(() => import("../features/customer/CustomerPortalPage"));
const PublicSitePage = lazy(() => import("../features/public/PublicSitePage"));
const SubmissionsPage = lazy(() => import("../features/public/SubmissionsPage"));
const DashboardPage = lazy(() => import("../features/dashboard/DashboardPage"));
const ResourcePage=lazy(()=>import("../features/resources/ResourcePage"));
import { configs } from "../features/resources/config";
const DocumentPage=lazy(()=>import("../features/orders/DocumentPage"));
import DemandPage from "../features/orders/DemandPage";

import SettingsPage from "../features/administration/SettingsPage";
const UsersPage=lazy(()=>import("../features/administration/UsersPage"));
import HandbookPage from "../features/administration/HandbookPage";
import { operationConfigs } from "../features/operations/config";
import ApplicationsPage from "../features/administration/ApplicationsPage";
const DocumentEditorPage=lazy(()=>import("../features/orders/DocumentEditorPage"));
const RelatedRecordPage=lazy(()=>import("../features/resources/RelatedRecordPage"));
const OperationsPage = lazy(
  () => import("../features/operations/OperationsPage"),
);
const OperationDetailPage = lazy(
  () => import("../features/operations/OperationDetailPage"),
);
const CreditsPage = lazy(() => import("../features/finance/CreditsPage"));
const FinancialReportPage = lazy(
  () => import("../features/reports/FinancialReportPage"),
);
const lazyScreen = (Component, { key, ...props } = {}) => (
  <Suspense fallback={<div className="state">Loading application...</div>}>
    <Component key={key} {...props} />
  </Suspense>
);
export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/order", element: lazyScreen(CustomerPortalPage) },
  { path: "/customer", element: lazyScreen(CustomerPortalPage) },
  { path: "/ordering", element: lazyScreen(PublicSitePage) },
  { path: "/market/*", element: lazyScreen(PublicSitePage) },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <Shell />,
        children: [
          { path: "apps", element: <ApplicationsPage /> },
          { path: "submissions", element: lazyScreen(SubmissionsPage) },
          { path: "new/:resource", element: lazyScreen(DocumentEditorPage) },
          { path: "edit/:id", element: lazyScreen(DocumentEditorPage) },
          { path: "records/:resource/:id", element: lazyScreen(RelatedRecordPage) },
          {
            path: "work/:resource/:id",
            element: lazyScreen(OperationDetailPage),
          },
          { path: "credits", element: lazyScreen(CreditsPage) },
          ...Object.keys(operationConfigs).map((resource) => ({
            path: resource,
            element: lazyScreen(OperationsPage, { key: resource, resource }),
          })),
          ...[
            ["what-we-owe", "owe"],
            ["profit-and-loss", "pnl"],
            ["weekly-margin", "margin"],
            ["daily-report", "daily"],
            ["weekly-report", "weekly"],
            ["bas-worksheet", "bas"],
          ].map(([path, view]) => ({
            path,
            element: lazyScreen(FinancialReportPage, { key: view, view }),
          })),
          {
            index: true,
            element: (
              <Suspense
                fallback={<div className="state">Loading overview...</div>}
              >
                <DashboardPage />
              </Suspense>
            ),
          },
          ...Object.keys(configs).map((resource) => ({
            path: resource,
            element: lazyScreen(ResourcePage,{key:resource,resource}),
          })),
          { path: "documents/:id", element: lazyScreen(DocumentPage) },
          { path: "demand", element: <DemandPage /> },
          { path: "reports", element: lazyScreen(FinancialReportPage) },
          { path: "settings", element: <SettingsPage /> },
          { path: "users", element: lazyScreen(UsersPage) },
          { path: "handbook", element: <HandbookPage /> },
          {
            path: "*",
            element: (
              <div className="state">
                <h1>Page not found</h1>
                <Link to="/">Return to overview</Link>
              </div>
            ),
          },
        ],
      },
    ],
  },
]);
