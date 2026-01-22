import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  Calendar, 
  Receipt, 
  BarChart3, 
  LogOut,
  Menu,
  X,
  UserCog,
  ShieldCheck
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';

// Roles that have restricted access (cannot see HR and Reports)
const RESTRICTED_ROLES = ['doctor', 'front_desk', 'therapist'];

const allNavItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard, restricted: false },
  { path: '/patients', label: 'Patients', icon: Users, restricted: false },
  { path: '/inventory', label: 'Inventory', icon: Package, restricted: false },
  { path: '/appointments', label: 'Appointments', icon: Calendar, restricted: false },
  { path: '/billing', label: 'Billing', icon: Receipt, restricted: false },
  { path: '/hr', label: 'HR', icon: UserCog, restricted: true },
  { path: '/reports', label: 'Reports', icon: BarChart3, restricted: true },
  { path: '/users', label: 'Users', icon: ShieldCheck, adminOnly: true },
];

export const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filter nav items based on user role
  const navItems = useMemo(() => {
    if (!user) return [];
    const userRole = user.role;
    const isAdmin = userRole === 'admin';
    const isRestricted = RESTRICTED_ROLES.includes(userRole);
    
    return allNavItems.filter(item => {
      // Admin-only items (like User Management)
      if (item.adminOnly) return isAdmin;
      // Restricted items (HR, Reports) - hidden for restricted roles
      if (item.restricted) return !isRestricted;
      // All other items are visible to everyone
      return true;
    });
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-container">
      {/* Desktop Sidebar */}
      <aside className="sidebar hidden md:flex flex-col w-64 min-h-screen" data-testid="sidebar">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img 
              src="https://customer-assets.emergentagent.com/job_756d16a4-b299-4f97-8859-f036a0db1e8b/artifacts/3xynh5cc_tatva.jpg" 
              alt="Tatva Ayurved"
              className="w-10 h-10 rounded-xl object-cover"
            />
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">Tatva Ayurved</h1>
              <p className="text-xs text-white/60">Hospital Management</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
              data-testid={`nav-${item.label.toLowerCase()}`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 border-t border-white/10">
          <div className="px-4 py-2 mb-2">
            <p className="text-sm font-medium text-white">{user?.name}</p>
            <p className="text-xs text-white/60 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="sidebar-link w-full text-white/70 hover:text-white"
            data-testid="logout-btn"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#344E41] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img 
            src="https://customer-assets.emergentagent.com/job_756d16a4-b299-4f97-8859-f036a0db1e8b/artifacts/3xynh5cc_tatva.jpg" 
            alt="Tatva Ayurved"
            className="w-8 h-8 rounded-lg object-cover"
          />
          <span className="text-white font-bold">Tatva Ayurved</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-white hover:bg-white/10"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-[#344E41] pt-16">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `sidebar-link ${isActive ? 'active' : ''}`
                }
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </NavLink>
            ))}
            <button
              onClick={handleLogout}
              className="sidebar-link w-full text-white/70 hover:text-white mt-4"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="main-content flex-1 md:ml-0 pt-16 md:pt-0">
        {children}
      </main>
    </div>
  );
};

export default Layout;
