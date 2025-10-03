'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import { apiClient } from '@/lib/api';

interface Product {
  insurance_id: string;
  insurance_name: string;
  provider: string;
  category: string;
  key_features: string;
  created_at: string;
  processing_status: string;
  pdf_url?: string;
}

function AdminProductsContent() {
  const { user } = useAuth();
  const { notifyError, notifySuccess } = useNotifications();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [allProviders, setAllProviders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchProducts();
    fetchTotalCount();
    fetchCategories();
    fetchProviders();
  }, []);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      
      const response = await apiClient.get<{
        success: boolean;
        message: string;
        data: Product[];
      }>('/api/v1/products?limit=50');
      
      const productList = response.data.data || [];
      console.log('Products fetched:', productList.length);
      
      setProducts(productList);
      
    } catch (error: any) {
      console.error('Error fetching products:', error);
      const errorMessage = error.detail || error.message || 'Failed to fetch products';
      notifyError('Fetch Error', errorMessage);
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTotalCount = async () => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        message: string;
        data: { total_count: number };
      }>('/api/v1/products/count');
      
      const count = response.data.data?.total_count || 0;
      console.log('Total products count:', count);
      
      setTotalCount(count);
      
    } catch (error: any) {
      console.error('Error fetching products count:', error);
      // Don't show error notification for count failure, just log it
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        message: string;
        data: string[];
      }>('/api/v1/products/categories');
      
      const categories = response.data.data || [];
      
      setAllCategories(categories);
      
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      // Don't show error notification for categories failure, just log it
    }
  };

  const fetchProviders = async () => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        message: string;
        data: string[];
      }>('/api/v1/products/providers');
      
      const providers = response.data.data || [];
      
      setAllProviders(providers);
      
    } catch (error: any) {
      console.error('Error fetching providers:', error);
      // Don't show error notification for providers failure, just log it
    }
  };

  const handleEditProduct = (product: Product) => {
    router.push(`/products/edit/${product.insurance_id}`);
  };

  const handleViewDocument = (product: Product) => {
    if (!product.pdf_url) {
      notifyError('Document Error', 'No PDF document available for this product');
      return;
    }
    
    const gcsBaseUrl = 'https://storage.googleapis.com/wealth-manager-public';
    const documentUrl = `${gcsBaseUrl}/${product.pdf_url}`;
    
    window.open(documentUrl, '_blank', 'noopener,noreferrer');
  };

  const toggleRowExpansion = (productId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedRows(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (!text) return 'N/A';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'life': 'bg-blue-100 text-blue-800',
      'health': 'bg-green-100 text-green-800',
      'auto': 'bg-red-100 text-red-800',
      'home': 'bg-purple-100 text-purple-800',
      'travel': 'bg-yellow-100 text-yellow-800',
      'business': 'bg-indigo-100 text-indigo-800',
      'investment': 'bg-emerald-100 text-emerald-800',
      'investment-linked': 'bg-emerald-100 text-emerald-800',
      'savings': 'bg-teal-100 text-teal-800',
      'insurance': 'bg-orange-100 text-orange-800',
      'other': 'bg-gray-100 text-gray-800'
    };
    
    const normalizedCategory = category?.toLowerCase().trim() || 'other';
    return colors[normalizedCategory] || colors.other;
  };


  // Filter products based on search and filters
  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm || 
      product.insurance_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.provider?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.key_features?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    const matchesProvider = !selectedProvider || product.provider === selectedProvider;
    
    return matchesSearch && matchesCategory && matchesProvider;
  });

  // Use categories and providers from API (spans all insurances)
  const uniqueCategories = allCategories;
  const uniqueProviders = allProviders;
  

  return (
    <Sidebar>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <main className="max-w-7xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                  Manage Products
                </h1>
                <p className="text-xl text-gray-600">
                  Edit and manage insurance products in the system
                </p>
              </div>
              
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                ← Back to Dashboard
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600 mb-2">
                  {totalCount}
                </div>
                <div className="text-sm text-gray-600">Total Products</div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {totalCount}
                </div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {uniqueProviders.length}
                </div>
                <div className="text-sm text-gray-600">Providers</div>
              </div>
            </div>
            
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">
                  {uniqueCategories.length}
                </div>
                <div className="text-sm text-gray-600">Categories</div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Products
                </label>
                <input
                  type="text"
                  placeholder="Search by name, provider, or features..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                >
                  <option value="">All Categories</option>
                  {uniqueCategories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* Provider Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Provider
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                >
                  <option value="">All Providers</option>
                  {uniqueProviders.map(provider => (
                    <option key={provider} value={provider}>{provider}</option>
                  ))}
                </select>
              </div>

              {/* Clear Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Actions
                </label>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('');
                    setSelectedProvider('');
                  }}
                  className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Products Table */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Found</h3>
              <p className="text-gray-600">
                {products.length === 0 
                  ? "No products available in the system." 
                  : "No products match your current filters."
                }
              </p>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Product</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Provider</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Category</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Created</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredProducts.map((product) => (
                      <tr key={product.insurance_id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900 mb-1">
                              {product.insurance_name || 'Untitled Product'}
                            </div>
                            <div className="text-xs text-gray-500">
                              {expandedRows.has(product.insurance_id) 
                                ? product.key_features || 'No description available'
                                : truncateText(product.key_features, 80)
                              }
                              {product.key_features && product.key_features.length > 80 && (
                                <button
                                  onClick={() => toggleRowExpansion(product.insurance_id)}
                                  className="ml-2 text-blue-600 hover:text-blue-800 font-medium focus:outline-none"
                                >
                                  {expandedRows.has(product.insurance_id) ? 'Show Less' : 'Show More'}
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {product.provider || 'Unknown'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(product.category)}`}>
                            {product.category || 'Other'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">
                            {formatDate(product.created_at)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            {/* View Document Button */}
                            {product.pdf_url && (
                              <button
                                onClick={() => handleViewDocument(product)}
                                className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-lg transition-colors duration-200"
                                title="View PDF Document"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </button>
                            )}
                            
                            {/* Edit Button */}
                            <button
                              onClick={() => handleEditProduct(product)}
                              className="p-2 bg-orange-100 hover:bg-orange-200 text-orange-600 rounded-lg transition-colors duration-200"
                              title="Edit Product"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Showing Results */}
          {!isLoading && filteredProducts.length > 0 && (
            <div className="mt-6 text-center text-sm text-gray-600">
              Showing {filteredProducts.length} of {totalCount} products (displaying latest {products.length})
            </div>
          )}
        </main>
      </div>
    </Sidebar>
  );
}

export default function AdminProductsPage() {
  return (
    <ProtectedRoute requireRole="ADMIN">
      <AdminProductsContent />
    </ProtectedRoute>
  );
}