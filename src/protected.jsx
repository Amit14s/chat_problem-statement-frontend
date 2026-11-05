
import { Navigate, Outlet } from "react-router-dom";
import useUserStore from "./store/useUserStore";

export function ProtectedRoute() {
  const user = useUserStore((state) => state.user);

  if (!user?._id) {
    return <Navigate to="/user-login" replace />;
  }

  return <Outlet />;
}

export function PublicRoute() {
  const user = useUserStore((state) => state.user);

  if (user?._id) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
