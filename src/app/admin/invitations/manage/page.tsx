'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { apiClient } from '@/lib/api';

interface Invitation {
  id: number;
  email: string;
  role_id: number;
  role_name: string;
  company_id: string;
  company_name: string;
  invited_by: string;
  invited_by_email: string;
  status: string;
  created_at: string;
  expires_at: string;
  updated_at?: string;
}

function ManageInvitationsContent() {
  const { user } = useAuth();
  const { notifyError, notifySuccess } = useNotifications();
  const router = useRouter();
  
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalInvitations, setTotalInvitations] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchInvitations();
  }, [statusFilter]);

  const fetchInvitations = async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams({
        limit: '50' // Get more invitations for the management page
      });
      
      if (statusFilter) {
        params.append('status_filter', statusFilter);
      }
      
      const response = await apiClient.get<{
        success: boolean;
        message: string;
        data: { invitations: Invitation[]; total: number };
      }>(`/api/v1/invitations?${params.toString()}`);
      
      setInvitations(response.data.data.invitations || []);
      setTotalInvitations(response.data.data.total || 0);
    } catch (error: any) {
      console.error('Error fetching invitations:', error);
      notifyError('Error', 'Failed to fetch invitations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendInvitation = async (invitationId: number, email: string) => {
    try {
      await apiClient.post(`/api/v1/invitations/${invitationId}/resend`);
      notifySuccess('Success', `Invitation resent to ${email}`);
      fetchInvitations();
    } catch (error: any) {
      console.error('Error resending invitation:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to resend invitation';
      notifyError('Resend Error', errorMessage);
    }
  };

  const handleRevokeInvitation = async (invitationId: number, email: string) => {
    if (!confirm(`Are you sure you want to revoke the invitation for ${email}?`)) {
      return;
    }

    try {
      await apiClient.delete(`/api/v1/invitations/${invitationId}`);
      notifySuccess('Success', `Invitation for ${email} has been revoked`);
      fetchInvitations();
    } catch (error: any) {
      console.error('Error revoking invitation:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to revoke invitation';
      notifyError('Revoke Error', errorMessage);
    }
  };

  const handleCleanupExpired = async () => {
    if (!confirm('Are you sure you want to cleanup all expired invitations? This will mark pending expired invitations as expired.')) {
      return;
    }

    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        data: { expired_count: number };
      }>('/api/v1/invitations/cleanup-expired');
      
      const count = response.data.data.expired_count;
      notifySuccess('Success', `Cleaned up ${count} expired invitations`);
      fetchInvitations();
    } catch (error: any) {
      console.error('Error cleaning up expired invitations:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to cleanup expired invitations';
      notifyError('Cleanup Error', errorMessage);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">🟡 Pending</span>;
      case 'activated':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">✅ Activated</span>;
      case 'expired':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">🔴 Expired</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getTimeInfo = (invitation: Invitation) => {
    const status = invitation.status.toLowerCase();
    
    if (status === 'activated') {
      const activatedDate = new Date(invitation.updated_at || invitation.created_at);
      return `Joined ${activatedDate.toLocaleDateString()}`;
    }
    
    if (status === 'expired') {
      return 'Expired';
    }
    
    // Pending - show time left
    const expiry = new Date(invitation.expires_at);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'Expired';
    if (diffDays === 1) return '1 day left';
    return `${diffDays} days left`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter invitations based on search term
  const filteredInvitations = invitations.filter(invitation =>
    invitation.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invitation.role_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invitation.invited_by_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredInvitations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedInvitations = filteredInvitations.slice(startIndex, startIndex + itemsPerPage);

  return (
    <Sidebar>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <main className="max-w-7xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center">
                  📧 User Invitations
                </h1>
                <p className="text-xl text-gray-600">
                  Manage all user invitations for your company
                </p>
              </div>
              
              <button
                onClick={() => router.push('/admin/invitations')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                ← Back to Invite User
              </button>
            </div>
          </div>

          {/* Actions Bar */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-lg border border-white/20 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              {/* Left Side - Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => router.push('/admin/invitations')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                >
                  ➕ New Invitation
                </button>
                
                {user?.role === 'SUPER_ADMIN' && (
                  <button
                    onClick={handleCleanupExpired}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
                  >
                    🧹 Cleanup Expired
                  </button>
                )}
              </div>

              {/* Right Side - Search and Filter */}
              <div className="flex space-x-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="🔍 Search invitations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all w-64"
                  />
                </div>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="activated">Activated</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
            </div>
          </div>

          {/* Invitations Table */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading invitations...</p>
            </div>
          ) : filteredInvitations.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Invitations Found</h3>
              <p className="text-gray-600">
                {invitations.length === 0 
                  ? "No invitations have been sent yet." 
                  : "No invitations match your current search."
                }
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/80">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Email</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Role</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Status</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Expires/Joined</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Invited By</th>
                        <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {paginatedInvitations.map((invitation) => (
                        <tr key={invitation.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {invitation.email}
                            </div>
                            <div className="text-xs text-gray-500">
                              Sent {formatDate(invitation.created_at)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {invitation.role_name}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {getStatusBadge(invitation.status)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {getTimeInfo(invitation)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {invitation.invited_by_email || 'System'}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-2">
                              {invitation.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleResendInvitation(invitation.id, invitation.email)}
                                    className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors duration-200"
                                    title="Resend Invitation"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleRevokeInvitation(invitation.id, invitation.email)}
                                    className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors duration-200"
                                    title="Revoke Invitation"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </>
                              )}
                              
                              {invitation.status === 'expired' && (
                                <button
                                  onClick={() => handleResendInvitation(invitation.id, invitation.email)}
                                  className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors duration-200"
                                  title="Resend Invitation"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                </button>
                              )}

                              {invitation.status === 'activated' && (
                                <div className="text-sm text-gray-500 italic">
                                  Active User
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredInvitations.length)} of {filteredInvitations.length} invitations
                  </div>
                  
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                      Previous
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 border rounded-md text-sm transition-colors ${
                          currentPage === page 
                            ? 'bg-blue-600 text-white border-blue-600' 
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Summary Stats */}
          {!isLoading && invitations.length > 0 && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {invitations.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Invitations</div>
                </div>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600 mb-2">
                    {invitations.filter(i => i.status === 'pending').length}
                  </div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {invitations.filter(i => i.status === 'activated').length}
                  </div>
                  <div className="text-sm text-gray-600">Activated</div>
                </div>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 mb-2">
                    {invitations.filter(i => i.status === 'expired').length}
                  </div>
                  <div className="text-sm text-gray-600">Expired</div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </Sidebar>
  );
}

export default function ManageInvitationsPage() {
  return (
    <ProtectedRoute requireRole="ADMIN">
      <ManageInvitationsContent />
    </ProtectedRoute>
  );
}