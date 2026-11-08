import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./providers";
export default function ProtectedRoute() {
  return useAuth().session ? <Outlet /> : <Navigate to="/login" replace />;
}
