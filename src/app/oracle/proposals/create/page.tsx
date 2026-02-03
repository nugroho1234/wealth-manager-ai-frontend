'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import apiClient from '@/lib/api';

// Types
interface SavedSearch {
  id: string;
  query_text: string;
  created_at: string;
  result_count: number;
}

// Form schema
const proposalSchema = z.object({
  client_name: z.string().min(2, 'Client name must be at least 2 characters'),
  client_dob: z.string().min(1, 'Date of birth is required'),
  client_needs: z.string().min(10, 'Client needs must be at least 10 characters'),
  needs_source: z.enum(['manual', 'ai_query']),
  ai_query_id: z.string().optional(),
  proposal_type: z.enum(['complete', 'summary', 'both']),
  target_currency: z.enum(['MYR', 'IDR']),
});

type ProposalFormData = z.infer<typeof proposalSchema>;

function CreateProposalContent() {
  const router = useRouter();
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSearches, setLoadingSearches] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<ProposalFormData>({
    resolver: zodResolver(proposalSchema),
    defaultValues: {
      needs_source: 'manual',
      proposal_type: 'complete',
      target_currency: 'MYR'
    }
  });

  const needsSource = watch('needs_source');

  // Load saved searches
  useEffect(() => {
    if (needsSource === 'ai_query') {
      loadSavedSearches();
    }
  }, [needsSource]);

  const loadSavedSearches = async () => {
    setLoadingSearches(true);
    try {
      const response = await apiClient.get('/api/v1/oracle/ai-generation/saved-searches');
      setSavedSearches(response.data.data?.searches || []);
    } catch (error) {
      console.error('Error loading saved searches:', error);
      toast.error('Failed to load saved searches');
    } finally {
      setLoadingSearches(false);
    }
  };

  const onSubmit = async (data: ProposalFormData) => {
    setLoading(true);
    
    try {
      const response = await apiClient.post('/api/v1/oracle/proposals', data);
      toast.success('Proposal created successfully!');
      router.push(`/proposals/${response.data.data.proposal_id}`);
    } catch (error: any) {
      console.error('Error creating proposal:', error);
      toast.error(error.detail || 'Failed to create proposal');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSelection = (searchId: string, queryText: string) => {
    setValue('ai_query_id', searchId);
    setValue('client_needs', queryText);
  };

  return (
    <Sidebar>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-4 mb-4">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Create New Proposal</h1>
          <p className="text-gray-600 mt-2">
            Set up a new insurance proposal for your client
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            
            {/* Client Information */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Client Information</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="client_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Client Name
                  </label>
                  <input
                    type="text"
                    id="client_name"
                    {...register('client_name')}
                    placeholder="Enter client's full name"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.client_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.client_name.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="client_dob" className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    id="client_dob"
                    {...register('client_dob')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.client_dob && (
                    <p className="mt-1 text-sm text-red-600">{errors.client_dob.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Client Needs */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Client Needs</h2>
              
              <div className="space-y-4">
                {/* Needs Source */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How would you like to specify client needs?
                  </label>
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="manual"
                        {...register('needs_source')}
                        className="mr-2"
                      />
                      <span className="text-sm">Manual Input</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="ai_query"
                        {...register('needs_source')}
                        className="mr-2"
                      />
                      <span className="text-sm">Use Saved AI Search</span>
                    </label>
                  </div>
                </div>

                {/* AI Query Selection */}
                {needsSource === 'ai_query' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select from your saved AI searches
                    </label>
                    {loadingSearches ? (
                      <div className="flex items-center space-x-2 p-4 border border-gray-200 rounded-lg">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm text-gray-600">Loading saved searches...</span>
                      </div>
                    ) : savedSearches.length > 0 ? (
                      <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2">
                        {savedSearches.map((search) => (
                          <button
                            key={search.id}
                            type="button"
                            onClick={() => handleSearchSelection(search.id, search.query_text)}
                            className="w-full text-left p-3 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-200 transition-colors"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{search.query_text}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {search.result_count} results • {new Date(search.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center p-4 border border-gray-200 rounded-lg">
                        <p className="text-sm text-gray-600">
                          No saved searches found. Try searching for products first.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Client Needs Description */}
                <div>
                  <label htmlFor="client_needs" className="block text-sm font-medium text-gray-700 mb-1">
                    Client Needs Description
                  </label>
                  <textarea
                    id="client_needs"
                    {...register('client_needs')}
                    rows={4}
                    placeholder={needsSource === 'ai_query' ? 
                      "This will be filled automatically when you select a saved search above." :
                      "Describe your client's insurance needs, demographics, and preferences..."
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    readOnly={needsSource === 'ai_query'}
                  />
                  {errors.client_needs && (
                    <p className="mt-1 text-sm text-red-600">{errors.client_needs.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Proposal Configuration */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Proposal Configuration</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Proposal Type
                  </label>
                  <select
                    {...register('proposal_type')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="complete">Complete Proposal (Full Analysis)</option>
                    {/* <option value="summary">Summary Proposal (Key Points)</option>
                    <option value="both">Both Complete & Summary</option> */}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Currency
                  </label>
                  <select
                    {...register('target_currency')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="MYR">Malaysian Ringgit (MYR)</option>
                    <option value="IDR">Indonesian Rupiah (IDR)</option>
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    Currency for displaying all financial amounts in the proposal
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <span>Create Proposal</span>
                )}
              </button>
            </div>
          </form>
        </div>
        </div>
      </div>
    </Sidebar>
  );
}

export default function CreateProposalPage() {
  return (
    <ProtectedRoute>
      <CreateProposalContent />
    </ProtectedRoute>
  );
}