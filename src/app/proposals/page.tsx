'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import apiClient from '@/lib/api';
import CreateProposalForm from '@/components/CreateProposalForm';

// Types
interface ProposalListItem {
  proposal_id: string;
  client_name: string;
  proposal_type: string;
  status: string;
  illustration_count: number;
  highlighted_insurance_name?: string;
  created_at: string;
  updated_at: string;
}

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-800',
  extracting: 'bg-blue-100 text-blue-800',
  reviewing: 'bg-yellow-100 text-yellow-800',
  generating: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

function ProposalsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [proposals, setProposals] = useState<ProposalListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'list' | 'create'>(
    searchParams.get('tab') === 'create' ? 'create' : 'list'
  );

  // Load proposals
  const loadProposals = async () => {
    try {
      const response = await apiClient.get('/api/v1/proposals');
      setProposals(response.data.data?.proposals || []);
    } catch (error: any) {
      // Handle different error cases
      if (error.status_code === 401) {
        // Authentication error - don't show error toast, just set empty proposals
        console.log('Authentication error when loading proposals:', error.status_code);
        setProposals([]);
      } else if (error.status_code === 404) {
        // No proposals found - this is normal, don't show error
        console.log('No proposals found for user');
        setProposals([]);
      } else {
        // Only show error toast for actual server errors (500, etc.)
        console.error('Error loading proposals:', error.status_code, error);
        toast.error(error.detail || 'Failed to load proposals');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProposals();

    // Add window focus listener to refresh proposals
    const handleFocus = () => {
      loadProposals();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Filter proposals
  const filteredProposals = proposals.filter(proposal => {
    const matchesSearch = proposal.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (proposal.highlighted_insurance_name?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || proposal.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'failed':
        return (
          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'generating':
        return (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
        );
      case 'extracting':
        return (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading proposals...</span>
        </div>
      </div>
    );
  }

  return (
    <Sidebar>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Insurance Proposals</h1>
          <p className="text-gray-600 mt-2">
            Manage and generate professional insurance proposals for your clients
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-2">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('list')}
                className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-200 ${
                  activeTab === 'list'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>My Proposals</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`flex-1 py-3 px-6 rounded-xl font-medium transition-all duration-200 ${
                  activeTab === 'create'
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Create New</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'list' && (
          <>
            {/* Filters */}
            <div className="mb-6 bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search by client name or insurance..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div className="sm:w-48">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="extracting">Extracting</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="generating">Generating</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

                {/* Refresh Button */}
                <button
                  onClick={() => {
                    setLoading(true);
                    loadProposals();
                  }}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <svg
                    className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {loading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>

        {/* Proposals Grid */}
        {filteredProposals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProposals.map((proposal) => (
              <Link
                key={proposal.proposal_id}
                href={`/proposals/${proposal.proposal_id}`}
                className="block"
              >
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-200">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {proposal.client_name}
                      </h3>
                      <p className="text-sm text-gray-600 capitalize">
                        {proposal.proposal_type.replace('_', ' ')} Proposal
                      </p>
                    </div>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(proposal.status)}
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="mb-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[proposal.status as keyof typeof STATUS_COLORS] || 'bg-gray-100 text-gray-800'}`}>
                      {proposal.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Illustrations:</span>
                      <span className="text-gray-900 font-medium">
                        {proposal.illustration_count}/5
                      </span>
                    </div>

                    {proposal.highlighted_insurance_name && (
                      <div>
                        <span className="text-xs text-gray-500 block mb-1">Highlighted:</span>
                        <span className="text-sm text-gray-900 font-medium">
                          {proposal.highlighted_insurance_name}
                        </span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Created: {new Date(proposal.created_at).toLocaleDateString()}</span>
                        {proposal.updated_at !== proposal.created_at && (
                          <span>Updated: {new Date(proposal.updated_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress Indicator for Processing */}
                  {(proposal.status === 'extracting' || proposal.status === 'generating') && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center space-x-2">
                        <div className="animate-pulse w-2 h-2 bg-blue-600 rounded-full"></div>
                        <span className="text-xs text-gray-600">
                          {proposal.status === 'extracting' ? 'Processing illustrations...' : 'Generating proposal...'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-12 text-center">
            {searchTerm || statusFilter !== 'all' ? (
              // No results for filters
              <div>
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No proposals found</h3>
                <p className="text-gray-600 mb-4">
                  No proposals match your current filters. Try adjusting your search or filters.
                </p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                  className="px-4 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              // No proposals at all
              <div>
                <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No proposals yet</h3>
                <p className="text-gray-600 mb-6">
                  Get started by creating your first insurance proposal for a client.
                </p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="inline-flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Create First Proposal</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        {proposals.length > 0 && (
          <div className="mt-8 bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {proposals.length}
                </div>
                <div className="text-sm text-gray-600">Total Proposals</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {proposals.filter(p => p.status === 'completed').length}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {proposals.filter(p => ['extracting', 'reviewing', 'generating'].includes(p.status)).length}
                </div>
                <div className="text-sm text-gray-600">In Progress</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {proposals.filter(p => p.status === 'draft').length}
                </div>
                <div className="text-sm text-gray-600">Draft</div>
              </div>
            </div>
          </div>
        )}
          </>
        )}

        {/* Create Tab Content */}
        {activeTab === 'create' && (
          <CreateProposalForm 
            onProposalCreated={(proposalId) => {
              // Reload proposals list and switch to list tab
              loadProposals();
              setActiveTab('list');
              // Navigate to the proposal builder
              router.push(`/proposals/${proposalId}`);
            }}
          />
        )}
      </div>
      </div>
    </Sidebar>
  );
}

export default function ProposalsPage() {
  return (
    <ProtectedRoute>
      <ProposalsContent />
    </ProtectedRoute>
  );
}