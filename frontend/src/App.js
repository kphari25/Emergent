import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Patients from "@/pages/Patients";
import PatientDetails from "@/pages/PatientDetails";
import Inventory from "@/pages/Inventory";
import Appointments from "@/pages/Appointments";
import Billing from "@/pages/Billing";
import Reports from "@/pages/Reports";
import HR from "@/pages/HR";
import Mess from "@/pages/Mess";
import QueueDashboard from "@/pages/QueueDashboard";
import UserManagement from "@/pages/UserManagement";
import Layout from "@/components/Layout";

// Roles that have restricted access (cannot see HR and Reports)
const RESTRICTED_ROLES = ['doctor', 'front_desk', 'therapist'];

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FDFCF8]">
        <div className="spinner"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Route protection for admin-only pages
const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FDFCF8]">
        <div className="spinner"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Route protection for HR/Reports pages (not accessible by restricted roles)
const RestrictedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#FDFCF8]">
        <div className="spinner"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (RESTRICTED_ROLES.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route index element={<Dashboard />} />
                    <Route path="patients" element={<Patients />} />
                    <Route path="patients/:patientId" element={<PatientDetails />} />
                    <Route path="queue" element={<QueueDashboard />} />
                    <Route path="inventory" element={<Inventory />} />
                    <Route path="appointments" element={<Appointments />} />
                    <Route path="billing" element={<Billing />} />
                    <Route path="mess" element={<Mess />} />
                    <Route path="reports" element={<RestrictedRoute><Reports /></RestrictedRoute>} />
                    <Route path="hr" element={<RestrictedRoute><HR /></RestrictedRoute>} />
                    <Route path="users" element={<AdminRoute><UserManagement /></AdminRoute>} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
