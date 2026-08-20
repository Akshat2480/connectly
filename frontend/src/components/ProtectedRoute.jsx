import { useAuth } from "../context/AuthContext";
import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute() {
  const { isAuthed, authChecked } = useAuth();

  if (!authChecked) return null;
  if (!isAuthed) return <Navigate to="/login" replace />;

  return <Outlet />;
}
