import { useEffect, useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { getSession } from "./lib/api";
import { supabase } from "./lib/supabaseClient";

import Landing from "./pages/Landing";
import AdminLogin from "./pages/AdminLogin";
import ResetPassword from "./pages/ResetPassword";
import AdminDashboard from "./pages/AdminDashboard";
import NewVehicle from "./pages/NewVehicle";
import VehicleDetail from "./pages/VehicleDetail";
import ShopSettings from "./pages/ShopSettings";
import TrackVehicle from "./pages/TrackVehicle";

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getSession()
      .then(setSession)
      .finally(() => setLoading(false));

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      // Clicking the emailed reset link lands here with a temporary
      // "recovery" session — send the person straight to the page that
      // lets them set a new password instead of the normal dashboard.
      if (event === "PASSWORD_RECOVERY") {
        navigate("/admin/reset-password");
      }
    });
    return () => listener.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Navbar session={session} />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/track" element={<TrackVehicle />} />
        <Route
          path="/admin/login"
          element={<AdminLogin session={session} onAuthChange={setSession} />}
        />
        <Route path="/admin/reset-password" element={<ResetPassword session={session} />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute session={session} loading={loading}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute session={session} loading={loading}>
              <ShopSettings session={session} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/vehicles/new"
          element={
            <ProtectedRoute session={session} loading={loading}>
              <NewVehicle session={session} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/vehicles/:id"
          element={
            <ProtectedRoute session={session} loading={loading}>
              <VehicleDetail session={session} />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}
