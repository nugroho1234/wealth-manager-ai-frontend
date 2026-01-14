'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'react-hot-toast';
import apiClient from '@/lib/api';

// Types
interface SavedSearch {
  id: string;
  query_text: string;
  created_at: string;
  result_count: number;
}

interface CreateProposalFormProps {
  onProposalCreated: (proposalId: string) => void;
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

export default function CreateProposalForm({ onProposalCreated }: CreateProposalFormProps) {
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
      onProposalCreated(response.data.data.proposal_id);
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
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Create New Proposal</h2>
        <p className="text-gray-600 mt-2">
          Set up a new insurance proposal for your client
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        {/* Client Information */}
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Client Information</h3>
          
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
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Client Needs</h3>
          
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
                    <span className="text-sm text-gray-600">Loading searches...</span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {savedSearches.length > 0 ? (
                      savedSearches.map((search) => (
                        <button
                          key={search.id}
                          type="button"
                          onClick={() => handleSearchSelection(search.id, search.query_text)}
                          className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors"
                        >
                          <div className="text-sm font-medium text-gray-900 mb-1">
                            {search.query_text}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(search.created_at).toLocaleDateString()} • {search.result_count} results
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="text-center p-4 text-gray-500 text-sm">
                        No saved searches found. Please use manual input or create some AI searches first.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Manual Input */}
            {needsSource === 'manual' && (
              <div>
                <label htmlFor="client_needs" className="block text-sm font-medium text-gray-700 mb-1">
                  Client Needs Description
                </label>
                <textarea
                  id="client_needs"
                  {...register('client_needs')}
                  rows={4}
                  placeholder="Describe the client's insurance needs and requirements..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {errors.client_needs && (
                  <p className="mt-1 text-sm text-red-600">{errors.client_needs.message}</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Proposal Configuration */}
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Proposal Configuration</h3>

          <div className="space-y-6">
            {/* Target Currency Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Currency
              </label>
              <p className="text-xs text-gray-600 mb-3">
                All financial data in the proposal will be displayed in the selected currency
              </p>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="MYR"
                    {...register('target_currency')}
                    className="mr-2"
                  />
                  <span className="text-sm">Malaysian Ringgit (MYR)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="IDR"
                    {...register('target_currency')}
                    className="mr-2"
                  />
                  <span className="text-sm">Indonesian Rupiah (IDR)</span>
                </label>
              </div>
              {errors.target_currency && (
                <p className="mt-1 text-sm text-red-600">{errors.target_currency.message}</p>
              )}
            </div>

            {/* Proposal Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Proposal Type
              </label>
              <div className="space-y-2">
              <label className="flex items-start">
                <input
                  type="radio"
                  value="complete"
                  {...register('proposal_type')}
                  className="mt-1 mr-3"
                />
                <div>
                  <span className="text-sm font-medium">Complete Proposal</span>
                  <p className="text-xs text-gray-600">
                    Full detailed proposal with all sections and comparisons
                  </p>
                </div>
              </label>
              <label className="flex items-start">
                <input
                  type="radio"
                  value="summary"
                  {...register('proposal_type')}
                  className="mt-1 mr-3"
                />
                <div>
                  <span className="text-sm font-medium">Summary Only</span>
                  <p className="text-xs text-gray-600">
                    Condensed overview with key recommendations
                  </p>
                </div>
              </label>
              <label className="flex items-start">
                <input
                  type="radio"
                  value="both"
                  {...register('proposal_type')}
                  className="mt-1 mr-3"
                />
                <div>
                  <span className="text-sm font-medium">Both Formats</span>
                  <p className="text-xs text-gray-600">
                    Generate both complete and summary versions
                  </p>
                </div>
              </label>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {loading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            <span>{loading ? 'Creating...' : 'Create Proposal'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}