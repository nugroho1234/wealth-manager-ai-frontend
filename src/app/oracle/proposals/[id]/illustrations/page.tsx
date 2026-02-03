'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-hot-toast';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import IllustrationDataReview from '@/components/IllustrationDataReview';

// Types for illustration data
interface ExtractedData {
  basic_info: {
    insurance_name?: string;
    insurance_provider?: string;
    currency?: string;
    product_category?: string;
  };
  financial_data: {
    death_benefit?: string;
    premium_per_year?: string;
    total_premium?: string;
    payment_period?: string;
    coverage_term?: string;
  };
  cash_value_data: {
    has_cash_value?: boolean;
    breakeven_years?: string;
    cash_values: Array<{
      age: number;
      value: string;
    }>;
  };
  ratings: {
    snp_rating?: string;
    financial_strength?: string;
  };
  policy_details: {
    benefits?: string;
    exclusions?: string;
    conditions?: string;
  };
  extraction_metadata: {
    confidence_score: number;
    extraction_notes: string;
  };
}

interface DatabaseMatch {
  exact_match?: any;
  fuzzy_matches: Array<{
    insurance_id: string;
    insurance_name: string;
    provider: string;
    similarity_score: number;
  }>;
  match_confidence: number;
  requires_manual_input: boolean;
}

interface Illustration {
  illustration_id: string;
  proposal_id: string;
  illustration_order: number;
  original_filename: string;
  file_size: number;
  extracted_data: ExtractedData;
  database_match: DatabaseMatch;
  selected_insurance_id?: string;
  extraction_status: 'pending' | 'processing' | 'completed' | 'failed';
  extraction_confidence: number;
  processing_notes?: string;
  review_status: 'pending' | 'in_review' | 'approved' | 'rejected';
  user_notes?: string;
  created_at: string;
  updated_at: string;
}

interface Proposal {
  proposal_id: string;
  client_name: string;
  client_needs: string;
  proposal_type: string;
  status: string;
}

const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

const REVIEW_STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_review: 'bg-blue-100 text-blue-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

