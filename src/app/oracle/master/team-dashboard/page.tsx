'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { useState, useEffect, useRef } from 'react';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Company {
  company_id: string;
  name: string;
  status: string;
}

interface TeamMember {
  member_id: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  manager_id: string | null;
  manager_name: string | null;
  level: number;
  team_name: string | null;
  position_title: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  company?: {
    company_id: string;
    name: string;
  };
}

interface PaginatedResponse {
  members: TeamMember[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

interface ValidationError {
  row: number;
  field: string;
  error: string;
}

interface UploadResponse {
  success: boolean;
  validated: number;
  imported: number;
  errors: ValidationError[];
  total_rows: number;
  message: string;
}

function OracleTeamDashboardContent() {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<number | null>(null);
  const [companyFilter, setCompanyFilter] = useState<string>('');

  // Companies list for dropdown
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  // CSV Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Member state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    first_name: '',
    last_name: '',
    level: 1,
    manager_id: '',
    team_name: '',
    position_title: '',
  });

  // MASTER-only access
  const isMaster = user?.role_id === 7;

  useEffect(() => {
    if (isMaster) {
      fetchCompanies();
    }
  }, [isMaster]);

  // Only fetch members after company is selected
  useEffect(() => {
    if (isMaster && companyFilter) {
      fetchMembers();
    }
  }, [page, searchQuery, levelFilter, companyFilter, isMaster]);

