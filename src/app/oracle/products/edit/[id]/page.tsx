'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { apiClient } from '@/lib/api';

interface ProductDetails {
  // Core identifiers
  insurance_id: string;
  created_at: string;
  updated_at?: string;
  processing_status: string;
  pdf_url?: string;
  markdown_url?: string;
  uploaded_by?: string;
  
  // Modern fields (PRP 4.5 schema)
  insurance_name?: string;
  provider?: string;
  provider_country?: string;
  category?: string;
  key_features?: string;
  key_features_bullets?: string;
  age_of_entry?: string;
  minimum_premium?: string;
  minimum_sum_assured?: string;
  maximum_sum_assured?: string;
  guaranteed_interest_rate?: string;
  historical_performance?: string;
  insurance_yield?: string;
  suitable_for?: string;
  time_horizon?: string;
  specific_needs?: string;
  reason_for_need?: string;
  target_market?: string;
  riders_addons?: string;
  premium_payment_options?: string;
  death_benefit_options?: string;
  market_positioning?: string;
  document_summary?: string;
  discontinued?: boolean;
  
  // Legacy fields (for backward compatibility)
  title?: string;
  company_name?: string;
  product_type?: string;
  description?: string;
}

function EditProductContent() {
  const { user } = useAuth();
  const { notifySuccess, notifyError } = useNotifications();
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;
  
  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<ProductDetails>>({});

  useEffect(() => {
    if (productId) {
      fetchProductDetails();
    }
  }, [productId]);

  const fetchProductDetails = async () => {
    try {
      setIsLoading(true);
      
      const response = await apiClient.get<{
        success: boolean;
        message: string;
        data: ProductDetails;
      }>(`/api/v1/oracle/products/${productId}`);
      
      const productData = response.data.data;
      setProduct(productData);
      setFormData(productData);
      
    } catch (error: any) {
      console.error('Error fetching product details:', error);
      const errorMessage = error.detail || error.message || 'Failed to fetch product details';
      notifyError('Fetch Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof ProductDetails, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleToggleChange = (field: keyof ProductDetails, value: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsSaving(true);
      
      // Only send fields that have changed
      const updatedFields: Partial<ProductDetails> = {};
      Object.keys(formData).forEach(key => {
        const fieldKey = key as keyof ProductDetails;
        if (formData[fieldKey] !== product![fieldKey]) {
          updatedFields[fieldKey] = formData[fieldKey];
        }
      });

      if (Object.keys(updatedFields).length === 0) {
        notifyError('No Changes', 'No changes detected to save.');
        return;
      }

      console.log('Updating product with:', updatedFields);
      console.log('PUT URL:', `/api/v1/oracle/products/${productId}`);
      
      const response = await apiClient.put<{
        success: boolean;
        message: string;
        data: ProductDetails;
      }>(`/api/v1/oracle/products/${productId}`, updatedFields);
      
      if (response.data.success) {
        notifySuccess('Success', 'Product updated successfully');
        setProduct({ ...product!, ...updatedFields });
        router.push('/admin/products');
      }
      
    } catch (error: any) {
      console.error('Error updating product:', error);
      const errorMessage = error.detail || error.message || 'Failed to update product';
      notifyError('Update Error', errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/products');
  };

  if (isLoading) {
    return (
      <Sidebar>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="p-8">
            <div className="flex items-center justify-center min-h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading product details...</p>
                <p className="mt-2 text-sm text-gray-500">Product ID: {productId}</p>
              </div>
            </div>
          </div>
        </div>
      </Sidebar>
    );
  }

  if (!product) {
    return (
      <Sidebar>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="p-8">
            <div className="flex items-center justify-center min-h-96">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
                <p className="text-gray-600 mb-4">The requested product could not be found.</p>
                <p className="text-sm text-gray-500 mb-4">Product ID: {productId}</p>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Back to Products
                </button>
              </div>
            </div>
          </div>
        </div>
      </Sidebar>
    );
  }

  const editableFields = [
    // Core product information
    { key: 'insurance_name', label: 'Insurance Name', type: 'text', section: 'core' },
    { key: 'provider', label: 'Provider', type: 'text', section: 'core' },
    { key: 'provider_country', label: 'Provider Country', type: 'text', section: 'core' },
    { key: 'category', label: 'Category', type: 'text', section: 'core' },
    { key: 'key_features', label: 'Key Features', type: 'textarea', section: 'core' },
    { key: 'key_features_bullets', label: 'Key Features (Bullets for Comparison)', type: 'textarea', section: 'core', rows: 4 },
    { key: 'document_summary', label: 'Document Summary', type: 'textarea', section: 'core' },
    
    // Financial details
    { key: 'minimum_premium', label: 'Minimum Premium', type: 'text', section: 'financial' },
    { key: 'minimum_sum_assured', label: 'Minimum Sum Assured', type: 'text', section: 'financial' },
    { key: 'maximum_sum_assured', label: 'Maximum Sum Assured', type: 'text', section: 'financial' },
    { key: 'guaranteed_interest_rate', label: 'Guaranteed Interest Rate', type: 'text', section: 'financial' },
    { key: 'historical_performance', label: 'Historical Performance', type: 'textarea', section: 'financial' },
    { key: 'insurance_yield', label: 'Insurance Yield', type: 'text', section: 'financial' },
    { key: 'premium_payment_options', label: 'Premium Payment Options', type: 'textarea', section: 'financial' },
    
    // Target market and suitability
    { key: 'age_of_entry', label: 'Age of Entry', type: 'text', section: 'target' },
    { key: 'suitable_for', label: 'Suitable For', type: 'textarea', section: 'target' },
    { key: 'time_horizon', label: 'Time Horizon', type: 'text', section: 'target' },
    { key: 'target_market', label: 'Target Market', type: 'textarea', section: 'target' },
    
    // Product features and needs
    { key: 'specific_needs', label: 'Specific Needs Addressed', type: 'textarea', section: 'features' },
    { key: 'reason_for_need', label: 'Reason for Need', type: 'textarea', section: 'features' },
    { key: 'riders_addons', label: 'Riders & Add-ons', type: 'textarea', section: 'features' },
    { key: 'death_benefit_options', label: 'Death Benefit Options', type: 'textarea', section: 'features' },
    { key: 'market_positioning', label: 'Market Positioning', type: 'textarea', section: 'features' },
    
    // Legacy fields (for backward compatibility)
    { key: 'title', label: 'Title (Legacy)', type: 'text', section: 'legacy' },
    { key: 'company_name', label: 'Company Name (Legacy)', type: 'text', section: 'legacy' },
    { key: 'product_type', label: 'Product Type (Legacy)', type: 'text', section: 'legacy' },
    { key: 'description', label: 'Description (Legacy)', type: 'textarea', section: 'legacy' },
  ];

  const readOnlyFields = [
    { key: 'insurance_id', label: 'Insurance ID' },
    { key: 'created_at', label: 'Created At' },
    { key: 'updated_at', label: 'Updated At' },
    { key: 'processing_status', label: 'Processing Status' },
    { key: 'pdf_url', label: 'PDF URL' },
    { key: 'markdown_url', label: 'Markdown URL' },
    { key: 'uploaded_by', label: 'Uploaded By' },
  ];

  return (
    <Sidebar>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Edit Product</h1>
                  <p className="mt-2 text-gray-600">
                    Update insurance product details and save changes to the database.
                  </p>
                </div>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  ← Back to Products
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Core Information Section */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Core Product Information</h2>
                  
                  {/* Discontinued Toggle */}
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-700">Product Status:</span>
                    <div className="flex items-center space-x-2">
                      <span className={`text-sm font-medium ${formData.discontinued ? 'text-gray-500' : 'text-green-600'}`}>
                        Active
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleChange('discontinued', !formData.discontinued)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                          formData.discontinued ? 'bg-red-600' : 'bg-green-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            formData.discontinued ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className={`text-sm font-medium ${formData.discontinued ? 'text-red-600' : 'text-gray-500'}`}>
                        Discontinued
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {editableFields.filter(field => field.section === 'core').map(field => (
                    <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field.label}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          value={formData[field.key as keyof ProductDetails] || ''}
                          onChange={(e) => handleInputChange(field.key as keyof ProductDetails, e.target.value)}
                          rows={(field as any).rows || 4}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                        />
                      ) : (
                        <input
                          type={field.type}
                          value={formData[field.key as keyof ProductDetails] || ''}
                          onChange={(e) => handleInputChange(field.key as keyof ProductDetails, e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Details Section */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Financial Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {editableFields.filter(field => field.section === 'financial').map(field => (
                    <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field.label}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          value={formData[field.key as keyof ProductDetails] || ''}
                          onChange={(e) => handleInputChange(field.key as keyof ProductDetails, e.target.value)}
                          rows={(field as any).rows || 4}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                        />
                      ) : (
                        <input
                          type={field.type}
                          value={formData[field.key as keyof ProductDetails] || ''}
                          onChange={(e) => handleInputChange(field.key as keyof ProductDetails, e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Target Market & Suitability Section */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Target Market & Suitability</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {editableFields.filter(field => field.section === 'target').map(field => (
                    <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field.label}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          value={formData[field.key as keyof ProductDetails] || ''}
                          onChange={(e) => handleInputChange(field.key as keyof ProductDetails, e.target.value)}
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                        />
                      ) : (
                        <input
                          type={field.type}
                          value={formData[field.key as keyof ProductDetails] || ''}
                          onChange={(e) => handleInputChange(field.key as keyof ProductDetails, e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Product Features & Benefits Section */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Product Features & Benefits</h2>
                <div className="grid grid-cols-1 gap-6">
                  {editableFields.filter(field => field.section === 'features').map(field => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field.label}
                      </label>
                      <textarea
                        value={formData[field.key as keyof ProductDetails] || ''}
                        onChange={(e) => handleInputChange(field.key as keyof ProductDetails, e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Legacy Fields Section */}
              <div className="bg-gray-50/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-gray-200/50">
                <h2 className="text-xl font-semibold text-gray-700 mb-2">Legacy Fields</h2>
                <p className="text-sm text-gray-600 mb-6">These fields are maintained for backward compatibility but are not actively used.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {editableFields.filter(field => field.section === 'legacy').map(field => (
                    <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                      <label className="block text-sm font-medium text-gray-600 mb-2">
                        {field.label}
                      </label>
                      {field.type === 'textarea' ? (
                        <textarea
                          value={formData[field.key as keyof ProductDetails] || ''}
                          onChange={(e) => handleInputChange(field.key as keyof ProductDetails, e.target.value)}
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-gray-50"
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                        />
                      ) : (
                        <input
                          type={field.type}
                          value={formData[field.key as keyof ProductDetails] || ''}
                          onChange={(e) => handleInputChange(field.key as keyof ProductDetails, e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all bg-gray-50"
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>


              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-4 pt-6">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  disabled={isSaving}
                >
                  {isSaving && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Sidebar>
  );
}

export default function EditProductPage() {
  return (
    <ProtectedRoute requireRole="ADVISOR">
      <EditProductContent />
    </ProtectedRoute>
  );
}