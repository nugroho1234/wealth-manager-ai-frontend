'use client';

import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import MeetingTrackerSidebar from '@/components/meeting-tracker/Sidebar';
import { useState, useEffect, useRef } from 'react';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

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

function AdminHierarchyContent() {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<number | null>(null);

  // CSV Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if user is admin
  const isAdmin = user?.role_id === 1 || user?.role_id === 2;

  useEffect(() => {
    if (isAdmin) {
      fetchMembers();
    }
  }, [page, searchQuery, levelFilter, isAdmin]);

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

      const res = await fetch(
        `${API_BASE_URL}/api/v1/admin/meeting-tracker/hierarchy/export`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error('Failed to export CSV');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `team-hierarchy-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV');
    }
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

  return (
    <MeetingTrackerSidebar>
      <div className="min-h-screen bg-gray-900 text-white">
        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Team Hierarchy Management</h1>
              <p className="text-gray-400">Manage team members and organizational structure</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUploadModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <span>📤</span>
                <span>Upload CSV</span>
              </button>
              <button
                onClick={exportCSV}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <span>📥</span>
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-gray-800 rounded-xl p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
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
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Filter by level
                </label>
                <select
                  value={levelFilter?.toString() || ''}
                  onChange={(e) => {
                    setLevelFilter(e.target.value ? parseInt(e.target.value) : null);
                    setPage(1);
                  }}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Levels</option>
                  <option value="1">Level 1 (Top)</option>
                  <option value="2">Level 2</option>
                  <option value="3">Level 3</option>
                  <option value="4">Level 4 (Bottom)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="text-sm text-gray-400 mb-1">Total Members</div>
              <div className="text-3xl font-bold">{total}</div>
            </div>
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="text-sm text-gray-400 mb-1">Level 1</div>
              <div className="text-3xl font-bold">
                {members.filter((m) => m.level === 1).length}
              </div>
            </div>
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="text-sm text-gray-400 mb-1">Level 2</div>
              <div className="text-3xl font-bold">
                {members.filter((m) => m.level === 2).length}
              </div>
            </div>
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="text-sm text-gray-400 mb-1">Levels 3-4</div>
              <div className="text-3xl font-bold">
                {members.filter((m) => m.level >= 3).length}
              </div>
            </div>
          </div>

          {/* Members Table */}
          <div className="bg-gray-800 rounded-xl overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-gray-400">Loading...</div>
            ) : members.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">👥</div>
                <h2 className="text-xl font-semibold mb-2">No Team Members Yet</h2>
                <p className="text-gray-400 mb-6">Upload a CSV file to get started</p>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                >
                  Upload CSV
                </button>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Level
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Position
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Manager
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Team
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {members.map((member) => (
                        <tr key={member.member_id} className="hover:bg-gray-750">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium">
                              {member.first_name} {member.last_name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                            {member.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500 bg-opacity-20 text-blue-400 border border-blue-500">
                              Level {member.level}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                            {member.position_title || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                            {member.manager_name || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-400">
                            {member.team_name || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="px-6 py-4 bg-gray-700 flex items-center justify-between">
                    <div className="text-sm text-gray-400">
                      Showing page {page} of {totalPages} ({total} total members)
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-800 disabled:text-gray-500 rounded-lg font-medium transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page === totalPages}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-800 disabled:text-gray-500 rounded-lg font-medium transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>

      {/* CSV Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Upload Team Hierarchy CSV</h2>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadResult(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* CSV Format Info */}
              <div className="bg-gray-700 rounded-lg p-4 mb-6">
                <h3 className="font-semibold mb-2">CSV Format Requirements:</h3>
                <div className="text-sm text-gray-300 space-y-1">
                  <div>• Email, Full Name, Manager Email, Level (required)</div>
                  <div>• Team Name, Position Title (optional)</div>
                  <div>• Level 1 must have empty Manager Email</div>
                  <div>• Level 2-4 must have Manager Email</div>
                  <div>• All emails must exist in users table</div>
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
                      ? 'border-blue-500 bg-blue-500 bg-opacity-10'
                      : 'border-gray-600 hover:border-gray-500'
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
                      <div className="text-lg font-medium">Uploading and validating...</div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-6xl mb-4">📄</div>
                      <div className="text-lg font-medium mb-2">
                        Drop CSV file here or click to browse
                      </div>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
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
                    <div className="bg-green-500 bg-opacity-20 border border-green-500 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">✅</span>
                        <div className="text-lg font-semibold text-green-400">
                          {uploadResult.message}
                        </div>
                      </div>
                      <div className="text-sm text-green-300">
                        Imported {uploadResult.imported} of {uploadResult.total_rows} team members
                      </div>
                    </div>
                  ) : (
                    <div className="bg-red-500 bg-opacity-20 border border-red-500 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">❌</span>
                        <div className="text-lg font-semibold text-red-400">
                          {uploadResult.message}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Validation Errors */}
                  {uploadResult.errors && uploadResult.errors.length > 0 && (
                    <div className="bg-gray-700 rounded-lg p-4">
                      <h3 className="font-semibold mb-3">
                        Validation Errors ({uploadResult.errors.length}):
                      </h3>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {uploadResult.errors.map((err, idx) => (
                          <div
                            key={idx}
                            className="bg-gray-800 rounded p-3 text-sm"
                          >
                            <div className="text-red-400 font-medium">
                              Row {err.row} - {err.field}
                            </div>
                            <div className="text-gray-300">{err.error}</div>
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
                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </MeetingTrackerSidebar>
  );
}

export default function AdminHierarchyPage() {
  return (
    <ProtectedRoute>
      <AdminHierarchyContent />
    </ProtectedRoute>
  );
}
