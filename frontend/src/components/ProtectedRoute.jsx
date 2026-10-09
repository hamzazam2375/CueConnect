import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

export default function ProtectedRoute({ allowedRoles = [] }) {
    const { user, isInitializing } = useSelector((state) => state.auth);
    const location = useLocation();

    if (isInitializing) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="w-9 h-9 rounded-full border-2 border-white/10 border-t-red-500 animate-spin" aria-label="Checking authentication" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