function IllustrationManagementContent() {
  const router = useRouter();
  const params = useParams();
  const proposalId = params.id as string;

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [illustrations, setIllustrations] = useState<Illustration[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedIllustration, setSelectedIllustration] = useState<Illustration | null>(null);
  const [savingChanges, setSavingChanges] = useState(false);

  // Load proposal and illustrations
  const loadData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Load proposal
      const proposalResponse = await fetch(`/api/proposals/${proposalId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (proposalResponse.ok) {
        const proposalData = await proposalResponse.json();
        setProposal(proposalData.data);
      } else {
        toast.error('Failed to load proposal');
        router.push('/oracle/proposals');
        return;
      }

      // Load illustrations
      const illustrationsResponse = await fetch(`/api/proposals/${proposalId}/illustrations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (illustrationsResponse.ok) {
        const illustrationsData = await illustrationsResponse.json();
        setIllustrations(illustrationsData.data || []);
      } else {
        toast.error('Failed to load illustrations');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [proposalId, router]);

  useEffect(() => {
    loadData();
    // Auto-refresh removed - manual refresh only for stable workflow
  }, [loadData]);

  // File upload handling
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!proposal) return;

    // Check file limits
    if (acceptedFiles.length + illustrations.length > 5) {
      toast.error('Maximum 5 illustrations allowed per proposal');
      return;
    }

    setUploading(true);
    
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      // Add all files to form data
      acceptedFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(`/api/proposals/${proposalId}/illustrations/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Successfully uploaded ${acceptedFiles.length} illustration(s)`);
        await loadData(); // Reload data to show new illustrations
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to upload illustrations');
      }
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error('Failed to upload illustrations');
    } finally {
      setUploading(false);
    }
  }, [proposal, illustrations.length, proposalId, loadData]);

  // Handle data changes from the review component
  const handleDataChange = async (illustrationId: string, updatedData: any, selectedInsurance: any) => {
    setSavingChanges(true);
    
    try {
      const token = localStorage.getItem('token');
      
      const updatePayload: any = {
        extracted_data: updatedData,
      };
      
      if (selectedInsurance) {
        updatePayload.selected_insurance_id = selectedInsurance.insurance_id;
      }

      const response = await fetch(`/api/proposals/${proposalId}/illustrations/${illustrationId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (response.ok) {
        toast.success('Changes saved successfully');
        await loadData(); // Reload to get updated data
        
        // Update the selected illustration if it's the one being edited
        if (selectedIllustration?.illustration_id === illustrationId) {
          const updatedIllustration = illustrations.find(ill => ill.illustration_id === illustrationId);
          if (updatedIllustration) {
            setSelectedIllustration({ ...updatedIllustration, extracted_data: updatedData });
          }
        }
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to save changes');
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
    } finally {
      setSavingChanges(false);
    }
  };

  // Delete illustration
  const handleDeleteIllustration = async (illustrationId: string) => {
    if (!confirm('Are you sure you want to delete this illustration? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/proposals/${proposalId}/illustrations/${illustrationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('Illustration deleted successfully');
        await loadData();
        if (selectedIllustration?.illustration_id === illustrationId) {
          setSelectedIllustration(null);
        }
      } else {
        const error = await response.json();
        toast.error(error.detail || 'Failed to delete illustration');
      }
    } catch (error) {
      console.error('Error deleting illustration:', error);
      toast.error('Failed to delete illustration');
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 5 - illustrations.length,
    disabled: uploading || illustrations.length >= 5,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-gray-600">Loading illustrations...</span>
        </div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Proposal not found</h1>
          <p className="text-gray-600 mb-4">The requested proposal could not be found.</p>
          <button
            onClick={() => router.push('/oracle/proposals')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Proposals
          </button>
        </div>
      </div>
    );
  }

  const canUpload = illustrations.length < 5;

  return (
    <Sidebar>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              <button
                onClick={() => router.push(`/proposals/${proposalId}`)}
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Proposal
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Illustration Management</h1>
                <p className="text-gray-600 mt-2">{proposal.client_name} - {proposal.proposal_type}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Illustration List */}
            <div className="space-y-6">
              {/* Upload Section */}
              {canUpload && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Upload Illustrations ({illustrations.length}/5)
                  </h2>
                  
                  <div
                    {...getRootProps()}
                    className={`
                      border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                      ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
                      ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <input {...getInputProps()} />
                    
                    {uploading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="text-gray-600">Processing files...</span>
                      </div>
                    ) : (
                      <div>
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <p className="text-gray-600 mb-2">
                          {isDragActive ? 'Drop PDF files here' : 'Drag & drop PDF files here, or click to browse'}
                        </p>
                        <p className="text-sm text-gray-500">
                          Maximum {5 - illustrations.length} files, 15MB each
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Illustrations List */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Uploaded Illustrations
                </h2>
                
                {illustrations.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-600">No illustrations uploaded yet</p>
                    <p className="text-sm text-gray-500 mt-1">Upload 2-5 PDF illustrations to continue</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {illustrations.map((illustration) => (
                      <div
                        key={illustration.illustration_id}
                        className={`
                          border rounded-lg p-4 cursor-pointer transition-all
                          ${selectedIllustration?.illustration_id === illustration.illustration_id 
                            ? 'border-blue-500 bg-blue-50' 
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                          }
                        `}
                        onClick={() => setSelectedIllustration(illustration)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 2H7a2 2 0 00-2 2v15a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {illustration.original_filename}
                                </p>
                                
                                <div className="flex items-center space-x-2 mt-1">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[illustration.extraction_status]}`}>
                                    {illustration.extraction_status}
                                  </span>
                                  
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${REVIEW_STATUS_COLORS[illustration.review_status]}`}>
                                    {illustration.review_status}
                                  </span>
                                  
                                  {illustration.extraction_confidence > 0 && (
                                    <span className="text-xs text-gray-500">
                                      {Math.round(illustration.extraction_confidence * 100)}% confidence
                                    </span>
                                  )}
                                </div>
                                
                                {illustration.extracted_data?.basic_info?.insurance_name && (
                                  <p className="text-xs text-gray-600 mt-1">
                                    {illustration.extracted_data.basic_info.insurance_name}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex-shrink-0 ml-4">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteIllustration(illustration.illustration_id);
                              }}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              title="Delete illustration"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Data Review */}
            <div className="space-y-6">
              {selectedIllustration ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Review & Edit Data
                    </h2>
                    {savingChanges && (
                      <div className="flex items-center space-x-2 text-blue-600">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm">Saving...</span>
                      </div>
                    )}
                  </div>
                  
                  <IllustrationDataReview
                    illustration={selectedIllustration}
                    onDataChange={(updatedData, selectedInsurance) => 
                      handleDataChange(selectedIllustration.illustration_id, updatedData, selectedInsurance)
                    }
                    disabled={savingChanges}
                  />
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Select an Illustration
                    </h3>
                    <p className="text-gray-600">
                      Choose an illustration from the left to review and edit its extracted data
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}

export default function IllustrationManagementPage() {
  return (
    <ProtectedRoute>
      <IllustrationManagementContent />
    </ProtectedRoute>
  );
}