'use client';

import { useState, ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import GamificationSidebarWidget from './GamificationSidebarWidget';

interface SidebarProps {
  children: ReactNode;
}

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export default function MeetingTrackerSidebar({ children }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isLeader, setIsLeader] = useState(false);
  const [subordinatesCount, setSubordinatesCount] = useState(0);

  const navigation = [
    {
      name: 'Overview',
      href: '/meeting-tracker/dashboard',
      icon: '📊',
    },
    {
      name: 'Meetings',
      href: '/meeting-tracker/meetings',
      icon: '📋',
    },
    {
      name: 'My Tasks',
      href: '/meeting-tracker/tasks',
      icon: '✅',
    },
    {
      name: 'Profile',
      href: '/meeting-tracker/profile',
      icon: '👤',
    },
    {
      name: 'Settings',
      href: '/meeting-tracker/settings',
      icon: '⚙️',
    },
  ];

  // Admin navigation (only for role_id 1 and 2)
  const adminNavigation = [
    {
      name: 'Companies',
      href: '/meeting-tracker/admin/companies',
      icon: '🏢',
    },
    {
      name: 'Dashboard',
      href: '/meeting-tracker/admin/dashboard',
      icon: '📊',
    },
  ];

  const isAdmin = user?.role_id === 1 || user?.role_id === 2;
  const isAdminPage = pathname?.startsWith('/meeting-tracker/admin');

  // Check if user is a leader
  useEffect(() => {
    const checkLeaderStatus = async () => {
      if (!user || isAdminPage) return;

      try {
        const authTokens = localStorage.getItem('auth_tokens');
        if (!authTokens) return;
        const { access_token: token } = JSON.parse(authTokens);

        const response = await fetch(`${API_BASE_URL}/api/v1/meeting-tracker/hierarchy/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          // The response structure is directly { is_leader: bool, subordinates_count: N, ... }
          setIsLeader(data.is_leader || false);
          setSubordinatesCount(data.subordinates_count || 0);
        }
      } catch (error) {
        console.error('Failed to check leader status:', error);
      }
    };

    checkLeaderStatus();
  }, [user, isAdminPage]);

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      localStorage.clear();
      router.push('/login');
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-md bg-gray-800 shadow-lg text-gray-300 hover:text-white hover:bg-gray-700"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-gray-800 border-r border-gray-700 shadow-xl transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:relative
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="h-full flex flex-col">
          {/* Logo/Header */}
          <div className="p-6 border-b border-gray-700">
            <Link href="/meeting-tracker/dashboard">
              <h1 className="text-2xl font-bold text-white">
                TRACKER
              </h1>
            </Link>
            {user && (
              <div className="mt-2">
                <p className="text-sm font-medium text-white">
                  {user.first_name && user.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : user.first_name || user.email.split('@')[0]}
                </p>
                {isAdmin && (
                  <p className="text-xs text-gray-400 mt-1">
                    Admin Access
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <div className="mb-6">
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Navigation
              </h3>
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                      ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }
                    `}
                  >
                    <span className="mr-3 text-lg">{item.icon}</span>
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* Team - Show on non-admin pages for leaders only */}
            {!isAdminPage && isLeader && (
              <div className="mb-6">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Team
                </h3>
                <div className="px-3 py-2 rounded-lg bg-green-600 bg-opacity-20 border border-green-600 text-green-400 mb-2">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span className="flex items-center">
                      <span className="mr-2 text-lg">👥</span>
                      Team Leader
                    </span>
                  </div>
                  <div className="text-xs text-green-300 mt-1">
                    {subordinatesCount} team member{subordinatesCount !== 1 ? 's' : ''}
                  </div>
                </div>
                <Link
                  href="/meeting-tracker/team"
                  className={`
                    flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${
                      pathname === '/meeting-tracker/team'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }
                  `}
                >
                  <span className="mr-3 text-lg">👥</span>
                  My Team
                </Link>
              </div>
            )}

            {/* Admin Section - Show for admins only */}
            {isAdmin && (
              <div className="mb-6">
                <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Admin
                </h3>
                {adminNavigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`
                        flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors
                        ${
                          isActive
                            ? 'bg-purple-600 text-white'
                            : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                        }
                      `}
                    >
                      <span className="mr-3 text-lg">{item.icon}</span>
                      {item.name}
                    </Link>
                  );
                })}

                {/* Back to Workspace - Only show when on admin pages */}
                {isAdminPage && (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <Link
                      href="/meeting-tracker/dashboard"
                      className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                    >
                      <span className="mr-3 text-lg">👤</span>
                      Back to Workspace
                    </Link>
                  </div>
                )}
              </div>
            )}
          </nav>

          {/* Gamification Widget - Only show on non-admin pages */}
          {!isAdminPage && <GamificationSidebarWidget />}

          {/* App Switcher */}
          <div className="p-4 border-t border-gray-700">
            <Link
              href="/oracle/dashboard"
              className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <span className="mr-2">🔄</span>
              Switch to Oracle
            </Link>
          </div>

          {/* Footer with logout */}
          <div className="p-4 border-t border-gray-700">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              <span className="mr-2">🚪</span>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 w-full">
        {children}
      </div>
    </div>
  );
}
