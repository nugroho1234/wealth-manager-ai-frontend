'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MeetingTrackerSidebar from '@/components/meeting-tracker/Sidebar';
import { useAuth } from '@/contexts/AuthContext';

interface Company {
  company_id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  timezone: string;
  plan_type: string;
  status: string;
  website?: string;
  created_at: string;
  updated_at?: string;
  team_member_count?: number; // Only present for active companies
}

export default function CompaniesListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allCompanies, setAllCompanies] = useState<Company[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'draft' | 'active' | 'inactive'>('all');

  // Add Members modal state
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [addMemberData, setAddMemberData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    manager_id: '',
    level: 1,
    team_name: '',
    position_title: '',
  });
  const [addMemberError, setAddMemberError] = useState<string | null>(null);
  const [addingMember, setAddingMember] = useState(false);
  const [availableManagers, setAvailableManagers] = useState<any[]>([]);

  // Existing user confirmation state
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [existingUserData, setExistingUserData] = useState<any>(null);

  // Check admin access
  const isAdmin = user?.role_id === 1 || user?.role_id === 2;

  useEffect(() => {
    if (isAdmin && user) {
      fetchCompanies();
    } else if (!isAdmin && user) {
      // Not admin but user loaded - stop loading
      setLoading(false);
    }
  }, [isAdmin, user]);

  const fetchCompanies = async () => {
    try {
      const authTokensStr = localStorage.getItem('auth_tokens');
      if (!authTokensStr) {
        setError('No authentication token found. Please log in again.');
        setLoading(false);
        return;
      }

      const authTokens = JSON.parse(authTokensStr);
      const token = authTokens.access_token;

      if (!token) {
        setError('No authentication token found. Please log in again.');
        setLoading(false);
        return;
      }

      // Fetch draft companies
      const draftResponse = await fetch(
        'http://localhost:8000/api/v1/admin/meeting-tracker/companies/drafts',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!draftResponse.ok) throw new Error('Failed to fetch draft companies');
      const draftData = await draftResponse.json();

      // Fetch active companies
      const activeResponse = await fetch(
        'http://localhost:8000/api/v1/admin/meeting-tracker/companies/active',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!activeResponse.ok) throw new Error('Failed to fetch active companies');
      const activeData = await activeResponse.json();

      // Fetch inactive companies
      const inactiveResponse = await fetch(
        'http://localhost:8000/api/v1/admin/meeting-tracker/companies/inactive',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!inactiveResponse.ok) throw new Error('Failed to fetch inactive companies');
      const inactiveData = await inactiveResponse.json();

      // Combine all companies
      setAllCompanies([...draftData, ...activeData, ...inactiveData]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (companyId: string) => {
    router.push(`/meeting-tracker/admin/companies/${companyId}/edit`);
  };

  const handleImportCSV = (companyId: string) => {
    router.push(`/meeting-tracker/admin/companies/${companyId}/import`);
  };

  const handleAddMembers = async (companyId: string) => {
    setSelectedCompanyId(companyId);
    setAddMemberData({
      email: '',
      first_name: '',
      last_name: '',
      phone: '',
      manager_id: '',
      level: 1,
      team_name: '',
      position_title: '',
    });
    setAddMemberError(null);

    // Fetch available managers for this company
    await fetchAvailableManagers(companyId);

    setShowAddMemberModal(true);
  };

  const fetchAvailableManagers = async (companyId: string) => {
    try {
      const authTokensStr = localStorage.getItem('auth_tokens');
      if (!authTokensStr) return;

      const authTokens = JSON.parse(authTokensStr);
      const token = authTokens.access_token;

      const response = await fetch(
        `http://localhost:8000/api/v1/admin/meeting-tracker/hierarchy/members?company_id=${companyId}&limit=100`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to fetch managers');
      const data = await response.json();

      setAvailableManagers(data.members || []);
    } catch (err: any) {
      console.error('Error fetching managers:', err);
      setAvailableManagers([]);
    }
  };

  const handleSaveAddMember = async () => {
    if (!selectedCompanyId) return;

    try {
      setAddingMember(true);
      setAddMemberError(null);

      const authTokensStr = localStorage.getItem('auth_tokens');
      if (!authTokensStr) {
        throw new Error('No authentication token found');
      }

      const authTokens = JSON.parse(authTokensStr);
      const token = authTokens.access_token;

      const response = await fetch(
        'http://localhost:8000/api/v1/admin/meeting-tracker/hierarchy/members/with-user',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: addMemberData.email,
            first_name: addMemberData.first_name,
            last_name: addMemberData.last_name,
            phone: addMemberData.phone || null,
            company_id: selectedCompanyId,
            manager_id: addMemberData.manager_id || null,
            level: addMemberData.level,
            team_name: addMemberData.team_name || null,
            position_title: addMemberData.position_title || null,
          }),
        }
      );

      if (response.status === 409) {
        // User already exists - show confirmation dialog
        const errorData = await response.json();
        setExistingUserData(errorData.detail);
        setShowConfirmation(true);
        setAddingMember(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to add member');
      }

      // Success - close modal and refresh companies
      setShowAddMemberModal(false);
      setSelectedCompanyId(null);
      await fetchCompanies();
    } catch (err: any) {
      setAddMemberError(err.message);
    } finally {
      setAddingMember(false);
    }
  };

  const handleConfirmLinkExisting = async () => {
    if (!selectedCompanyId || !existingUserData) return;

    try {
      setAddingMember(true);
      setAddMemberError(null);

      const authTokensStr = localStorage.getItem('auth_tokens');
      if (!authTokensStr) {
        throw new Error('No authentication token found');
      }

      const authTokens = JSON.parse(authTokensStr);
      const token = authTokens.access_token;

      const response = await fetch(
        'http://localhost:8000/api/v1/admin/meeting-tracker/hierarchy/members/link-existing',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_id: existingUserData.user_id,
            company_id: selectedCompanyId,
            manager_id: addMemberData.manager_id || null,
            level: addMemberData.level,
            team_name: addMemberData.team_name || null,
            position_title: addMemberData.position_title || null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to link existing user');
      }

      // Success - close all modals and refresh companies
      setShowConfirmation(false);
      setShowAddMemberModal(false);
      setSelectedCompanyId(null);
      setExistingUserData(null);
      await fetchCompanies();
    } catch (err: any) {
      setAddMemberError(err.message);
      setShowConfirmation(false);
    } finally {
      setAddingMember(false);
    }
  };

  const getFilteredManagers = () => {
    return availableManagers.filter(m => m.level < addMemberData.level);
  };

  const handleDelete = async (companyId: string, companyName: string, status: string) => {
    try {
      const authTokensStr = localStorage.getItem('auth_tokens');
      if (!authTokensStr) {
        throw new Error('No authentication token found');
      }

      const authTokens = JSON.parse(authTokensStr);
      const token = authTokens.access_token;

      if (status === 'draft') {
        // Delete draft company
        if (!confirm(`Are you sure you want to delete "${companyName}"? This action cannot be undone.`)) {
          return;
        }

        const response = await fetch(
          `http://localhost:8000/api/v1/admin/meeting-tracker/companies/${companyId}`,
          {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to delete company');
        }
      } else if (status === 'active') {
        // Deactivate active company
        if (!confirm(`Are you sure you want to deactivate "${companyName}"? Users from this company will not be able to log in.`)) {
          return;
        }

        const response = await fetch(
          `http://localhost:8000/api/v1/admin/meeting-tracker/companies/${companyId}/deactivate`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to deactivate company');
        }
      } else if (status === 'inactive') {
        // Reactivate inactive company
        if (!confirm(`Are you sure you want to reactivate "${companyName}"? Users from this company will be able to log in again.`)) {
          return;
        }

        const response = await fetch(
          `http://localhost:8000/api/v1/admin/meeting-tracker/companies/${companyId}/activate`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || 'Failed to activate company');
        }
      }

      // Refresh companies list
      await fetchCompanies();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateNew = () => {
    router.push('/meeting-tracker/admin/companies/new');
  };

  if (!isAdmin) {
    return (
      <MeetingTrackerSidebar>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-gray-400">You need admin privileges to access this page.</p>
          </div>
        </div>
      </MeetingTrackerSidebar>
    );
  }

  if (loading) {
    return (
      <MeetingTrackerSidebar>
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
          <div className="text-white text-xl">Loading...</div>
        </div>
      </MeetingTrackerSidebar>
    );
  }

  // Filter companies based on active tab
  const filteredCompanies = allCompanies.filter((company) => {
    if (filterTab === 'all') return true;
    return company.status === filterTab;
  });

  const draftCount = allCompanies.filter((c) => c.status === 'draft').length;
  const activeCount = allCompanies.filter((c) => c.status === 'active').length;
  const inactiveCount = allCompanies.filter((c) => c.status === 'inactive').length;

  return (
    <MeetingTrackerSidebar>
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Companies</h1>
              <p className="text-gray-400">Manage company profiles and team hierarchies</p>
            </div>
            <button
              onClick={handleCreateNew}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              + Create Company
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 bg-red-900/20 border border-red-700 rounded-lg p-4">
              <div className="flex items-start">
                <span className="text-red-400 text-xl mr-3">⚠️</span>
                <div>
                  <h3 className="text-red-400 font-semibold mb-1">Error</h3>
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Filter Tabs */}
          <div className="flex space-x-2 mb-6">
            <button
              onClick={() => setFilterTab('all')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                filterTab === 'all'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              All ({allCompanies.length})
            </button>
            <button
              onClick={() => setFilterTab('draft')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                filterTab === 'draft'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Draft ({draftCount})
            </button>
            <button
              onClick={() => setFilterTab('active')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                filterTab === 'active'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setFilterTab('inactive')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                filterTab === 'inactive'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Inactive ({inactiveCount})
            </button>
          </div>

          {/* Companies Table */}
          {filteredCompanies.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-12 text-center">
              <div className="text-6xl mb-4">🏢</div>
              <h3 className="text-xl font-semibold text-white mb-2">
                No companies found
              </h3>
              <p className="text-gray-400 mb-6">
                {filterTab === 'all'
                  ? 'Create a new company to get started'
                  : `No ${filterTab} companies yet`}
              </p>
              <button
                onClick={handleCreateNew}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                Create First Company
              </button>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Company Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredCompanies.map((company) => (
                    <tr key={company.company_id} className="hover:bg-gray-750">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-white">{company.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                        {company.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                              company.status === 'draft'
                                ? 'bg-yellow-900/30 text-yellow-400'
                                : company.status === 'active'
                                ? 'bg-green-900/30 text-green-400'
                                : 'bg-gray-700 text-gray-400'
                            }`}
                          >
                            {company.status.toUpperCase()}
                          </span>
                          {company.status === 'active' && company.team_member_count === 0 && (
                            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-orange-900/30 text-orange-400">
                              NO TEAM DATA
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => handleEdit(company.company_id)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                          >
                            Edit
                          </button>
                          {company.status === 'draft' && (
                            <button
                              onClick={() => handleDelete(company.company_id, company.name, company.status)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                            >
                              Delete
                            </button>
                          )}
                          {company.status === 'active' && (
                            <button
                              onClick={() => handleDelete(company.company_id, company.name, company.status)}
                              className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded transition-colors"
                            >
                              Deactivate
                            </button>
                          )}
                          {company.status === 'inactive' && (
                            <button
                              onClick={() => handleDelete(company.company_id, company.name, company.status)}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                            >
                              Activate
                            </button>
                          )}
                          {(company.status === 'draft' ||
                            (company.status === 'active' && company.team_member_count === 0)) && (
                            <button
                              onClick={() => handleImportCSV(company.company_id)}
                              className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded transition-colors"
                            >
                              Import CSV
                            </button>
                          )}
                          <button
                            onClick={() => handleAddMembers(company.company_id)}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded transition-colors"
                          >
                            Add Members
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Members Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6">Add Team Member</h2>

            {addMemberError && (
              <div className="mb-6 bg-red-900/20 border border-red-700 rounded-lg p-4">
                <div className="flex items-start">
                  <span className="text-red-400 text-xl mr-3">⚠️</span>
                  <div>
                    <h3 className="text-red-400 font-semibold mb-1">Error</h3>
                    <p className="text-red-300 text-sm">{addMemberError}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={addMemberData.email}
                  onChange={(e) => setAddMemberData({ ...addMemberData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  First Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={addMemberData.first_name}
                  onChange={(e) => setAddMemberData({ ...addMemberData, first_name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Last Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={addMemberData.last_name}
                  onChange={(e) => setAddMemberData({ ...addMemberData, last_name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={addMemberData.phone}
                  onChange={(e) => setAddMemberData({ ...addMemberData, phone: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Level */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Level <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={addMemberData.level}
                  onChange={(e) => setAddMemberData({ ...addMemberData, level: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Hierarchy level (1-10). Level 1 is top-level (no manager).</p>
              </div>

              {/* Manager */}
              {addMemberData.level > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Manager {addMemberData.level > 1 && <span className="text-red-400">*</span>}
                  </label>
                  <select
                    value={addMemberData.manager_id}
                    onChange={(e) => setAddMemberData({ ...addMemberData, manager_id: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required={addMemberData.level > 1}
                  >
                    <option value="">Select a manager</option>
                    {getFilteredManagers().map((manager) => (
                      <option key={manager.member_id} value={manager.member_id}>
                        {manager.first_name} {manager.last_name} (Level {manager.level})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    Managers must be from a lower level. {getFilteredManagers().length} available.
                  </p>
                </div>
              )}

              {/* Team Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  value={addMemberData.team_name}
                  onChange={(e) => setAddMemberData({ ...addMemberData, team_name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Position Title */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Position Title
                </label>
                <input
                  type="text"
                  value={addMemberData.position_title}
                  onChange={(e) => setAddMemberData({ ...addMemberData, position_title: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setSelectedCompanyId(null);
                  setAddMemberError(null);
                }}
                disabled={addingMember}
                className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAddMember}
                disabled={addingMember || !addMemberData.email || !addMemberData.first_name || !addMemberData.last_name || (addMemberData.level > 1 && !addMemberData.manager_id)}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingMember ? 'Adding...' : 'Add Member'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Existing User */}
      {showConfirmation && existingUserData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">⚠️</span>
                <h2 className="text-2xl font-bold text-white">User Already Exists</h2>
              </div>

              <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 mb-4">
                <p className="text-blue-300 text-sm mb-3">
                  A user with email <strong>{addMemberData.email}</strong> already exists in the system:
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Name:</span>
                    <span className="text-white font-medium">
                      {existingUserData.first_name} {existingUserData.last_name}
                    </span>
                  </div>
                </div>
              </div>

              <p className="text-gray-300 text-sm mb-4">
                Would you like to add this existing user to the team hierarchy with the following details?
              </p>

              <div className="bg-gray-700 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Level:</span>
                  <span className="text-white">{addMemberData.level}</span>
                </div>
                {addMemberData.team_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Team:</span>
                    <span className="text-white">{addMemberData.team_name}</span>
                  </div>
                )}
                {addMemberData.position_title && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Position:</span>
                    <span className="text-white">{addMemberData.position_title}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setExistingUserData(null);
                }}
                disabled={addingMember}
                className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLinkExisting}
                disabled={addingMember}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingMember ? 'Linking...' : 'Yes, Link This User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </MeetingTrackerSidebar>
  );
}
