'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { apiClient } from '@/lib/api';

interface Role {
  id: number;
  name: string;
  description?: string;
}

interface RecentInvitation {
  id: number;
  email: string;
  role_name: string;
  status: string;
  created_at: string;
  expires_at: string;
  invited_by_email: string;
}

function InvitationsContent() {
  const { user } = useAuth();
  const { notifyError, notifySuccess } = useNotifications();
  const router = useRouter();
  
  const [email, setEmail] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState<number | ''>('');
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [recentInvitations, setRecentInvitations] = useState<RecentInvitation[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(true);

  useEffect(() => {
    fetchAvailableRoles();
    fetchRecentInvitations();
  }, []);

  const fetchAvailableRoles = async () => {
    try {
      setIsLoadingRoles(true);
      const response = await apiClient.get<{
        success: boolean;
        message: string;
        data: { roles: Role[]; user_role: string };
      }>('/api/v1/oracle/invitations/roles/available');
      
      
      setAvailableRoles(response.data.data?.roles || []);
    } catch (error: any) {
      console.error('Error fetching available roles:', error);
      console.error('Error details:', error.response?.data);
      
      // Fallback: Set roles based on current user role
      if (user) {
        const fallbackRoles: Role[] = [];
        
        if (user.role === 'SUPER_ADMIN') {
          fallbackRoles.push(
            { id: 1, name: 'SUPER_ADMIN' },
            { id: 2, name: 'ADMIN' },
            { id: 3, name: 'ADVISOR' },
            { id: 4, name: 'LEADER_1' },
            { id: 5, name: 'LEADER_2' },
            { id: 6, name: 'SENIOR_PARTNER' }
          );
        } else if (user.role === 'ADMIN') {
          fallbackRoles.push(
            { id: 3, name: 'ADVISOR' },
            { id: 4, name: 'LEADER_1' },
            { id: 5, name: 'LEADER_2' },
            { id: 6, name: 'SENIOR_PARTNER' }
          );
        }
        
        setAvailableRoles(fallbackRoles);
      }
      
      notifyError('Error', 'Failed to fetch available roles (using fallback)');
    } finally {
      setIsLoadingRoles(false);
    }
  };

  const fetchRecentInvitations = async () => {
    try {
      setIsLoadingInvitations(true);
      const response = await apiClient.get<{
        success: boolean;
        message: string;
        data: { invitations: RecentInvitation[] };
      }>('/api/v1/oracle/invitations?limit=5');
      
      setRecentInvitations(response.data.data.invitations || []);
    } catch (error: any) {
      console.error('Error fetching recent invitations:', error);
      notifyError('Error', 'Failed to fetch recent invitations');
    } finally {
      setIsLoadingInvitations(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !selectedRoleId) {
      notifyError('Validation Error', 'Please fill in all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        data: any;
      }>('/api/v1/oracle/invitations/invite', {
        email: email.trim(),
        role_id: selectedRoleId,
        expires_days: 7 // Default 7 days as requested
      });

      if (response.data.success) {
        notifySuccess('Success', `Invitation sent to ${email}`);
        setEmail('');
        setSelectedRoleId('');
        fetchRecentInvitations(); // Refresh the recent invitations
      }
    } catch (error: any) {
      console.error('Error sending invitation:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to send invitation';
      notifyError('Invitation Error', errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendInvitation = async (invitationId: number, email: string) => {
    try {
      await apiClient.post(`/api/v1/oracle/invitations/${invitationId}/resend`);
      notifySuccess('Success', `Invitation resent to ${email}`);
      fetchRecentInvitations();
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
      await apiClient.delete(`/api/v1/oracle/invitations/${invitationId}`);
      notifySuccess('Success', `Invitation for ${email} has been revoked`);
      fetchRecentInvitations();
    } catch (error: any) {
      console.error('Error revoking invitation:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to revoke invitation';
      notifyError('Revoke Error', errorMessage);
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

  const getTimeLeft = (expiresAt: string, status: string) => {
    if (status === 'activated') return 'Joined';
    if (status === 'expired') return 'Expired';
    
    const expiry = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 'Expired';
    if (diffDays === 1) return '1 day left';
    return `${diffDays} days left`;
  };

  return (
    <Sidebar>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <main className="max-w-7xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center">
                  📧 Invite New User
                </h1>
                <p className="text-xl text-gray-600">
                  Send invitation emails to expand your team
                </p>
              </div>
              
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Invitation Form - Left Side (2/3) */}
            <div className="lg:col-span-2">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Send Invitation</h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Email Field */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📧 Email Address*
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@company.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      required
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Role Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      👤 Role Assignment*
                    </label>
                    <select
                      value={selectedRoleId}
                      onChange={(e) => setSelectedRoleId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      required
                      disabled={isSubmitting || isLoadingRoles}
                    >
                      <option value="">Select a role...</option>
                      {availableRoles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                    {isLoadingRoles && (
                      <p className="text-sm text-gray-500 mt-1">Loading available roles...</p>
                    )}
                  </div>

                  {/* Form Actions */}
                  <div className="flex space-x-4">
                    <button
                      type="submit"
                      disabled={isSubmitting || !email || !selectedRoleId}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-3 px-6 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Sending Invitation...' : 'Send Invitation'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail('');
                        setSelectedRoleId('');
                      }}
                      disabled={isSubmitting}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:cursor-not-allowed"
                    >
                      Clear Form
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Recent Invitations Widget - Right Side (1/3) */}
            <div className="lg:col-span-1">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">📋 Recent Invitations</h3>
                  <button
                    onClick={() => router.push('/admin/invitations/manage')}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                  >
                    View All
                  </button>
                </div>

                {isLoadingInvitations ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-600 mt-2 text-sm">Loading invitations...</p>
                  </div>
                ) : recentInvitations.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">📭</div>
                    <p className="text-gray-600 text-sm">No invitations sent yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentInvitations.map((invitation) => (
                      <div key={invitation.id} className="p-4 bg-gray-50 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium text-gray-900 text-sm truncate">
                            {invitation.email}
                          </div>
                          {getStatusBadge(invitation.status)}
                        </div>
                        
                        <div className="text-xs text-gray-600 mb-3">
                          {invitation.role_name} • {getTimeLeft(invitation.expires_at, invitation.status)}
                        </div>
                        
                        {invitation.status === 'pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleResendInvitation(invitation.id, invitation.email)}
                              className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                            >
                              Resend
                            </button>
                            <button
                              onClick={() => handleRevokeInvitation(invitation.id, invitation.email)}
                              className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded hover:bg-red-200 transition-colors"
                            >
                              Revoke
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </Sidebar>
  );
}

export default function AdminInvitationsPage() {
  return (
    <ProtectedRoute requireRole="ADMIN">
      <InvitationsContent />
    </ProtectedRoute>
  );
}