'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { UserRole } from '@/types/auth';

interface SidebarItem {
  name: string;
  href: string;
  icon: string;
  requiredRoles?: UserRole[];
  action?: () => void;
}

interface SidebarProps {
  children: React.ReactNode;
}

export default function Sidebar({ children }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const router = useRouter();
  const pathname = usePathname();

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('sidebar-collapsed');
    if (savedState !== null) {
      setIsCollapsed(JSON.parse(savedState));
    }
  }, []);

  // Save collapsed state to localStorage
  const toggleCollapsed = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      router.push('/login');
    }
  };

  const mainNavigationItems: SidebarItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: '🏠',
    },
    {
      name: 'Search for Insurance',
      href: '/products',
      icon: '🔍',
    },
    {
      name: 'Chat with Insurance',
      href: '/chat',
      icon: '💬',
    },
    {
      name: 'Manage Proposals',
      href: '/proposals',
      icon: '📊',
    },
  ];

  const bottomNavigationItems: SidebarItem[] = [
    {
      name: 'Notifications',
      href: '/notifications',
      icon: '🔔',
    },
    {
      name: 'Settings',
      href: '/settings',
      icon: '⚙️',
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: '👤',
    },
    {
      name: 'Logout',
      href: '#',
      icon: '🚪',
      action: handleLogout,
    },
  ];

  const hasAccess = (item: SidebarItem): boolean => {
    if (!item.requiredRoles || !user) return true;
    return item.requiredRoles.includes(user.role as UserRole);
  };

  const isActiveRoute = (href: string): boolean => {
    if (href === '/dashboard' && pathname === '/dashboard') return true;
    if (href !== '/dashboard' && href !== '#' && pathname.startsWith(href)) return true;
    return false;
  };

  const handleItemClick = (item: SidebarItem) => {
    if (item.action) {
      item.action();
    } else {
      router.push(item.href);
    }
    setIsMobileMenuOpen(false);
  };

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className={`p-4 border-b border-gray-200 ${isCollapsed && !isMobile ? 'px-2' : ''}`}>
        <div className="flex items-center justify-between">
          {(!isCollapsed || isMobile) && (
            <h1 className="text-lg font-bold text-primary-600 truncate">
              {process.env.NEXT_PUBLIC_APP_NAME || 'Wealth Manager'}
            </h1>
          )}
          {!isMobile && (
            <button
              onClick={toggleCollapsed}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg
                className={`w-4 h-4 text-gray-600 transition-transform duration-200 ${
                  isCollapsed ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* User Info */}
      {user && (!isCollapsed || isMobile) && (
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-medium text-white">
                {user.first_name ? user.first_name[0].toUpperCase() : user.email[0].toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.first_name && user.last_name 
                  ? `${user.first_name} ${user.last_name}` 
                  : user.email}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.role.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      )}

      {/* User Avatar (collapsed state) */}
      {user && isCollapsed && !isMobile && (
        <div className="p-2 border-b border-gray-200 flex justify-center">
          <div className="h-8 w-8 rounded-full bg-primary-600 flex items-center justify-center">
            <span className="text-sm font-medium text-white">
              {user.first_name ? user.first_name[0].toUpperCase() : user.email[0].toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <div className="space-y-1">
          {mainNavigationItems.filter(hasAccess).map((item) => (
            <button
              key={item.name}
              onClick={() => handleItemClick(item)}
              className={`w-full flex items-center ${
                isCollapsed && !isMobile ? 'justify-center px-2 py-3' : 'px-3 py-2'
              } rounded-lg transition-all duration-200 group ${
                isActiveRoute(item.href)
                  ? 'bg-primary-100 text-primary-700 border border-primary-200'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
              title={isCollapsed && !isMobile ? item.name : undefined}
            >
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              {(!isCollapsed || isMobile) && (
                <span className="ml-3 text-sm font-medium truncate">{item.name}</span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Bottom Navigation */}
      <div className={`p-4 border-t border-gray-200 space-y-1`}>
        {bottomNavigationItems.filter(hasAccess).map((item) => (
          <button
            key={item.name}
            onClick={() => handleItemClick(item)}
            className={`w-full flex items-center ${
              isCollapsed && !isMobile ? 'justify-center px-2 py-3' : 'px-3 py-2'
            } rounded-lg transition-all duration-200 group relative ${
              isActiveRoute(item.href)
                ? 'bg-primary-100 text-primary-700 border border-primary-200'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            } ${
              item.name === 'Logout' ? 'hover:bg-red-50 hover:text-red-600' : ''
            }`}
            title={isCollapsed && !isMobile ? item.name : undefined}
          >
            <div className="relative flex-shrink-0">
              <span className="text-lg">{item.icon}</span>
              {/* Notification Badge */}
              {item.name === 'Notifications' && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-500 rounded-full min-w-[1.125rem] h-[1.125rem]">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            {(!isCollapsed || isMobile) && (
              <span className="ml-3 text-sm font-medium truncate">{item.name}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  if (!user) return null;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex md:flex-col bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg bg-white shadow-lg border border-gray-200 text-gray-600 hover:text-gray-900 transition-colors duration-200"
          aria-label="Toggle mobile menu"
        >
          <svg
            className={`w-6 h-6 transition-transform duration-200 ${
              isMobileMenuOpen ? 'rotate-90' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
            />
          </svg>
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Mobile Sidebar */}
          <aside className="fixed left-0 top-0 h-full w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out">
            <SidebarContent isMobile />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${
        isMobileMenuOpen ? 'md:ml-0' : ''
      }`}>
        {/* Content wrapper with proper spacing */}
        <div className="flex-1 overflow-auto">
          <div className="md:ml-0 pt-16 md:pt-0">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}