'use client';

import { useState, ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface SidebarProps {
  children: ReactNode;
}

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export default function MeetingTrackerSidebar({ children }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [categoryStats, setCategoryStats] = useState({
    sales: 0,
    recruitment: 0,
    new: 0,
  });
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  useEffect(() => {
    fetchCategoryStats();
  }, []);

  const fetchCategoryStats = async () => {
    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) return;
      const { access_token: token } = JSON.parse(authTokens);

      const res = await fetch(`${API_BASE_URL}/api/v1/meeting-tracker/meetings`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) return;

      const data = await res.json();
      const meetings = data.meetings || [];

      setCategoryStats({
        sales: meetings.filter((m: any) => m.category === 'S').length,
        recruitment: meetings.filter((m: any) => m.category === 'R').length,
        new: meetings.filter((m: any) => m.category === 'N').length,
      });
    } catch (error) {
      console.error('Error fetching category stats:', error);
    }
  };

  const navigation = [
    {
      name: 'Overview',
      href: '/meeting-tracker/dashboard',
      icon: '📊',
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

  const filters = [
    { name: 'Sales', count: categoryStats.sales, color: 'bg-blue-500' },
    { name: 'Recruitment', count: categoryStats.recruitment, color: 'bg-green-500' },
    { name: 'New', count: categoryStats.new, color: 'bg-purple-500' },
  ];

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
              <p className="text-sm text-gray-400 mt-2">
                {user.first_name || user.email.split('@')[0]}
              </p>
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

            {/* Filters */}
            <div>
              <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Filters
              </h3>
              {filters.map((filter) => (
                <div
                  key={filter.name}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-gray-300"
                >
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full ${filter.color} mr-3`}></span>
                    {filter.name}
                  </div>
                  <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded-full">
                    {filter.count}
                  </span>
                </div>
              ))}
            </div>
          </nav>

          {/* App Switcher */}
          <div className="p-4 border-t border-gray-700">
            <Link
              href="/oracle/chat"
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
