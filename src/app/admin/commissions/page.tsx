'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { UserRole } from '@/types/auth';
import { useRouter } from 'next/navigation';

interface Insurance {
  insurance_id: string;
  insurance_name: string;
  provider: string;
  category: string;
  commission_count?: number;
  role_commission?: {
    year_1: number;
    year_2: number;
    year_3: number;
  };
}

function CommissionsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [insurances, setInsurances] = useState<Insurance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Get the role ID to display commission rates for
  const getDisplayRoleId = () => {
    const roleMap: Record<string, number> = {
      'SUPER_ADMIN': 6, // SUPER_ADMIN sees SENIOR_PARTNER rates
      'ADMIN': 6,       // ADMIN sees SENIOR_PARTNER rates  
      'ADVISOR': 3,
      'LEADER_1': 4,
      'LEADER_2': 5,
      'SENIOR_PARTNER': 6
    };
    return roleMap[user?.role || ''] || 3; // Default to ADVISOR if unknown
  };
  
  // Get display name for the role
  const getRoleDisplayName = () => {
    const roleNames: Record<string, string> = {
      'SUPER_ADMIN': 'Senior Partner',
      'ADMIN': 'Senior Partner',
      'ADVISOR': 'Advisor',
      'LEADER_1': 'Leader 1',
      'LEADER_2': 'Leader 2', 
      'SENIOR_PARTNER': 'Senior Partner'
    };
    return roleNames[user?.role || ''] || 'Advisor';
  };

  useEffect(() => {
    fetchInsurances();
  }, []);

  const fetchInsurances = async () => {
    try {
      // Get token from the same storage method used by the auth system
      const authTokensStr = localStorage.getItem('auth_tokens');
      let token = null;
      
      if (authTokensStr) {
        try {
          const authTokens = JSON.parse(authTokensStr);
          token = authTokens?.access_token;
        } catch (e) {
          console.error('Failed to parse auth tokens:', e);
        }
      }
      
      if (!token) {
        alert('No authentication token found. Please log out and log back in.');
        return;
      }
      
      // Use the new optimized endpoint that returns products with commission data in one call
      const displayRoleId = getDisplayRoleId();
      const response = await fetch(`http://localhost:8000/api/v1/commissions/products-with-commissions?display_role_id=${displayRoleId}&limit=2000`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Optimized Products API response:', result); // Debug log
        
        // Extract data from BaseResponse format
        const insurancesData = result.success && result.data ? result.data : [];
        
        // Data already includes commission_count and role_commission - no additional processing needed!
        setInsurances(insurancesData);
      } else {
        const errorResult = await response.text();
        console.error('Failed to fetch insurances:', {
          status: response.status,
          statusText: response.statusText,
          error: errorResult
        });
        alert(`Failed to fetch insurances: ${response.status} ${response.statusText}\n\nResponse: ${errorResult.substring(0, 200)}...`);
      }
    } catch (error) {
      console.error('Error fetching insurances:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInsurances = insurances.filter((insurance) => {
    const matchesSearch = insurance.insurance_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         insurance.provider.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || insurance.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['All', ...Array.from(new Set(insurances.map(i => i.category)))];

  const handleEditCommissions = (insurance: Insurance) => {
    router.push(`/admin/commissions/${insurance.insurance_id}?name=${encodeURIComponent(insurance.insurance_name)}&provider=${encodeURIComponent(insurance.provider)}`);
  };

  // Restrict access to SUPER_ADMIN only
  if (user?.role !== UserRole.SUPER_ADMIN) {
    return (
      <Sidebar>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h1>
            <p className="text-gray-600">Only Super Administrators can manage commissions.</p>
          </div>
        </div>
      </Sidebar>
    );
  }

  if (loading) {
    return (
      <Sidebar>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading commission data...</p>
          </div>
        </div>
      </Sidebar>
    );
  }

  return (
    <Sidebar>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl font-bold text-gray-900">Commission Management</h1>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <span>💰</span>
                <span>SUPER ADMIN ACCESS</span>
                <span>|</span>
                <span>User: {user?.email}</span>
                <span>|</span>
                <span>Role: {user?.role}</span>
              </div>
            </div>
            <p className="text-gray-600">
              Manage commission rates for insurance products. Click on any product to edit its commission structure.
              <span className="block mt-2 text-primary-700 font-medium">
                💼 Displaying {getRoleDisplayName()} commission rates (Role {getDisplayRoleId()})
              </span>
            </p>
          </div>

          {/* Search and Filter */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                  Search Products
                </label>
                <input
                  type="text"
                  id="search"
                  placeholder="Search by insurance name or provider..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div className="md:w-48">
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  id="category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results Summary */}
          <div className="mb-6">
            <p className="text-sm text-gray-600">
              Showing {filteredInsurances.length} of {insurances.length} insurance products
            </p>
          </div>

          {/* Insurance List */}
          <div className="grid gap-4">
            {filteredInsurances.length > 0 ? (
              filteredInsurances.map((insurance) => (
                <div
                  key={insurance.insurance_id}
                  className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-300 hover:scale-[1.01] cursor-pointer"
                  onClick={() => handleEditCommissions(insurance)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {insurance.insurance_name}
                        </h3>
                        <span className="px-2 py-1 bg-primary-100 text-primary-800 text-xs font-medium rounded-full">
                          {insurance.category}
                        </span>
                      </div>
                      <p className="text-gray-600 text-sm mb-2">
                        Provider: <span className="font-medium">{insurance.provider}</span>
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center space-x-1">
                          <span>📊</span>
                          <span>{insurance.commission_count || 0} commission rates configured</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          {getRoleDisplayName()} Commission
                        </div>
                        <div className="flex space-x-2 text-sm">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Y1: {insurance.role_commission?.year_1 || 0}%
                          </span>
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                            Y2: {insurance.role_commission?.year_2 || 0}%
                          </span>
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
                            Y3: {insurance.role_commission?.year_3 || 0}%
                          </span>
                        </div>
                        <div className={`text-sm font-medium mt-1 ${
                          (insurance.commission_count || 0) > 0 
                            ? 'text-green-600' 
                            : 'text-orange-600'
                        }`}>
                          {(insurance.commission_count || 0) > 0 ? 'Configured' : 'Pending Setup'}
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                        <span className="text-primary-600 text-sm">→</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          {insurances.length > 0 && (
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">
                  {insurances.length}
                </div>
                <div className="text-sm text-gray-600">Total Products</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {insurances.filter(i => (i.commission_count || 0) > 0).length}
                </div>
                <div className="text-sm text-gray-600">Configured</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 text-center">
                <div className="text-3xl font-bold text-orange-600 mb-2">
                  {insurances.filter(i => (i.commission_count || 0) === 0).length}
                </div>
                <div className="text-sm text-gray-600">Pending Setup</div>
              </div>
            </div>
          )}
        </main>
      </div>
    </Sidebar>
  );
}

export default function CommissionsPage() {
  return (
    <ProtectedRoute>
      <CommissionsContent />
    </ProtectedRoute>
  );
}