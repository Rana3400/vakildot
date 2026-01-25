import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Scale, LayoutDashboard, Briefcase, Users, FileText, Calendar, IndianRupee, Settings, Menu, X, LogOut } from 'lucide-react';

const Layout = ({ user, onLogout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const userRole = user?.user_role || 'lawyer';

  // Filter menu items based on user role
  const allMenuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['lawyer', 'client'] },
    { path: '/cases', icon: Briefcase, label: 'Cases', roles: ['lawyer', 'client'] },
    { path: '/clients', icon: Users, label: 'Clients', roles: ['lawyer'] },
    { path: '/documents', icon: FileText, label: 'Documents', roles: ['lawyer'] },
    { path: '/calendar', icon: Calendar, label: 'Calendar', roles: ['lawyer'] },
    { path: '/billing', icon: IndianRupee, label: 'Billing', roles: ['lawyer'] },
    { path: '/settings', icon: Settings, label: 'Settings', roles: ['lawyer', 'client'] },
  ];

  const menuItems = allMenuItems.filter(item => item.roles.includes(userRole));

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex h-screen w-64 flex-col fixed left-0 top-0 bg-sidebar-bg text-sidebar-fg border-r border-border">
        <div className="p-6 border-b border-sidebar-active">
          <Link to="/dashboard" className="flex items-center gap-2">
            <Scale className="h-8 w-8" />
            <span className="text-2xl font-bold font-serif">VakilDesk</span>
          </Link>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase()}`}
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
            <p className="text-sm font-medium text-sidebar-fg">{lawyer?.name || 'Advocate'}</p>
            <p className="text-xs text-sidebar-fg/60">{lawyer?.bar_council_number || ''}</p>
          </div>
          <button
            onClick={onLogout}
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
              <Link to="/dashboard" className="flex items-center gap-2" onClick={() => setSidebarOpen(false)}>
                <Scale className="h-8 w-8" />
                <span className="text-2xl font-bold font-serif">VakilDesk</span>
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
                <p className="text-sm font-medium text-sidebar-fg">{lawyer?.name || 'Advocate'}</p>
                <p className="text-xs text-sidebar-fg/60">{lawyer?.bar_council_number || ''}</p>
              </div>
              <button
                onClick={() => {
                  setSidebarOpen(false);
                  onLogout();
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
          <Link to="/dashboard" className="flex items-center gap-2">
            <Scale className="h-6 w-6" />
            <span className="text-xl font-bold font-serif">VakilDesk</span>
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