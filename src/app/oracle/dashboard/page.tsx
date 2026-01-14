'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { UserRole } from '@/types/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';

function DashboardContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [statsCards, setStatsCards] = useState<any[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Fetch dashboard statistics from API
  const fetchDashboardStats = async () => {
    if (!user) return;
    
    try {
      setIsLoadingStats(true);
      const response = await apiClient.get('/api/v1/oracle/dashboard/stats');
      
      if (response.data.success) {
        setStatsCards(response.data.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
      // Fall back to static stats
      setStatsCards(getStatsCards(user.role));
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchDashboardStats();
    }
  }, [user]);
  
  const getWelcomeMessage = (role: string) => {
    switch (role) {
      case UserRole.MASTER:
        return 'Welcome to your system control center';
      case UserRole.SUPER_ADMIN:
        return 'Welcome to your company command center';
      case UserRole.ADMIN:
        return 'Welcome to your management hub';
      case UserRole.ADVISOR:
        return 'Welcome to your client portal';
      case UserRole.LEADER_1:
      case UserRole.LEADER_2:
        return 'Welcome to your team dashboard';
      case UserRole.SENIOR_PARTNER:
        return 'Welcome to your strategic overview';
      default:
        return 'Welcome back';
    }
  };

  const getQuickActions = (role: string) => {
    const baseActions = [
      {
        title: 'Products',
        href: '/oracle/products',
        icon: '🔍',
        description: 'Search for insurance'
      },
      { title: 'Generate Proposal', href: '/oracle/proposals', icon: '📊', description: 'Create client proposals' },
      { title: 'Chat', href: '/oracle/chat', icon: '💬', description: 'Ask questions about products' },
    ];

    switch (role) {
      case UserRole.MASTER:
        return [
          ...baseActions,
          { title: 'System Admin', href: '/oracle/master', icon: '🏛️', description: 'Cross-company administration' },
        ];
      case UserRole.SUPER_ADMIN:
        return [
          ...baseActions,
          { title: 'Admin Panel', href: '/oracle/admin', icon: '⚙️', description: 'Company administration' },
        ];
      case UserRole.ADMIN:
        return [
          ...baseActions,
          { title: 'Manage Users', href: '/oracle/admin/users', icon: '👥', description: 'Manage team members' },
        ];
      case UserRole.ADVISOR:
        return [
          ...baseActions,
          { title: 'My Clients', href: '/oracle/clients', icon: '👤', description: 'Manage your clients' },
        ];
      case UserRole.LEADER_1:
      case UserRole.LEADER_2:
        return [
          ...baseActions,
          { title: 'Team Dashboard', href: '/oracle/team', icon: '📈', description: 'View team performance' },
        ];
      case UserRole.SENIOR_PARTNER:
        return [
          ...baseActions,
          { title: 'Analytics', href: '/oracle/analytics', icon: '📊', description: 'Strategic insights' },
        ];
      default:
        return baseActions;
    }
  };

  const getAdminActions = (role: string) => {
    switch (role) {
      case UserRole.MASTER:
        return [
          {
            title: 'System Administration',
            href: '/oracle/master/system',
            icon: '🏛️',
            description: 'Cross-company system management'
          },
          {
            title: 'Manage Companies',
            href: '/oracle/master/companies',
            icon: '🏢',
            description: 'Create and manage all companies'
          },
          {
            title: 'Global User Management',
            href: '/oracle/master/users',
            icon: '👥',
            description: 'Manage users across all companies'
          },
          {
            title: 'Cross-Company Analytics',
            href: '/oracle/master/analytics',
            icon: '📊',
            description: 'Platform-wide analytics and insights'
          },
          {
            title: 'Upload Insurance',
            href: '/oracle/admin/documents',
            icon: '📤',
            description: 'Upload insurance documents'
          },
          {
            title: 'Manage Products',
            href: '/oracle/admin/products',
            icon: '📋',
            description: 'Edit and manage insurance products'
          },
          {
            title: 'Invite User',
            href: '/oracle/admin/invitations',
            icon: '📧',
            description: 'Send invitation to new team members'
          },
          {
            title: 'Manage Commissions',
            href: '/oracle/admin/commissions',
            icon: '💰',
            description: 'Create and configure commission rates'
          },
        ];
      case UserRole.SUPER_ADMIN:
        return [
          {
            title: 'Upload Insurance',
            href: '/oracle/admin/documents',
            icon: '📤',
            description: 'Upload insurance documents'
          },
          {
            title: 'Manage Products',
            href: '/oracle/admin/products',
            icon: '📋',
            description: 'Edit and manage insurance products'
          },
          {
            title: 'Edit User',
            href: '/oracle/admin/users',
            icon: '👤',
            description: 'Manage user accounts'
          },
          {
            title: 'Invite User',
            href: '/oracle/admin/invitations',
            icon: '📧',
            description: 'Send invitation to new team members'
          },
          {
            title: 'User Performance',
            href: '/oracle/admin/performance',
            icon: '📈',
            description: 'Track user performance'
          },
          {
            title: 'Manage Commissions',
            href: '/oracle/admin/commissions',
            icon: '💰',
            description: 'Create and configure commission rates'
          },
          {
            title: 'Manage Promotions',
            href: '/oracle/admin/promotions',
            icon: '🎯',
            description: 'Create and manage promotions'
          },
          {
            title: 'Company Profile',
            href: '/oracle/admin/company',
            icon: '🏢',
            description: 'Manage company profile and branding'
          },
          {
            title: 'Financial Reports',
            href: '/oracle/admin/financial-reports',
            icon: '💳',
            description: 'View financial analytics and reports'
          },
          {
            title: 'Analytics',
            href: '/oracle/admin/analytics',
            icon: '📊',
            description: 'View company analytics'
          },
        ];
      case UserRole.ADMIN:
        return [
          {
            title: 'Upload Insurance',
            href: '/oracle/admin/documents',
            icon: '📤',
            description: 'Upload insurance documents'
          },
          {
            title: 'Manage Products',
            href: '/oracle/admin/products',
            icon: '📋',
            description: 'Edit and manage insurance products'
          },
          {
            title: 'Edit User',
            href: '/oracle/admin/users',
            icon: '👤',
            description: 'Manage user accounts'
          },
          {
            title: 'Invite User',
            href: '/oracle/admin/invitations',
            icon: '📧',
            description: 'Send invitation to new team members'
          },
          {
            title: 'Manage Commissions',
            href: '/oracle/admin/commissions',
            icon: '💰',
            description: 'Create and configure commission rates'
          },
        ];
      // ADVISOR, LEADER_1, LEADER_2, SENIOR_PARTNER get NO admin actions
      default:
        return [];
    }
  };

  const getStatsCards = (role: string) => {
    // This would typically come from API calls
    const baseStats = [
      { title: 'Products', value: '247', suffix: '' },
      { title: 'Proposals', value: '18', suffix: '' },
    ];

    switch (role) {
      case UserRole.MASTER:
        return [
          { title: 'Total Users', value: '0', suffix: '' },      // Count from users table
          { title: 'Total Companies', value: '0', suffix: '' },  // Count from companies table
          { title: 'Products', value: '0', suffix: '' },         // Count from insurances table
          { title: 'Proposals', value: '0', suffix: '' },        // Count from proposals table
          { title: 'Search Queries', value: '0', suffix: '' },   // Count from ai_search_queries table
          { title: 'Chat Sessions', value: '0', suffix: '' },    // Count from chat_sessions table
        ];
      case UserRole.SUPER_ADMIN:
        return [
          { title: 'Company Users', value: '0', suffix: '' },
          { title: 'Team Members', value: '0', suffix: '' },
          ...baseStats,
        ];
      case UserRole.ADMIN:
        return [
          { title: 'Team Members', value: '12', suffix: '' },
          { title: 'Documents', value: '89', suffix: '' },
          ...baseStats,
        ];
      case UserRole.ADVISOR:
        return [
          { title: 'Active Clients', value: '24', suffix: '' },
          { title: 'Commission', value: '$4,256', suffix: '' },
          ...baseStats,
        ];
      case UserRole.LEADER_1:
      case UserRole.LEADER_2:
        return [
          { title: 'Team Performance', value: '92%', suffix: '' },
          { title: 'Team Revenue', value: '$32,840', suffix: '' },
          ...baseStats,
        ];
      case UserRole.SENIOR_PARTNER:
        return [
          { title: 'Company Revenue', value: '$284,350', suffix: '' },
          { title: 'Portfolio Growth', value: '8.2%', suffix: '' },
          ...baseStats,
        ];
      default:
        return baseStats;
    }
  };

  if (!user) return null;

  const quickActions = getQuickActions(user.role);
  const adminActions = getAdminActions(user.role);
  const isAdmin = user.role === UserRole.MASTER || user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN;
  
  // Use fallback stats if API call failed and statsCards is empty
  // Show loading state during initial fetch
  const displayStats = isLoadingStats && statsCards.length === 0 
    ? []
    : (statsCards.length > 0 ? statsCards : getStatsCards(user.role));

  return (
    <Sidebar>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <main className="max-w-6xl mx-auto px-6 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-16">
          <div className="flex justify-end mb-4">
            <button
              onClick={async () => {
                try {
                  await logout();
                  router.push('/login');
                } catch (error) {
                  console.error('Logout error:', error);
                  // Fallback logout
                  localStorage.clear();
                  router.push('/login');
                  window.location.reload();
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
            >
              🚪 Logout
            </button>
          </div>
          
          <h1 className="text-5xl font-bold text-gray-900 mb-4 animate-fade-in">
            {getWelcomeMessage(user.role)}
          </h1>
          
          <p className="text-xl text-gray-600 mb-6">
            Hello, {user.first_name || user.email.split('@')[0]}
          </p>

          <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary-100 text-primary-800 text-sm font-medium">
            {user.role.replace('_', ' ')}
          </div>
        </div>


        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {isLoadingStats && displayStats.length === 0 ? (
            // Loading skeleton cards
            Array.from({ length: 4 }, (_, index) => (
              <div 
                key={`loading-${index}`} 
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 animate-pulse"
              >
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-300 mb-2">
                    ---
                  </div>
                  <div className="text-sm text-gray-400">Loading...</div>
                </div>
              </div>
            ))
          ) : (
            displayStats.map((stat, index) => (
              <div 
                key={index} 
                className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300"
              >
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600">{stat.title}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick Actions */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-8">
            Quick Actions
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {quickActions.map((action, index) => (
            <div
              key={index}
              className="group bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
              onClick={() => router.push(action.href)}
            >
              <div className="text-center">
                <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  {action.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {action.title}
                </h3>
                <p className="text-sm text-gray-600">
                  {action.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Admin Actions */}
        {isAdmin && adminActions.length > 0 && (
          <>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-8">
                Admin Actions
              </h2>
            </div>

            <div className={`grid gap-6 mb-16 ${
              user.role === UserRole.SUPER_ADMIN 
                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4' 
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
            }`}>
              {adminActions.map((action, index) => (
                <div
                  key={index}
                  className="group bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer"
                  onClick={() => router.push(action.href)}
                >
                  <div className="text-center">
                    <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-300">
                      {action.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {action.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Profile Completion Notice */}
        {!user.is_profile_complete && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm">!</span>
                </div>
              </div>
              <div className="ml-4 flex-1">
                <h3 className="text-lg font-medium text-yellow-800">
                  Complete your profile
                </h3>
                <p className="text-yellow-700 mt-1">
                  Complete your profile to access all features and improve your experience.
                </p>
              </div>
              <div className="ml-4">
                <button
                  onClick={() => router.push('/oracle/profile')}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  Complete Profile
                </button>
              </div>
            </div>
          </div>
        )}
        </main>
      </div>
    </Sidebar>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}