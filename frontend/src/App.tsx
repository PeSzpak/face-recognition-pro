import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Login from "./components/auth/Login";
import FaceIDAuth from "./components/auth/FaceIDAuth";
import Dashboard from "./components/dashboard/Dashboard";
import Recognition from "./components/recognition/Recognition";
import People from "./components/people/People";
import Analytics from "./components/analytics/Analytics";
import Settings from "./components/settings/Settings";
import MMTecLayout from "./components/layout/MMTecLayout";
import { AuthProvider, useAuth } from "./contexts/AuthContext";

// Protected Route Component
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  page?: string;
}> = ({ children, page = "dashboard" }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <MMTecLayout currentPage={page}>{children}</MMTecLayout>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#fff",
                color: "#1a365d",
                fontSize: "14px",
                fontWeight: "500",
                borderRadius: "12px",
                padding: "16px",
                boxShadow: "0 10px 15px -3px rgba(26, 54, 93, 0.1)",
              },
              success: {
                iconTheme: {
                  primary: "#10b981",
                  secondary: "#fff",
                },
              },
              error: {
                iconTheme: {
                  primary: "#dc2626",
                  secondary: "#fff",
                },
              },
            }}
          />

          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/face-auth"
              element={
                <FaceIDAuth
                  onSuccess={(user) => {
                    console.log("Face ID Success:", user);
                    window.location.href = "/dashboard";
                  }}
                  onError={(error) => {
                    console.error("Face ID Error:", error);
                  }}
                />
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute page="dashboard">
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/recognition"
              element={
                <ProtectedRoute page="recognition">
                  <Recognition />
                </ProtectedRoute>
              }
            />

            <Route
              path="/people"
              element={
                <ProtectedRoute page="people">
                  <People />
                </ProtectedRoute>
              }
            />

            <Route
              path="/analytics"
              element={
                <ProtectedRoute page="analytics">
                  <Analytics />
                </ProtectedRoute>
              }
            />

            <Route
              path="/settings"
              element={
                <ProtectedRoute page="settings">
                  <Settings />
                </ProtectedRoute>
              }
            />

            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;