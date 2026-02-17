import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Scale, LayoutDashboard, Briefcase, Users, FileText, Calendar, IndianRupee, Settings, Menu, X, LogOut, Wallet, History } from 'lucide-react';

const Layout = ({ user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const userRole = user?.user_role || 'lawyer';
  const isClient = userRole === 'client';

  // STRICT Role-Based Menu - Client CANNOT see lawyer tools
  const lawyerMenuItems = [
    { path: '/lawyer-dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/cases', icon: Briefcase, label: 'Cases' },
    { path: '/clients', icon: Users, label: 'Clients' },
    { path: '/documents', icon: FileText, label: 'Documents' },
    { path: '/calendar', icon: Calendar, label: 'Calendar' },
    { path: '/wallet', icon: Wallet, label: 'Wallet' },
    { path: '/call-history', icon: History, label: 'Call History' },
    { path: '/billing', icon: IndianRupee, label: 'Billing' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  // CLIENT ONLY sees limited menu - NO Add Client, NO Case Management tools
  const clientMenuItems = [
    { path: '/client-dashboard', icon: LayoutDashboard, label: 'My Dashboard' },
    { path: '/cases', icon: Briefcase, label: 'My Cases' },
    { path: '/wallet', icon: Wallet, label: 'Wallet' },
    { path: '/call-history', icon: History, label: 'Call History' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const menuItems = isClient ? clientMenuItems : lawyerMenuItems;

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex h-screen w-64 flex-col fixed left-0 top-0 bg-sidebar-bg text-sidebar-fg border-r border-border">
        <div className="p-6 border-b border-sidebar-active">
          <Link to={isClient ? '/client-dashboard' : '/lawyer-dashboard'} className="flex items-center gap-2">
            <Scale className="h-8 w-8" />
            <span className="text-2xl font-bold font-serif">VakilDot</span>
          </Link>
          {isClient && (
            <span className="text-xs text-sidebar-fg/60 mt-1 block">Client Portal</span>
          )}
        </div>
        
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-sm transition-colors ${
                  isActive(item.path)
                    ? 'bg-sidebar-active text-sidebar-fg font-medium'
                    : 'text-sidebar-fg/80 hover:bg-sidebar-active/50 hover:text-sidebar-fg'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-active">
          <div className="mb-3 px-4">
            <p className="text-sm font-medium text-sidebar-fg">{user?.name || 'User'}</p>
            <p className="text-xs text-sidebar-fg/60">
              {isClient ? 'Client' : (user?.practice_field || 'Lawyer')}
            </p>
          </div>
          <button
            onClick={handleLogout}
            data-testid="logout-button"
            className="flex items-center gap-2 w-full px-4 py-2 text-sidebar-fg/80 hover:bg-sidebar-active rounded-sm transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-sidebar-bg text-sidebar-fg border-r border-border">
            <div className="p-6 border-b border-sidebar-active flex items-center justify-between">
              <Link to={isClient ? '/client-dashboard' : '/lawyer-dashboard'} className="flex items-center gap-2" onClick={() => setSidebarOpen(false)}>
                <Scale className="h-8 w-8" />
                <span className="text-2xl font-bold font-serif">VakilDot</span>
              </Link>
              <button onClick={() => setSidebarOpen(false)} data-testid="close-sidebar">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <nav className="flex-1 p-4 space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-sm transition-colors ${
                      isActive(item.path)
                        ? 'bg-sidebar-active text-sidebar-fg font-medium'
                        : 'text-sidebar-fg/80 hover:bg-sidebar-active/50 hover:text-sidebar-fg'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-sidebar-active">
              <div className="mb-3 px-4">
                <p className="text-sm font-medium text-sidebar-fg">{user?.name || 'User'}</p>
                <p className="text-xs text-sidebar-fg/60">
                  {isClient ? 'Client' : (user?.practice_field || 'Lawyer')}
                </p>
              </div>
              <button
                onClick={() => {
                  setSidebarOpen(false);
                  handleLogout();
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sidebar-fg/80 hover:bg-sidebar-active rounded-sm transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="md:pl-64 min-h-screen">
        {/* Mobile Header */}
        <div className="md:hidden bg-card border-b border-border p-4 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} data-testid="open-sidebar">
            <Menu className="h-6 w-6" />
          </button>
          <Link to={isClient ? '/client-dashboard' : '/lawyer-dashboard'} className="flex items-center gap-2">
            <Scale className="h-6 w-6" />
            <span className="text-xl font-bold font-serif">VakilDot</span>
          </Link>
          <div className="w-6" />
        </div>

        <main className="p-6 md:p-8 lg:p-12">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
