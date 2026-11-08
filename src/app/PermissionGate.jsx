import { useAuth } from "./providers";
export default function PermissionGate({ children, admin = false }) {
  const role = useAuth().session?.user.role;
  return (admin ? role === "admin" : ["admin", "manager"].includes(role))
    ? children
    : null;
}
