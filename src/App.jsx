import { useEffect, useState } from "react";
import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import { getSession } from "./lib/api";
import { supabase } from "./lib/supabaseClient";

import Landing from "./pages/Landing";
import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import NewVehicle from "./pages/NewVehicle";
import VehicleDetail from "./pages/VehicleDetail";
import TrackVehicle from "./pages/TrackVehicle";

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession()
      .then(setSession)
      .finally(() => setLoading(false));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
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
        <Route
          path="/admin"
          element={
            <ProtectedRoute session={session} loading={loading}>
              <AdminDashboard />
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
