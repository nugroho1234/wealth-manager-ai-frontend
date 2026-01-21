'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { apiClient } from '@/lib/api';

interface Company {
  company_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  website?: string;
  city?: string;
  country?: string;
  logo_url?: string;
  vision?: string;
  mission?: string;
  tagline?: string;
  summary?: string;
  description?: string;
  values?: string[];
  licensing_info?: string;
  certifications?: string[];
  is_default?: boolean;
  created_at: string;
  updated_at?: string;
}

function CompanyManagementContent() {
  const { user } = useAuth();
  const { notifyError, notifySuccess } = useNotifications();
  
  // State management
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Company>>({
    name: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    city: '',
    country: '',
    vision: '',
    mission: '',
    tagline: '',
    summary: '',
    description: '',
    values: [],
    licensing_info: '',
    certifications: [],
    is_default: false
  });

  // Fetch companies
  useEffect(() => {
    fetchCompanies();
  }, [user]);

  const fetchCompanies = async () => {
    try {
      setIsLoading(true);

      // MASTER role: View all companies
      // SUPER_ADMIN/ADMIN: View only their own company
      if (user?.role === 'MASTER') {
        const response = await apiClient.get('/api/v1/oracle/companies');
        setCompanies(response.data.companies || []);
      } else {
        // For non-MASTER users, fetch their own company
        const response = await apiClient.get('/api/v1/oracle/companies/me');
        // Wrap single company in array for consistent UI handling
        setCompanies([response.data]);
        // Don't auto-open modal - let user click Edit button
      }
    } catch (error: any) {
      console.error('Error fetching companies:', error);
      // If 404, user has no company yet - allow them to create one
      if (error.status === 404 && user?.role !== 'MASTER') {
        notifyError('No Company', 'You have no company profile yet. Please contact your administrator to assign you to a company.');
        setCompanies([]);
      } else {
        notifyError('Fetch Error', error.detail || error.message || 'Failed to fetch companies');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      notifyError('Validation Error', 'Company name is required');
      return;
    }

    try {
      setIsCreating(true);
      
      const payload = {
        ...formData,
        values: Array.isArray(formData.values) ? formData.values : 
                formData.values?.toString().split(',').map(v => v.trim()).filter(v => v) || [],
        certifications: Array.isArray(formData.certifications) ? formData.certifications : 
                       formData.certifications?.toString().split(',').map(c => c.trim()).filter(c => c) || []
      };

      // Remove company_id when creating new company (let server auto-generate it)
      if (!editingCompany) {
        delete payload.company_id;
        delete payload.created_at;
        delete payload.updated_at;
      }

      let response;
      if (editingCompany) {
        // Update existing company
        response = await apiClient.patch(`/api/v1/oracle/companies/${editingCompany.company_id}`, payload);
        notifySuccess('Success', 'Company updated successfully');
      } else {
        // Create new company
        response = await apiClient.post('/api/v1/oracle/companies', payload);
        notifySuccess('Success', 'Company created successfully');
      }

      // Upload logo if provided
      console.log('🔍 Debug - Logo upload check:', {
        hasLogoFile: !!logoFile,
        responseStructure: Object.keys(response || {}),
        response: response
      });
      
      if (logoFile) {
        // Handle different response structures
        let companyId = null;
        if (response.data?.company_id) {
          // Direct company data in response.data
          companyId = response.data.company_id;
        } else if (response.data?.company?.company_id) {
          // Wrapped company data in response.data.company
          companyId = response.data.company.company_id;
        } else if (response.company?.company_id) {
          // Company data in response.company
          companyId = response.company.company_id;
        }

        if (companyId) {
          console.log('🚀 Starting logo upload for company:', companyId);
          const logoUrl = await handleLogoUpload(companyId);
          if (logoUrl) {
            notifySuccess('Logo Upload', 'Logo uploaded successfully');
          }
        } else {
          console.warn('⚠️ Logo file selected but no company ID found in response:', response);
        }
      }

      // Reset form and refresh data
      resetForm();
      await fetchCompanies();
      
    } catch (error: any) {
      console.error('Error saving company:', error);
      notifyError('Save Error', error.detail || error.message || 'Failed to save company');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setFormData({
      ...company,
      values: company.values || [],
      certifications: company.certifications || []
    });
    setShowForm(true);
  };

  const handleDelete = async (companyId: string) => {
    if (!confirm('Are you sure you want to delete this company?')) {
      return;
    }

    try {
      await apiClient.delete(`/api/v1/oracle/companies/${companyId}`);
      notifySuccess('Success', 'Company deleted successfully');
      await fetchCompanies();
    } catch (error: any) {
      console.error('Error deleting company:', error);
      notifyError('Delete Error', error.detail || error.message || 'Failed to delete company');
    }
  };

  // Logo upload functions
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      notifyError('Invalid File', 'Please select an image file (PNG, JPG, JPEG, SVG, WebP)');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      notifyError('File Too Large', 'Logo file must be less than 5MB');
      return;
    }

    setLogoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = async (companyId: string) => {
    if (!logoFile) {
      console.log('❌ No logo file to upload');
      return null;
    }

    console.log('📤 Starting logo upload:', {
      companyId,
      fileName: logoFile.name,
      fileSize: logoFile.size,
      fileType: logoFile.type
    });

    try {
      setIsUploadingLogo(true);
      
      const formData = new FormData();
      formData.append('logo_file', logoFile);

      console.log('📡 Sending logo upload request...');
      const response = await apiClient.post(
        `/api/v1/oracle/companies/${companyId}/upload-logo`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log('✅ Logo upload response:', response);
      return response.logo_url;
    } catch (error: any) {
      console.error('❌ Logo upload error:', error);
      notifyError('Upload Error', error.detail || 'Failed to upload logo');
      return null;
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      website: '',
      city: '',
      country: '',
      vision: '',
      mission: '',
      tagline: '',
      summary: '',
      description: '',
      values: [],
      licensing_info: '',
      certifications: [],
      is_default: false
    });
    setEditingCompany(null);
    setLogoFile(null);
    setLogoPreview('');
    setShowForm(false);
  };

  const handleInputChange = (field: keyof Company, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!user || (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <Sidebar>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <main className="max-w-7xl mx-auto px-6 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {user?.role === 'MASTER' ? 'Manage Companies' : 'My Company Profile'}
              </h1>
              <p className="text-gray-600 mt-2">
                {user?.role === 'MASTER'
                  ? 'Create and manage company profiles for proposals'
                  : 'View and edit your company information'}
              </p>
            </div>
            {user?.role === 'MASTER' && (
              <button
                onClick={() => setShowForm(true)}
                className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Company
              </button>
            )}
          </div>

          {/* Company Form Modal */}
          {showForm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold text-gray-900">
                      {editingCompany ? 'Edit Company' : 'Add New Company'}
                    </h2>
                    <button
                      onClick={resetForm}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Basic Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Company Name *
                        </label>
                        <input
                          type="text"
                          value={formData.name || ''}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Enter company name"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={formData.email || ''}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="company@example.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Phone
                        </label>
                        <input
                          type="tel"
                          value={formData.phone || ''}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Website
                        </label>
                        <input
                          type="url"
                          value={formData.website || ''}
                          onChange={(e) => handleInputChange('website', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="https://www.company.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          City
                        </label>
                        <input
                          type="text"
                          value={formData.city || ''}
                          onChange={(e) => handleInputChange('city', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="New York"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Country
                        </label>
                        <input
                          type="text"
                          value={formData.country || ''}
                          onChange={(e) => handleInputChange('country', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="United States"
                        />
                      </div>
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      <textarea
                        value={formData.address || ''}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="123 Main Street, Suite 100"
                      />
                    </div>

                    {/* Company Messaging */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tagline
                        </label>
                        <input
                          type="text"
                          value={formData.tagline || ''}
                          onChange={(e) => handleInputChange('tagline', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Your success, our commitment"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Company Logo
                        </label>
                        <div className="space-y-3">
                          <div className="flex items-center space-x-4">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleLogoFileChange}
                              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                            />
                            {isUploadingLogo && (
                              <div className="text-sm text-gray-500">Uploading...</div>
                            )}
                          </div>
                          
                          {logoPreview && (
                            <div className="flex items-center space-x-3">
                              <img
                                src={logoPreview}
                                alt="Logo preview"
                                className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200"
                              />
                              <div className="text-sm text-gray-600">
                                <div>Logo preview</div>
                                <div className="text-xs text-gray-500">
                                  {logoFile?.name} ({Math.round((logoFile?.size || 0) / 1024)}KB)
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {editingCompany?.logo_url && !logoPreview && (
                            <div className="flex items-center space-x-3">
                              <img
                                src={editingCompany.logo_url}
                                alt="Current logo"
                                className="w-16 h-16 object-cover rounded-lg border-2 border-gray-200"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              <div className="text-sm text-gray-600">Current logo</div>
                            </div>
                          )}
                          
                          <div className="text-xs text-gray-500">
                            <p>• Upload PNG, JPG, JPEG, SVG, or WebP files</p>
                            <p>• Maximum file size: 5MB</p>
                            <p>• Recommended: Logo with transparent background</p>
                            <p>• Will be stored in GCS wealth-manager-public/company_logos/</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vision
                      </label>
                      <textarea
                        value={formData.vision || ''}
                        onChange={(e) => handleInputChange('vision', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Our vision for the future..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mission
                      </label>
                      <textarea
                        value={formData.mission || ''}
                        onChange={(e) => handleInputChange('mission', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Our mission is to..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company Summary
                      </label>
                      <textarea
                        value={formData.summary || ''}
                        onChange={(e) => handleInputChange('summary', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Brief summary of the company..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        value={formData.description || ''}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Detailed company description..."
                      />
                    </div>

                    {/* Values and Certifications */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Company Values (comma-separated)
                        </label>
                        <textarea
                          value={Array.isArray(formData.values) ? formData.values.join(', ') : formData.values || ''}
                          onChange={(e) => handleInputChange('values', e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="Integrity, Excellence, Innovation"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Certifications (comma-separated)
                        </label>
                        <textarea
                          value={Array.isArray(formData.certifications) ? formData.certifications.join(', ') : formData.certifications || ''}
                          onChange={(e) => handleInputChange('certifications', e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          placeholder="ISO 9001, SOC 2 Type II"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Licensing Information
                      </label>
                      <textarea
                        value={formData.licensing_info || ''}
                        onChange={(e) => handleInputChange('licensing_info', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        placeholder="Licensed by..."
                      />
                    </div>

                    {/* Default Company Checkbox */}
                    <div className="flex items-center">
                      <input
                        id="is_default"
                        type="checkbox"
                        checked={formData.is_default || false}
                        onChange={(e) => handleInputChange('is_default', e.target.checked)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is_default" className="ml-2 block text-sm text-gray-700">
                        Set as default company for proposals
                      </label>
                    </div>

                    {/* Form Actions */}
                    <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isCreating}
                        className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center"
                      >
                        {isCreating && (
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        )}
                        {editingCompany ? 'Update' : 'Create'} Company
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Companies List */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading companies...</p>
              </div>
            ) : companies.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-6xl mb-4">🏢</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Companies Yet</h3>
                <p className="text-gray-600 mb-4">Create your first company profile to get started with proposals.</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  Add Your First Company
                </button>
              </div>
            ) : (
              <div className="overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 p-6">
                  {companies.map((company) => (
                    <div
                      key={company.company_id}
                      className="bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-200"
                    >
                      <div className="p-6">
                        {/* Company Header */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              {company.logo_url ? (
                                <img
                                  src={company.logo_url}
                                  alt={`${company.name} logo`}
                                  className="w-10 h-10 rounded-lg object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                                  <span className="text-primary-600 font-semibold text-lg">
                                    {company.name?.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">{company.name}</h3>
                                {company.is_default && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                    Default
                                  </span>
                                )}
                              </div>
                            </div>
                            {company.tagline && (
                              <p className="text-sm text-gray-600 mb-3 italic">"{company.tagline}"</p>
                            )}
                          </div>
                        </div>

                        {/* Company Info */}
                        <div className="space-y-2 mb-4">
                          {company.email && (
                            <div className="flex items-center text-sm text-gray-600">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {company.email}
                            </div>
                          )}
                          {company.phone && (
                            <div className="flex items-center text-sm text-gray-600">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              {company.phone}
                            </div>
                          )}
                          {company.website && (
                            <div className="flex items-center text-sm text-gray-600">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9-9c0 4.97-4.03 9-9 9s-9-4.03-9-9m9-9v18" />
                              </svg>
                              <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary-600">
                                {company.website}
                              </a>
                            </div>
                          )}
                          {(company.city || company.country) && (
                            <div className="flex items-center text-sm text-gray-600">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {[company.city, company.country].filter(Boolean).join(', ')}
                            </div>
                          )}
                        </div>

                        {/* Company Description */}
                        {company.summary && (
                          <p className="text-sm text-gray-600 mb-4 line-clamp-3">{company.summary}</p>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(company)}
                            className="px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 rounded-md transition-colors"
                          >
                            Edit
                          </button>
                          {user?.role === 'MASTER' && (
                            <button
                              onClick={() => handleDelete(company.company_id)}
                              className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </Sidebar>
  );
}

export default function CompanyManagementPage() {
  return (
    <ProtectedRoute requiredRoles={['SUPER_ADMIN', 'ADMIN']}>
      <CompanyManagementContent />
    </ProtectedRoute>
  );
}