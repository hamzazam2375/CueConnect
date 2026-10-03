import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import AdminLogin from "./pages/AdminLogin";
import AdminSignup from "./pages/AdminSignup";
import ClientLogin from "./pages/ClientLogin";
import ClientSignup from "./pages/ClientSignup";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<ClientLogin />} />
                <Route path="/register" element={<ClientSignup />} />
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin/register" element={<AdminSignup />} />
            </Routes>
        </BrowserRouter>
    );
}