  const fetchCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) return;
      const { access_token: token } = JSON.parse(authTokens);

      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/meeting-tracker/companies/active?limit=100`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error('Failed to fetch companies');

      const data: Company[] = await res.json();
      setCompanies(data);
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) return;
      const { access_token: token } = JSON.parse(authTokens);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });

      if (searchQuery) params.append('search', searchQuery);
      if (levelFilter) params.append('level', levelFilter.toString());
      if (companyFilter) params.append('company_id', companyFilter);

      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/meeting-tracker/hierarchy/members?${params}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error('Failed to fetch members');

      const data: PaginatedResponse = await res.json();
      setMembers(data.members);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (error) {
      console.error('Error fetching members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (file: File) => {
    if (file && file.name.endsWith('.csv')) {
      uploadCSV(file);
    } else {
      alert('Please select a CSV file');
    }
  };

  const uploadCSV = async (file: File) => {
    try {
      setUploading(true);
      setUploadResult(null);

      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) return;
      const { access_token: token } = JSON.parse(authTokens);

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/meeting-tracker/hierarchy/upload`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      const data: UploadResponse = await res.json();
      setUploadResult(data);

      if (data.success && data.imported > 0) {
        // Refresh the members list
        fetchMembers();
      }
    } catch (error) {
      console.error('Error uploading CSV:', error);
      setUploadResult({
        success: false,
        validated: 0,
        imported: 0,
        errors: [{ row: 0, field: 'CSV', error: 'Failed to upload file' }],
        total_rows: 0,
        message: 'Upload failed',
      });
    } finally {
      setUploading(false);
    }
  };

  const exportCSV = async () => {
    try {
      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) return;
      const { access_token: token } = JSON.parse(authTokens);

      const params = new URLSearchParams();
      if (companyFilter) params.append('company_id', companyFilter);

      const exportUrl = `${API_BASE_URL}/api/v1/admin/meeting-tracker/hierarchy/export${params.toString() ? `?${params}` : ''}`;

      const res = await fetch(exportUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to export CSV');

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `team-hierarchy-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV');
    }
  };

  const handleEditClick = (member: TeamMember) => {
    setEditingMember(member);
    setEditFormData({
      first_name: member.first_name,
      last_name: member.last_name,
      level: member.level,
      manager_id: member.manager_id || '',
      team_name: member.team_name || '',
      position_title: member.position_title || '',
    });
    setEditError(null);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingMember) return;

    try {
      setSaving(true);
      setEditError(null);

      const authTokens = localStorage.getItem('auth_tokens');
      if (!authTokens) return;
      const { access_token: token } = JSON.parse(authTokens);

      // Build update payload (only include changed fields)
      const updatePayload: any = {};

      if (editFormData.first_name !== editingMember.first_name) {
        updatePayload.first_name = editFormData.first_name;
      }
      if (editFormData.last_name !== editingMember.last_name) {
        updatePayload.last_name = editFormData.last_name;
      }
      if (editFormData.level !== editingMember.level) {
        updatePayload.level = editFormData.level;
      }
      if (editFormData.manager_id !== (editingMember.manager_id || '')) {
        updatePayload.manager_id = editFormData.manager_id || null;
      }
      if (editFormData.team_name !== (editingMember.team_name || '')) {
        updatePayload.team_name = editFormData.team_name || null;
      }
      if (editFormData.position_title !== (editingMember.position_title || '')) {
        updatePayload.position_title = editFormData.position_title || null;
      }

      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/meeting-tracker/hierarchy/members/${editingMember.member_id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatePayload),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to update team member');
      }

      // Success - refresh the members list and close modal
      await fetchMembers();
      setShowEditModal(false);
      setEditingMember(null);
    } catch (error: any) {
      console.error('Error updating team member:', error);
      setEditError(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Get available managers for the selected company (exclude the editing member itself)
  const getAvailableManagers = () => {
    if (!editingMember) return [];

    // Filter members from the same company and with level < editing member's level
    // Also exclude the member being edited to prevent self-reference
    return members.filter(
      (m) =>
        m.member_id !== editingMember.member_id &&
        m.level < editFormData.level &&
        (m.company?.company_id === editingMember.company?.company_id || !editingMember.company)
    );
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  if (!user) return null;

  if (!isMaster) {
    return (
      <Sidebar>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">Only MASTER users can access this page.</p>
          </div>
        </div>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Team Hierarchy Management</h1>
              <p className="text-gray-600">Manage team members and organizational structure</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <span>📤</span>
                <span>Upload CSV</span>
              </button>
              <button
                onClick={exportCSV}
                disabled={!companyFilter}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>📥</span>
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Company Selector - Required First */}
          <div className="bg-white rounded-xl p-6 mb-6 border border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Company <span className="text-red-500">*</span>
              </label>
              <select
                value={companyFilter}
                onChange={(e) => {
                  setCompanyFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 bg-gray-100 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loadingCompanies}
              >
                <option value="">-- Select a company to view team members --</option>
                {companies.filter((c) => c.status !== 'inactive').map((company) => (
                  <option key={company.company_id} value={company.company_id}>
                    {company.name}
                  </option>
                ))}
              </select>
              {!companyFilter && (
                <p className="text-gray-500 text-sm mt-2">
                  Please select a company to view and manage team members
                </p>
              )}
            </div>
          </div>

          {/* Only show below sections if company is selected */}
          {companyFilter && (
            <>
              {/* Filters */}
              <div className="bg-white rounded-xl p-6 mb-6 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search by name or email
                    </label>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setPage(1);
                      }}
                      placeholder="Type to search..."
                      className="w-full px-4 py-2 bg-gray-100 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Filter by level
                    </label>
                    <select
                      value={levelFilter?.toString() || ''}
                      onChange={(e) => {
                        setLevelFilter(e.target.value ? parseInt(e.target.value) : null);
                        setPage(1);
                      }}
                      className="w-full px-4 py-2 bg-gray-100 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">All Levels</option>
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => (
                        <option key={level} value={level}>
                          Level {level}{level === 1 ? ' (Top)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <div className="text-sm text-gray-600 mb-1">Total Members</div>
                  <div className="text-3xl font-bold text-gray-900">{total}</div>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <div className="text-sm text-gray-600 mb-1">Level 1</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {members.filter((m) => m.level === 1).length}
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <div className="text-sm text-gray-600 mb-1">Level 2</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {members.filter((m) => m.level === 2).length}
                  </div>
                </div>
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                  <div className="text-sm text-gray-600 mb-1">Levels 3-4</div>
                  <div className="text-3xl font-bold text-gray-900">
                    {members.filter((m) => m.level >= 3).length}
                  </div>
                </div>
              </div>

              {/* Members Table */}
              <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
                {loading ? (
                  <div className="p-12 text-center text-gray-600">Loading...</div>
                ) : members.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="text-6xl mb-4">👥</div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">No Team Members Yet</h2>
                    <p className="text-gray-600 mb-6">Upload a CSV file to get started</p>
                    <button
                      onClick={() => setShowUploadModal(true)}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Upload CSV
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Email
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Level
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Position
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Manager
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Team
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {members.map((member) => (
                            <tr key={member.member_id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="font-medium text-gray-900">
                                  {member.first_name} {member.last_name}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                {member.email}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-600 border border-blue-300">
                                  Level {member.level}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                {member.position_title || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                {member.manager_name || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                                {member.team_name || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <button
                                  onClick={() => handleEditClick(member)}
                                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                                >
                                  Edit
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="px-6 py-4 bg-gray-100 flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                          Showing page {page} of {totalPages} ({total} total members)
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPage(Math.max(1, page - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 text-gray-900 rounded-lg font-medium transition-colors"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setPage(Math.min(totalPages, page + 1))}
                            disabled={page === totalPages}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:text-gray-400 text-gray-900 rounded-lg font-medium transition-colors"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* CSV Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Upload Team Hierarchy CSV</h2>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadResult(null);
                  }}
                  className="text-gray-500 hover:text-gray-900"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* CSV Format Info */}
              <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-2">CSV Format Requirements:</h3>
                <div className="text-sm text-gray-700 space-y-1">
                  <div>• Email, Full Name, Manager Email, Level (required)</div>
                  <div>• Team Name, Position Title (optional)</div>
                  <div>• Level 1 must have empty Manager Email</div>
                  <div>• Level 2-4 must have Manager Email</div>
                  <div>• All emails must exist in users table</div>
                  <div>• <strong>Filename determines company</strong> (e.g., CompanyName_team.csv)</div>
                </div>
              </div>

              {/* Upload Area */}
              {!uploadResult && (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-12 text-center ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  } transition-colors`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                  />

                  {uploading ? (
                    <div>
                      <div className="text-4xl mb-4">⏳</div>
                      <div className="text-lg font-medium text-gray-900">Uploading and validating...</div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-6xl mb-4">📄</div>
                      <div className="text-lg font-medium text-gray-900 mb-2">
                        Drop CSV file here or click to browse
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                      >
                        Select File
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Upload Result */}
              {uploadResult && (
                <div className="space-y-4">
                  {uploadResult.success ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">✅</span>
                        <div className="text-lg font-semibold text-green-700">
                          {uploadResult.message}
                        </div>
                      </div>
                      <div className="text-sm text-green-600">
                        Imported {uploadResult.imported} of {uploadResult.total_rows} team members
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">❌</span>
                        <div className="text-lg font-semibold text-red-700">
                          {uploadResult.message}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Validation Errors */}
                  {uploadResult.errors && uploadResult.errors.length > 0 && (
                    <div className="bg-gray-100 rounded-lg p-4 border border-gray-200">
                      <h3 className="font-semibold text-gray-900 mb-3">
                        Validation Errors ({uploadResult.errors.length}):
                      </h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {uploadResult.errors.map((err, idx) => (
                          <div
                            key={idx}
                            className="bg-white rounded p-3 text-sm border border-red-200"
                          >
                            <div className="text-red-600 font-medium">
                              Row {err.row} - {err.field}
                            </div>
                            <div className="text-gray-700">{err.error}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      setUploadResult(null);
                      setShowUploadModal(false);
                    }}
                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditModal && editingMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Edit Team Member</h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingMember(null);
                    setEditError(null);
                  }}
                  className="text-gray-500 hover:text-gray-900"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Member Info */}
              <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
                <div className="text-sm text-gray-600">Editing member:</div>
                <div className="text-lg font-semibold text-gray-900">{editingMember.email}</div>
              </div>

              {/* Error Alert */}
              {editError && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <span className="text-red-500 text-xl mr-3">⚠️</span>
                    <div>
                      <h3 className="text-red-700 font-semibold mb-1">Error</h3>
                      <p className="text-red-600 text-sm">{editError}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit Form */}
              <div className="space-y-4">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={editFormData.first_name}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, first_name: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-gray-100 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter first name"
                  />
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={editFormData.last_name}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, last_name: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-gray-100 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter last name"
                  />
                </div>

                {/* Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Level * (Lower number = higher rank)
                  </label>
                  <select
                    value={editFormData.level}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, level: parseInt(e.target.value) })
                    }
                    className="w-full px-4 py-2 bg-gray-100 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((level) => (
                      <option key={level} value={level}>
                        Level {level}{level === 1 ? ' (Top)' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Note: If this member has subordinates, the new level must be lower (smaller number) than all subordinate levels.
                  </p>
                </div>

                {/* Manager */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Manager {editFormData.level > 1 ? '*' : '(Level 1 cannot have manager)'}
                  </label>
                  <select
                    value={editFormData.manager_id}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, manager_id: e.target.value })
                    }
                    disabled={editFormData.level === 1}
                    className="w-full px-4 py-2 bg-gray-100 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">No Manager</option>
                    {getAvailableManagers().map((manager) => (
                      <option key={manager.member_id} value={manager.member_id}>
                        {manager.first_name} {manager.last_name} (Level {manager.level})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Only members with level lower (smaller number) than {editFormData.level} can be selected.
                  </p>
                </div>

                {/* Team Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Name
                  </label>
                  <input
                    type="text"
                    value={editFormData.team_name}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, team_name: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-gray-100 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Engineering, Sales, Marketing"
                  />
                </div>

                {/* Position Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Position Title
                  </label>
                  <input
                    type="text"
                    value={editFormData.position_title}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, position_title: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-gray-100 border border-gray-300 text-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Senior Engineer, Sales Manager"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingMember(null);
                    setEditError(null);
                  }}
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={saving || !editFormData.first_name || !editFormData.last_name}
                  className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Sidebar>
  );
}

export default function OracleTeamDashboardPage() {
  return (
    <ProtectedRoute>
      <OracleTeamDashboardContent />
    </ProtectedRoute>
  );
}
