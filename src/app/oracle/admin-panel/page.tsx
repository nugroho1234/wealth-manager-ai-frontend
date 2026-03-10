'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { UserRole } from '@/types/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';

interface AdminStats {
  total_team_members: number;
  total_products: number;
  pending_invitations: number;
  total_proposals: number;
}

interface RecentUpload {
  insurance_name: string;
  created_at: string;
}

interface RecentInvitation {
  invited_by_name: string;
  email: string;
  created_at: string;
}

interface RecentProposal {
  created_by_name: string;
  client_name: string;
  created_at: string;
}

interface RecentActivities {
  recent_uploads: RecentUpload[];
  recent_invitations: RecentInvitation[];
  recent_proposals: RecentProposal[];
}

interface AdminDashboardData {
  stats: AdminStats;
  recent_activities: RecentActivities;
}

function AdminPanelContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.get('/api/v1/oracle/admin-dashboard/stats');

      if (response.data.success) {
        setDashboardData(response.data.data);
      } else {
        setError('Failed to load admin dashboard data');
      }
    } catch (err) {
      console.error('Error fetching admin dashboard data:', err);
      setError('Failed to load admin dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const formatRelativeTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
  };

  if (!user) return null;

  return (
    <Sidebar>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <main className="max-w-7xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Admin Panel
            </h1>
            <p className="text-lg text-gray-600">
              Company overview and recent activity
            </p>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
              <p className="text-red-800">{error}</p>
              <button
                onClick={fetchAdminData}
                className="mt-2 text-red-600 hover:text-red-700 font-medium text-sm"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {isLoading ? (
              // Loading skeleton
              Array.from({ length: 4 }, (_, index) => (
                <div
                  key={`loading-${index}`}
                  className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 animate-pulse"
                >
                  <div className="text-center">
                    <div className="h-10 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))
            ) : dashboardData ? (
              <>
                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600 mb-2">
                      {dashboardData.stats.total_team_members}
                    </div>
                    <div className="text-sm text-gray-600">Team Members</div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600 mb-2">
                      {dashboardData.stats.total_products}
                    </div>
                    <div className="text-sm text-gray-600">Products</div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-yellow-600 mb-2">
                      {dashboardData.stats.pending_invitations}
                    </div>
                    <div className="text-sm text-gray-600">Pending Invitations</div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-purple-600 mb-2">
                      {dashboardData.stats.total_proposals}
                    </div>
                    <div className="text-sm text-gray-600">Proposals</div>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Recent Activity Section */}
          {!isLoading && dashboardData && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Document Uploads */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">📄</span>
                  Recent Uploads
                </h2>
                <div className="space-y-3">
                  {dashboardData.recent_activities.recent_uploads.length > 0 ? (
                    dashboardData.recent_activities.recent_uploads.map((upload, index) => (
                      <div key={index} className="border-l-2 border-blue-500 pl-3 py-1">
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">
                          {upload.insurance_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatRelativeTime(upload.created_at)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400 italic">No recent uploads</p>
                  )}
                </div>
              </div>

              {/* Recent Invitations Sent */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">📧</span>
                  Recent Invitations
                </h2>
                <div className="space-y-3">
                  {dashboardData.recent_activities.recent_invitations.length > 0 ? (
                    dashboardData.recent_activities.recent_invitations.map((invitation, index) => (
                      <div key={index} className="border-l-2 border-green-500 pl-3 py-1">
                        <p className="text-sm font-medium text-gray-900">
                          {invitation.invited_by_name}
                        </p>
                        <p className="text-xs text-gray-600 line-clamp-1">
                          invited {invitation.email}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatRelativeTime(invitation.created_at)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400 italic">No recent invitations</p>
                  )}
                </div>
              </div>

              {/* Recent Proposals Generated */}
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <span className="mr-2">📊</span>
                  Recent Proposals
                </h2>
                <div className="space-y-3">
                  {dashboardData.recent_activities.recent_proposals.length > 0 ? (
                    dashboardData.recent_activities.recent_proposals.map((proposal, index) => (
                      <div key={index} className="border-l-2 border-purple-500 pl-3 py-1">
                        <p className="text-sm font-medium text-gray-900">
                          {proposal.created_by_name}
                        </p>
                        <p className="text-xs text-gray-600 line-clamp-1">
                          for {proposal.client_name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatRelativeTime(proposal.created_at)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-400 italic">No recent proposals</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </Sidebar>
  );
}

export default function AdminPanelPage() {
  return (
    <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]}>
      <AdminPanelContent />
    </ProtectedRoute>
  );
}
