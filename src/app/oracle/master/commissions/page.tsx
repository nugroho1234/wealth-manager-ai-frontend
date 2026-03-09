'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { UserRole } from '@/types/auth';
import { useRouter } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Insurance {
  insurance_id: string;
  insurance_name: string;
  category: string;
  discontinued: boolean;
  company_id: string;
  company_name: string;
}

interface Company {
  company_id: string;
  name: string;
}

function MasterCommissionsContent() {
  const { user } = useAuth();
  const router = useRouter();

  // State management
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCompanies, setLoadingCompanies] = useState(true);

  // Filter states
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [companySearchQuery, setCompanySearchQuery] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalInsurances, setTotalInsurances] = useState(0);
  const itemsPerPage = 20;

  // Fetch companies on mount
  useEffect(() => {
    fetchCompanies();
  }, []);

  // Fetch insurances when filters change
  useEffect(() => {
    fetchInsurances();
  }, [selectedCompanyId, searchQuery, currentPage]);

  const getAuthToken = () => {
    const authTokensStr = localStorage.getItem('auth_tokens');
    if (authTokensStr) {
      try {
        const authTokens = JSON.parse(authTokensStr);
        return authTokens?.access_token;
      } catch (e) {
        console.error('Failed to parse auth tokens:', e);
      }
    }
    return null;
  };

  const fetchCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const token = getAuthToken();

      if (!token) {
        alert('No authentication token found. Please log out and log back in.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/v1/oracle/companies`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Companies API response:', result);
        // The companies endpoint returns { success, companies, total_count, message }
        const companiesData = result.companies || [];
        console.log('Companies loaded:', companiesData.length);
        setCompanies(companiesData);

        // Set default company if user has company_id
        if (user?.company_id && !selectedCompanyId) {
          console.log('Setting default company to user company_id:', user.company_id);
          setSelectedCompanyId(user.company_id);
        }
      } else {
        console.error('Failed to fetch companies:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const fetchInsurances = async () => {
    try {
      setLoading(true);
      const token = getAuthToken();

      if (!token) {
        alert('No authentication token found. Please log out and log back in.');
        return;
      }

      // Build query parameters
      const params = new URLSearchParams();
      if (selectedCompanyId) {
        params.append('company_id', selectedCompanyId);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }
      params.append('limit', itemsPerPage.toString());
      params.append('offset', ((currentPage - 1) * itemsPerPage).toString());

      const url = `${API_BASE_URL}/api/v1/oracle/master/commissions?${params.toString()}`;
      console.log('Fetching insurances with URL:', url);
      console.log('Selected company ID:', selectedCompanyId);
      console.log('Search query:', searchQuery);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('API Response:', result);
        if (result.success && result.data) {
          console.log('Insurances received:', result.data.insurances?.length, 'Total:', result.data.total);
          setInsurances(result.data.insurances || []);
          setTotalInsurances(result.data.total || 0);
        } else {
          setInsurances([]);
          setTotalInsurances(0);
        }
      } else if (response.status === 403) {
        alert('You do not have permission to access this page. MASTER role required.');
        router.push('/oracle/dashboard');
      } else {
        console.error('Failed to fetch insurances:', response.statusText);
        setInsurances([]);
        setTotalInsurances(0);
      }
    } catch (error) {
      console.error('Error fetching insurances:', error);
      setInsurances([]);
      setTotalInsurances(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleCompanyChange = (value: string) => {
    setSelectedCompanyId(value);
    setCurrentPage(1); // Reset to first page on company change
  };

  const handleViewCommissions = (insurance: Insurance) => {
    // Navigate to commission detail page
    // Pass insurance name and company name as query parameters
    const queryParams = new URLSearchParams({
      name: insurance.insurance_name,
      company: insurance.company_name || 'Unknown Company'
    });
    router.push(`/oracle/master/commissions/${insurance.insurance_id}?${queryParams.toString()}`);
  };

  // Filter companies for dropdown based on search
  const filteredCompanies = companies.filter(company =>
    company.name.toLowerCase().includes(companySearchQuery.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(totalInsurances / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalInsurances);

  return (
    <Sidebar>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <main className="p-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Global Commission Management
            </h1>
            <p className="text-gray-600">
              Manage commissions for insurances across all companies
            </p>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Company Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Company
                </label>
                <div className="relative">
                  <select
                    value={selectedCompanyId}
                    onChange={(e) => handleCompanyChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loadingCompanies}
                  >
                    <option value="">All Companies</option>
                    {companies.map((company) => (
                      <option key={company.company_id} value={company.company_id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                  {loadingCompanies && (
                    <div className="absolute right-3 top-3">
                      <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Insurance Name Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Insurance Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder="Search by insurance name..."
                    className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <svg
                    className="absolute left-3 top-3 h-5 w-5 text-gray-400"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                  </svg>
                </div>
              </div>
            </div>

            {/* Active Filters Summary */}
            {(selectedCompanyId || searchQuery) && (
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                <span className="font-medium">Active filters:</span>
                {selectedCompanyId && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                    Company: {companies.find(c => c.company_id === selectedCompanyId)?.name}
                  </span>
                )}
                {searchQuery && (
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full">
                    Search: "{searchQuery}"
                  </span>
                )}
                <button
                  onClick={() => {
                    setSelectedCompanyId('');
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="ml-2 text-blue-600 hover:text-blue-800 underline"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Results Summary */}
          <div className="mb-4 flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {loading ? (
                'Loading...'
              ) : totalInsurances === 0 ? (
                'No insurances found'
              ) : (
                `Showing ${startIndex}-${endIndex} of ${totalInsurances} insurances`
              )}
            </p>
          </div>

          {/* Insurances Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                <p className="mt-4 text-gray-600">Loading insurances...</p>
              </div>
            ) : insurances.length === 0 ? (
              <div className="p-12 text-center">
                <svg
                  className="mx-auto h-16 w-16 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  {selectedCompanyId || searchQuery
                    ? 'No insurances match your filters'
                    : 'No insurances found in the system'}
                </h3>
                <p className="mt-2 text-sm text-gray-600">
                  {selectedCompanyId || searchQuery
                    ? 'Try adjusting your company selection or search term'
                    : 'Upload insurances to start managing commissions'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Insurance Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {insurances.map((insurance) => (
                      <tr key={insurance.insurance_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {insurance.company_name || (
                              <span className="text-gray-400">No company</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{insurance.insurance_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {insurance.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {insurance.discontinued ? (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              Discontinued
                            </span>
                          ) : (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleViewCommissions(insurance)}
                            className="text-blue-600 hover:text-blue-900 font-medium"
                          >
                            View Commissions
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {!loading && totalInsurances > 0 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentPage === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                  }`}
                >
                  Previous
                </button>

                {/* Page numbers */}
                <div className="flex gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    currentPage === totalPages
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                  }`}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </Sidebar>
  );
}

export default function MasterCommissionsPage() {
  return (
    <ProtectedRoute allowedRoles={[UserRole.MASTER]}>
      <MasterCommissionsContent />
    </ProtectedRoute>
  );
}
