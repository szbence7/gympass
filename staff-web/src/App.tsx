import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import LoginScreen from './screens/LoginScreen';
import LandingScreen from './screens/LandingScreen';
import DashboardScreen from './screens/DashboardScreen';
import ScannerScreen from './screens/ScannerScreen';
import HistoryScreen from './screens/HistoryScreen';
import CreatePassScreen from './screens/CreatePassScreen';
import UsersScreen from './screens/UsersScreen';
import PassManagementScreen from './screens/PassManagementScreen';
import UserDetailScreen from './screens/UserDetailScreen';
import AdminLoginScreen from './screens/admin/AdminLoginScreen';
import AdminDashboardScreen from './screens/admin/AdminDashboardScreen';
import AdminGymsScreen from './screens/admin/AdminGymsScreen';
import AdminGymDetailScreen from './screens/admin/AdminGymDetailScreen';

// Helper to extract gym slug from hostname
function getGymSlug(): string {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');
  return parts[0] || 'default';
}

// Component to verify and render staff login
function StaffLoginGuard({ onLogin }: { onLogin: () => void }) {
  const { path } = useParams<{ path: string }>();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    async function verifyPath() {
      if (!path) {
        setIsValid(false);
        setIsValidating(false);
        return;
      }

      try {
        // Use relative path (works in dev via proxy or prod via same-domain)
        const response = await fetch('/api/public/verify-staff-path', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: getGymSlug(), path }),
        });
        
        const data = await response.json();
        setIsValid(data.valid === true);
      } catch (error) {
        console.error('Failed to verify staff path:', error);
        setIsValid(false);
      } finally {
        setIsValidating(false);
      }
    }

    verifyPath();
  }, [path]);

  if (isValidating) {
    return <div>Verifying...</div>;
  }

  if (!isValid) {
    // Invalid path - redirect to landing without revealing the correct path
    // Show error message via URL parameter
    return <Navigate to="/?error=invalid_staff_path" replace />;
  }

  // Valid path - render staff login
  return <LoginScreen onLogin={onLogin} />;
}

function AppRoutes() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Separate auth state for admin vs staff
  const [isStaffAuthenticated, setIsStaffAuthenticated] = useState<boolean | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    if (isAdminRoute) {
      const adminToken = localStorage.getItem('admin_token');
      setIsAdminAuthenticated(!!adminToken);
    } else {
      const staffToken = localStorage.getItem('staff_token');
      setIsStaffAuthenticated(!!staffToken);
    }
  }, [isAdminRoute]);

  const handleStaffLogin = () => {
    setIsStaffAuthenticated(true);
  };

  const handleAdminLogin = () => {
    setIsAdminAuthenticated(true);
  };

  // Admin routes (MUST be checked first, before staff routes)
  if (isAdminRoute) {
    if (isAdminAuthenticated === null) {
      return <div>Loading...</div>;
    }

    return (
      <Routes>
        {isAdminAuthenticated ? (
          <>
            <Route path="/admin" element={<AdminDashboardScreen />} />
            <Route path="/admin/gyms" element={<AdminGymsScreen />} />
            <Route path="/admin/gyms/:id" element={<AdminGymDetailScreen />} />
            <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
          </>
        ) : (
          <>
            <Route path="/admin/login" element={<AdminLoginScreen onLogin={handleAdminLogin} />} />
            <Route path="/admin/*" element={<Navigate to="/admin/login" replace />} />
          </>
        )}
      </Routes>
    );
  }

  // Staff routes (gym-specific)
  if (isStaffAuthenticated === null) {
    return <div>Loading...</div>;
  }

  return (
    <Routes>
      {isStaffAuthenticated ? (
        <>
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/scanner" element={<ScannerScreen />} />
          <Route path="/history" element={<HistoryScreen />} />
          <Route path="/create-pass" element={<CreatePassScreen />} />
          <Route path="/users" element={<UsersScreen />} />
          <Route path="/users/:id" element={<UserDetailScreen />} />
          <Route path="/passes" element={<PassManagementScreen />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/:path" element={<Navigate to="/dashboard" replace />} />
        </>
      ) : (
        <>
          <Route path="/" element={<LandingScreen />} />
          <Route path="/:path" element={<StaffLoginGuard onLogin={handleStaffLogin} />} />
        </>
      )}
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
