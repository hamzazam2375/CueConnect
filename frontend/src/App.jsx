import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { fetchCurrentUser } from "./store/authSlice";
import Home from "./pages/Home";
import AdminLogin from "./pages/AdminLogin";
import AdminSignup from "./pages/AdminSignup";
import ClientLogin from "./pages/ClientLogin";
import ClientSignup from "./pages/ClientSignup";
import ClientDashboard from "./pages/ClientDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(fetchCurrentUser());
    }, [dispatch]);

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<ClientLogin />} />
                <Route path="/register" element={<ClientSignup />} />
                <Route element={<ProtectedRoute allowedRoles={["client"]} />}>
                    <Route path="/client/dashboard" element={<ClientDashboard />} />
                </Route>
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin/register" element={<AdminSignup />} />
            </Routes>
        </BrowserRouter>
    );
}
