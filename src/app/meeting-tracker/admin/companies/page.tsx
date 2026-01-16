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
}

export default function CompaniesListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draftCompanies, setDraftCompanies] = useState<Company[]>([]);
  const [activeCompanies, setActiveCompanies] = useState<Company[]>([]);
  const [activeTab, setActiveTab] = useState<'draft' | 'active'>('draft');

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
      setDraftCompanies(draftData);

      // Fetch active companies
      const activeResponse = await fetch(
        'http://localhost:8000/api/v1/admin/meeting-tracker/companies/active',
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!activeResponse.ok) throw new Error('Failed to fetch active companies');
      const activeData = await activeResponse.json();
      setActiveCompanies(activeData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueSetup = (companyId: string) => {
    router.push(`/meeting-tracker/admin/companies/${companyId}/import`);
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

  const displayedCompanies = activeTab === 'draft' ? draftCompanies : activeCompanies;

  return (
    <MeetingTrackerSidebar>
      <div className="min-h-screen bg-gray-900 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Companies</h1>
              <p className="text-gray-400">Manage company profiles and team hierarchies</p>
            </div>
            <button
              onClick={handleCreateNew}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
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

          {/* Tabs */}
          <div className="flex space-x-2 mb-6">
            <button
              onClick={() => setActiveTab('draft')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'draft'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Draft ({draftCompanies.length})
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'active'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Active ({activeCompanies.length})
            </button>
          </div>

          {/* Companies List */}
          {displayedCompanies.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-12 text-center">
              <div className="text-6xl mb-4">
                {activeTab === 'draft' ? '📝' : '🏢'}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                No {activeTab} companies yet
              </h3>
              <p className="text-gray-400 mb-6">
                {activeTab === 'draft'
                  ? 'Create a new company to get started'
                  : 'Import team data to activate draft companies'}
              </p>
              {activeTab === 'draft' && (
                <button
                  onClick={handleCreateNew}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Create First Company
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayedCompanies.map((company) => (
                <div
                  key={company.company_id}
                  className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors"
                >
                  {/* Company Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-1">{company.name}</h3>
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          company.status === 'draft'
                            ? 'bg-yellow-900/30 text-yellow-400'
                            : 'bg-green-900/30 text-green-400'
                        }`}
                      >
                        {company.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Company Details */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm">
                      <span className="text-gray-400 w-20">Email:</span>
                      <span className="text-gray-300">{company.email}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="text-gray-400 w-20">Phone:</span>
                      <span className="text-gray-300">{company.phone}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="text-gray-400 w-20">Location:</span>
                      <span className="text-gray-300">
                        {company.city}, {company.country}
                      </span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="text-gray-400 w-20">Timezone:</span>
                      <span className="text-gray-300">{company.timezone}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <span className="text-gray-400 w-20">Plan:</span>
                      <span className="text-gray-300 capitalize">
                        {company.plan_type.replace('_', ' ')}
                      </span>
                    </div>
                    {company.website && (
                      <div className="flex items-center text-sm">
                        <span className="text-gray-400 w-20">Website:</span>
                        <a
                          href={company.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:text-purple-300"
                        >
                          {company.website}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-4 border-t border-gray-700">
                    {company.status === 'draft' ? (
                      <button
                        onClick={() => handleContinueSetup(company.company_id)}
                        className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                      >
                        Continue Setup
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          router.push(`/meeting-tracker/admin/companies/${company.company_id}/view`)
                        }
                        className="w-full px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                      >
                        View Details
                      </button>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div className="mt-3 text-xs text-gray-500">
                    Created {new Date(company.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Info Box */}
          {activeTab === 'draft' && draftCompanies.length > 0 && (
            <div className="mt-6 bg-blue-900/20 border border-blue-700 rounded-lg p-4">
              <div className="flex items-start">
                <span className="text-blue-400 text-xl mr-3">ℹ️</span>
                <div>
                  <h3 className="text-blue-400 font-semibold mb-2">Draft Companies</h3>
                  <p className="text-blue-300 text-sm">
                    Draft companies are waiting for team hierarchy data. Click "Continue Setup" to upload
                    the CSV and activate the company.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MeetingTrackerSidebar>
  );
}
