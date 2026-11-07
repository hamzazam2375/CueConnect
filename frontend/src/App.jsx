import { lazy, Suspense, useEffect } from "react";
import { useDispatch } from "react-redux";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { fetchCurrentUser } from "./store/authSlice";
import Home from "./pages/Home";
import ProtectedRoute from "./components/ProtectedRoute";
import PageLoader from "./components/PageLoader";
import ScrollToTop from "./components/ScrollToTop";

// pages load on demand; the landing page stays in the main bundle
// the client layout carries the real-time socket, so visitors to the landing page never download it
const ClientLayout = lazy(() => import("./components/ClientLayout"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminSignup = lazy(() => import("./pages/AdminSignup"));
const AdminSignupComplete = lazy(() => import("./pages/AdminSignupComplete"));
const ClientLogin = lazy(() => import("./pages/ClientLogin"));
const ClientSignup = lazy(() => import("./pages/ClientSignup"));
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const ClientBooking = lazy(() => import("./pages/ClientBooking"));
const ClientTableSelection = lazy(() => import("./pages/ClientTableSelection"));
const ClientScheduleSelection = lazy(() => import("./pages/ClientScheduleSelection"));
const ClientBookingReview = lazy(() => import("./pages/ClientBookingReview"));
const ClientBookings = lazy(() => import("./pages/ClientBookings"));
const ClientBookingReschedule = lazy(() => import("./pages/ClientBookingReschedule"));
const ClientBookingTableChange = lazy(() => import("./pages/ClientBookingTableChange"));
const ClientProfile = lazy(() => import("./pages/ClientProfile"));
const ClientMemberships = lazy(() => import("./pages/ClientMemberships"));
const ClientMembershipReview = lazy(() => import("./pages/ClientMembershipReview"));
const ClientMembershipPayment = lazy(() => import("./pages/ClientMembershipPayment"));
const ClientMembershipHistory = lazy(() => import("./pages/ClientMembershipHistory"));
const ClientLoyalty = lazy(() => import("./pages/ClientLoyalty"));
const ClientEvents = lazy(() => import("./pages/ClientEvents"));
const ClientEventRegister = lazy(() => import("./pages/ClientEventRegister"));
const ClientHistory = lazy(() => import("./pages/ClientHistory"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const TableManagement = lazy(() => import("./pages/TableManagement"));
const AdminGames = lazy(() => import("./pages/AdminGames"));
const AdminBilling = lazy(() => import("./pages/AdminBilling"));
const AdminCustomers = lazy(() => import("./pages/AdminCustomers"));
const AdminFinance = lazy(() => import("./pages/AdminFinance"));
const AdminSettings = lazy(() => import("./pages/AdminSettings"));
const NotFound = lazy(() => import("./pages/NotFound"));

export default function App() {
    const dispatch = useDispatch();

    useEffect(() => {
        dispatch(fetchCurrentUser());
    }, [dispatch]);

    return (
        <BrowserRouter>
            <ScrollToTop />
            <Suspense fallback={<PageLoader />}>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<ClientLogin />} />
                    <Route path="/register" element={<ClientSignup />} />
                    <Route element={<ProtectedRoute allowedRoles={["client"]} />}>
                        <Route element={<ClientLayout />}>
                            <Route path="/client/dashboard" element={<ClientDashboard />} />
                            <Route path="/client/profile" element={<ClientProfile />} />
                            <Route path="/client/memberships" element={<ClientMemberships />} />
                            <Route path="/client/memberships/review" element={<ClientMembershipReview />} />
                            <Route path="/client/memberships/payment" element={<ClientMembershipPayment />} />
                            <Route path="/client/memberships/manage" element={<ClientMembershipHistory />} />
                            <Route path="/client/loyalty" element={<ClientLoyalty />} />
                            <Route path="/client/events" element={<ClientEvents />} />
                            <Route path="/client/events/:eventId" element={<ClientEventRegister />} />
                            <Route path="/client/history" element={<ClientHistory />} />
                            <Route path="/client/book" element={<ClientBooking />} />
                            <Route path="/client/book/table" element={<ClientTableSelection />} />
                            <Route path="/client/book/schedule" element={<ClientScheduleSelection />} />
                            <Route path="/client/book/review" element={<ClientBookingReview />} />
                            <Route path="/client/bookings" element={<ClientBookings />} />
                            <Route path="/client/bookings/:reference/reschedule" element={<ClientBookingReschedule />} />
                            <Route path="/client/bookings/:reference/change-table" element={<ClientBookingTableChange />} />
                        </Route>
                    </Route>
                    <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
                        <Route path="/admin/dashboard" element={<AdminDashboard />} />
                        <Route path="/admin/tables" element={<TableManagement />} />
                        <Route path="/admin/games" element={<AdminGames />} />
                        <Route path="/admin/billing" element={<AdminBilling />} />
                        <Route path="/admin/customers" element={<AdminCustomers />} />
                        <Route path="/admin/finance" element={<AdminFinance />} />
                        <Route path="/admin/settings" element={<AdminSettings />} />
                    </Route>
                    <Route path="/admin/login" element={<AdminLogin />} />
                    <Route path="/admin/register" element={<AdminSignup />} />
                    <Route path="/admin/register/complete" element={<AdminSignupComplete />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    );
}
