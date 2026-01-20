'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import ProtectedRoute from '@/components/ProtectedRoute';
import { apiClient } from '@/lib/api';
import { toast } from 'react-hot-toast';
import {
  ClientWithPolicies,
  ClientResponse,
  ClientPolicyWithInsurance,
  PolicyListResponse,
  ClientUpdateData,
  Gender,
  PolicyStatus,
  PremiumPeriod,
} from '@/types/client';

function ClientDetailContent() {
  const router = useRouter();
  const params = useParams();
  const clientId = params?.id as string;

  const [client, setClient] = useState<ClientWithPolicies | null>(null);
  const [policies, setPolicies] = useState<ClientPolicyWithInsurance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddPolicyModal, setShowAddPolicyModal] = useState(false);
  const [uploadingPolicyId, setUploadingPolicyId] = useState<string | null>(null);

  // Load client data
  const loadClient = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<ClientResponse>(`/api/v1/clients/${clientId}`);
      if (response.data.success) {
        setClient(response.data.data);
      }
    } catch (error: any) {
      console.error('Error loading client:', error);
      toast.error('Failed to load client details');
      router.push('/oracle/clients');
    } finally {
      setLoading(false);
    }
  };

  // Load policies
  const loadPolicies = async () => {
    try {
      const response = await apiClient.get<PolicyListResponse>(`/api/v1/clients/${clientId}/policies`);
      if (response.data.success) {
        setPolicies(response.data.data.policies);
      }
    } catch (error: any) {
      console.error('Error loading policies:', error);
      toast.error('Failed to load policies');
    }
  };

  useEffect(() => {
    if (clientId) {
      loadClient();
      loadPolicies();
    }
  }, [clientId]);

  const handleDeleteClient = async () => {
    if (!confirm('Are you sure you want to delete this client? All associated policies will also be deleted.')) {
      return;
    }

    try {
      await apiClient.delete(`/api/v1/clients/${clientId}`);
      toast.success('Client deleted successfully');
      router.push('/oracle/clients');
    } catch (error: any) {
      console.error('Error deleting client:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete client');
    }
  };

  const handleDeletePolicy = async (policyId: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) {
      return;
    }

    try {
      await apiClient.delete(`/api/v1/clients/${clientId}/policies/${policyId}`);
      toast.success('Policy deleted successfully');
      loadPolicies();
      loadClient(); // Reload to update stats
    } catch (error: any) {
      console.error('Error deleting policy:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete policy');
    }
  };

  const handleUploadDocument = async (policyId: string, file: File) => {
    try {
      setUploadingPolicyId(policyId);

      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post(
        `/api/v1/clients/${clientId}/policies/${policyId}/upload-document`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        toast.success('Policy document uploaded successfully!');
        loadPolicies();
      }
    } catch (error: any) {
      console.error('Error uploading document:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload document');
    } finally {
      setUploadingPolicyId(null);
    }
  };

  const getStatusColor = (status: PolicyStatus) => {
    switch (status) {
      case PolicyStatus.ACTIVE:
        return 'bg-green-100 text-green-800';
      case PolicyStatus.LAPSED:
        return 'bg-yellow-100 text-yellow-800';
      case PolicyStatus.EXPIRED:
        return 'bg-red-100 text-red-800';
      case PolicyStatus.PENDING:
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Sidebar>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
          <main className="max-w-7xl mx-auto px-6 py-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-8"></div>
              <div className="bg-white rounded-lg shadow p-6">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </div>
          </main>
        </div>
      </Sidebar>
    );
  }

  if (!client) {
    return null;
  }

  return (
    <Sidebar>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/oracle/clients')}
              className="text-blue-600 hover:text-blue-800 mb-4 flex items-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span>Back to Clients</span>
            </button>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {client.first_name} {client.last_name}
                </h1>
                <p className="text-gray-600 mt-1">
                  Client since {new Date(client.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Edit Client</span>
                </button>
                <button
                  onClick={handleDeleteClient}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  <span>Delete</span>
                </button>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600">Total Policies</div>
              <div className="text-3xl font-bold text-gray-900 mt-1">{client.total_policies}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600">Active Policies</div>
              <div className="text-3xl font-bold text-green-600 mt-1">{client.active_policies}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600">Monthly Premium</div>
              <div className="text-2xl font-bold text-blue-600 mt-1">
                ${(client.total_monthly_premium || 0).toLocaleString()}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-sm text-gray-600">Total Coverage</div>
              <div className="text-2xl font-bold text-purple-600 mt-1">
                ${(client.total_coverage || 0).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Client Information */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Client Information</h2>

                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-600">Date of Birth</div>
                    <div className="text-gray-900 font-medium">
                      {new Date(client.date_of_birth).toLocaleDateString()}
                    </div>
                  </div>

                  {client.email && (
                    <div>
                      <div className="text-sm text-gray-600">Email</div>
                      <div className="text-gray-900 font-medium">{client.email}</div>
                    </div>
                  )}

                  {client.phone && (
                    <div>
                      <div className="text-sm text-gray-600">Phone</div>
                      <div className="text-gray-900 font-medium">{client.phone}</div>
                    </div>
                  )}

                  {client.address && (
                    <div>
                      <div className="text-sm text-gray-600">Address</div>
                      <div className="text-gray-900 font-medium">{client.address}</div>
                    </div>
                  )}

                  {client.gender && (
                    <div>
                      <div className="text-sm text-gray-600">Gender</div>
                      <div className="text-gray-900 font-medium">{client.gender}</div>
                    </div>
                  )}

                  {client.occupation && (
                    <div>
                      <div className="text-sm text-gray-600">Occupation</div>
                      <div className="text-gray-900 font-medium">{client.occupation}</div>
                    </div>
                  )}

                  {client.national_id && (
                    <div>
                      <div className="text-sm text-gray-600">National ID</div>
                      <div className="text-gray-900 font-medium">{client.national_id}</div>
                    </div>
                  )}

                  {client.tags && client.tags.length > 0 && (
                    <div>
                      <div className="text-sm text-gray-600 mb-2">Tags</div>
                      <div className="flex flex-wrap gap-2">
                        {client.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {client.notes && (
                    <div>
                      <div className="text-sm text-gray-600">Notes</div>
                      <div className="text-gray-900 text-sm mt-1 whitespace-pre-wrap">{client.notes}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Policies Section */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Insurance Policies</h2>
                  <button
                    onClick={() => setShowAddPolicyModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add Policy</span>
                  </button>
                </div>

                {policies.length === 0 ? (
                  <div className="text-center py-12">
                    <svg
                      className="w-16 h-16 text-gray-300 mx-auto mb-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No policies yet</h3>
                    <p className="text-gray-600 mb-4">Add the first insurance policy for this client.</p>
                    <button
                      onClick={() => setShowAddPolicyModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
                    >
                      Add First Policy
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {policies.map((policy) => (
                      <div
                        key={policy.policy_id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {policy.insurance_name}
                            </h3>
                            <p className="text-sm text-gray-600">{policy.provider}</p>
                            {policy.category && (
                              <span className="inline-block mt-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                {policy.category}
                              </span>
                            )}
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(policy.policy_status)}`}>
                            {policy.policy_status}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          {policy.policy_number && (
                            <div>
                              <div className="text-xs text-gray-600">Policy Number</div>
                              <div className="text-sm font-medium text-gray-900">{policy.policy_number}</div>
                            </div>
                          )}
                          <div>
                            <div className="text-xs text-gray-600">Active Date</div>
                            <div className="text-sm font-medium text-gray-900">
                              {new Date(policy.active_date).toLocaleDateString()}
                            </div>
                          </div>
                          {policy.premium_amount && (
                            <div>
                              <div className="text-xs text-gray-600">Premium</div>
                              <div className="text-sm font-medium text-gray-900">
                                ${policy.premium_amount.toLocaleString()}/{policy.premium_period}
                              </div>
                            </div>
                          )}
                          {policy.coverage_amount && (
                            <div>
                              <div className="text-xs text-gray-600">Coverage</div>
                              <div className="text-sm font-medium text-gray-900">
                                ${policy.coverage_amount.toLocaleString()}
                              </div>
                            </div>
                          )}
                        </div>

                        {policy.renewal_date && (
                          <div className="text-xs text-gray-600 mb-2">
                            Renewal: {new Date(policy.renewal_date).toLocaleDateString()}
                          </div>
                        )}

                        {/* Document Section */}
                        <div className="mb-3">
                          {policy.policy_document_url ? (
                            <div className="flex items-center justify-between">
                              <a
                                href={policy.policy_document_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span>{policy.policy_document_filename || 'View Document'}</span>
                              </a>
                              <label className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                                {uploadingPolicyId === policy.policy_id ? (
                                  <span className="text-blue-600">Uploading...</span>
                                ) : (
                                  <>
                                    Replace
                                    <input
                                      type="file"
                                      accept=".pdf"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          handleUploadDocument(policy.policy_id, file);
                                        }
                                      }}
                                    />
                                  </>
                                )}
                              </label>
                            </div>
                          ) : (
                            <label className="cursor-pointer inline-flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800">
                              {uploadingPolicyId === policy.policy_id ? (
                                <span>Uploading...</span>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                  </svg>
                                  <span>Upload Policy Document</span>
                                  <input
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleUploadDocument(policy.policy_id, file);
                                      }
                                    }}
                                  />
                                </>
                              )}
                            </label>
                          )}
                        </div>

                        <div className="flex justify-end space-x-2 pt-3 border-t">
                          <button
                            onClick={() => handleDeletePolicy(policy.policy_id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Edit Client Modal */}
      {showEditModal && (
        <EditClientModal
          client={client}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            loadClient();
          }}
        />
      )}

      {/* Add Policy Modal */}
      {showAddPolicyModal && (
        <AddPolicyModal
          clientId={clientId}
          onClose={() => setShowAddPolicyModal(false)}
          onSuccess={() => {
            setShowAddPolicyModal(false);
            loadPolicies();
            loadClient();
          }}
        />
      )}
    </Sidebar>
  );
}

// Add Policy Modal Component
function AddPolicyModal({
  clientId,
  onClose,
  onSuccess,
}: {
  clientId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    insurance_id: '',
    policy_number: '',
    active_date: '',
    renewal_date: '',
    expiry_date: '',
    premium_amount: '',
    premium_period: PremiumPeriod.MONTHLY,
    currency: 'USD',
    coverage_amount: '',
    policy_status: PolicyStatus.ACTIVE,
  });
  const [submitting, setSubmitting] = useState(false);
  const [insurances, setInsurances] = useState<any[]>([]);
  const [loadingInsurances, setLoadingInsurances] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Load available insurance products
  useEffect(() => {
    const loadInsurances = async () => {
      try {
        setLoadingInsurances(true);
        const response = await apiClient.get('/api/v1/products?limit=500');
        if (response.data.success) {
          setInsurances(response.data.data.products || []);
        }
      } catch (error: any) {
        console.error('Error loading insurances:', error);
        toast.error('Failed to load insurance products');
      } finally {
        setLoadingInsurances(false);
      }
    };

    loadInsurances();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate required fields
      if (!formData.insurance_id || !formData.active_date) {
        toast.error('Please fill in all required fields');
        return;
      }

      // Prepare payload
      const payload: any = {
        insurance_id: formData.insurance_id,
        active_date: formData.active_date,
        premium_period: formData.premium_period,
        policy_status: formData.policy_status,
        currency: formData.currency,
      };

      // Add optional fields only if they have values
      if (formData.policy_number) payload.policy_number = formData.policy_number;
      if (formData.renewal_date) payload.renewal_date = formData.renewal_date;
      if (formData.expiry_date) payload.expiry_date = formData.expiry_date;
      if (formData.premium_amount) payload.premium_amount = parseFloat(formData.premium_amount);
      if (formData.coverage_amount) payload.coverage_amount = parseFloat(formData.coverage_amount);

      const response = await apiClient.post(`/api/v1/clients/${clientId}/policies`, payload);

      if (response.data.success) {
        toast.success('Policy added successfully!');
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error adding policy:', error);
      toast.error(error.response?.data?.detail || 'Failed to add policy');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter insurances based on search
  const filteredInsurances = insurances.filter((ins) =>
    ins.insurance_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ins.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-3xl w-full my-8">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-lg">
          <h2 className="text-2xl font-semibold text-gray-900">Add Insurance Policy</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto">
          {/* Insurance Product Selection */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Select Insurance Product <span className="text-red-500">*</span>
            </h3>

            {/* Search box */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search by insurance name or provider..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {loadingInsurances ? (
              <div className="text-center py-8 text-gray-600">Loading insurance products...</div>
            ) : filteredInsurances.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                {searchQuery ? 'No insurance products match your search.' : 'No insurance products available.'}
              </div>
            ) : (
              <div className="border border-gray-300 rounded-lg max-h-64 overflow-y-auto">
                {filteredInsurances.map((insurance) => (
                  <label
                    key={insurance.insurance_id}
                    className={`flex items-start p-4 border-b last:border-b-0 cursor-pointer hover:bg-gray-50 ${
                      formData.insurance_id === insurance.insurance_id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="insurance_id"
                      value={insurance.insurance_id}
                      checked={formData.insurance_id === insurance.insurance_id}
                      onChange={(e) => setFormData({ ...formData, insurance_id: e.target.value })}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{insurance.insurance_name}</div>
                      <div className="text-sm text-gray-600">{insurance.provider}</div>
                      {insurance.category && (
                        <span className="inline-block mt-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                          {insurance.category}
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Policy Details */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Policy Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Policy Number</label>
                <input
                  type="text"
                  value={formData.policy_number}
                  onChange={(e) => setFormData({ ...formData, policy_number: e.target.value })}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Active Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.active_date}
                  onChange={(e) => setFormData({ ...formData, active_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Renewal Date</label>
                <input
                  type="date"
                  value={formData.renewal_date}
                  onChange={(e) => setFormData({ ...formData, renewal_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={formData.expiry_date}
                  onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Policy Status</label>
                <select
                  value={formData.policy_status}
                  onChange={(e) => setFormData({ ...formData, policy_status: e.target.value as PolicyStatus })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={PolicyStatus.ACTIVE}>Active</option>
                  <option value={PolicyStatus.PENDING}>Pending</option>
                  <option value={PolicyStatus.LAPSED}>Lapsed</option>
                  <option value={PolicyStatus.EXPIRED}>Expired</option>
                </select>
              </div>
            </div>
          </div>

          {/* Premium and Coverage */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Premium & Coverage</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Premium Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.premium_amount}
                  onChange={(e) => setFormData({ ...formData, premium_amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Premium Period</label>
                <select
                  value={formData.premium_period}
                  onChange={(e) => setFormData({ ...formData, premium_period: e.target.value as PremiumPeriod })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={PremiumPeriod.MONTHLY}>Monthly</option>
                  <option value={PremiumPeriod.YEARLY}>Yearly</option>
                  <option value={PremiumPeriod.ONE_TIME}>One-time</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coverage Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.coverage_amount}
                  onChange={(e) => setFormData({ ...formData, coverage_amount: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="USD">USD</option>
                  <option value="IDR">IDR</option>
                  <option value="SGD">SGD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.insurance_id || !formData.active_date}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Adding...' : 'Add Policy'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Client Modal Component
function EditClientModal({
  client,
  onClose,
  onSuccess,
}: {
  client: ClientWithPolicies;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState<ClientUpdateData>({
    first_name: client.first_name,
    last_name: client.last_name,
    date_of_birth: client.date_of_birth,
    email: client.email || '',
    phone: client.phone || '',
    address: client.address || '',
    gender: client.gender || undefined,
    occupation: client.occupation || '',
    national_id: client.national_id || '',
    preferred_language: client.preferred_language || 'en',
    tags: client.tags || [],
    notes: client.notes || '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const response = await apiClient.put(`/api/v1/clients/${client.client_id}`, formData);

      if (response.data.success) {
        toast.success('Client updated successfully!');
        onSuccess();
      }
    } catch (error: any) {
      console.error('Error updating client:', error);
      toast.error(error.response?.data?.detail || 'Failed to update client');
    } finally {
      setSubmitting(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter((t) => t !== tag) || [],
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-gray-900">Edit Client</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <select
                  value={formData.gender || ''}
                  onChange={(e) => setFormData({ ...formData, gender: (e.target.value as Gender) || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select...</option>
                  <option value={Gender.MALE}>Male</option>
                  <option value={Gender.FEMALE}>Female</option>
                  <option value={Gender.OTHER}>Other</option>
                  <option value={Gender.PREFER_NOT_TO_SAY}>Prefer not to say</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
                <input
                  type="text"
                  value={formData.occupation}
                  onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">National ID</label>
                <input
                  type="text"
                  value={formData.national_id}
                  onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add tags"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.tags?.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-blue-900"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Updating...' : 'Update Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ClientDetailPage() {
  return (
    <ProtectedRoute>
      <ClientDetailContent />
    </ProtectedRoute>
  );
}
