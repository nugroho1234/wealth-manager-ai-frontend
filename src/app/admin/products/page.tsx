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
  discontinued: boolean;
}

interface ProductsResponse {
  products: Product[];
  total: number;
  limit: number;
  offset: number;
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [showDiscontinued, setShowDiscontinued] = useState(true);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchProviders();
  }, [currentPage, itemsPerPage, selectedCategory, selectedProvider, showDiscontinued]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);

      const offset = (currentPage - 1) * itemsPerPage;

      // Build query parameters
      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: offset.toString(),
        include_discontinued: showDiscontinued.toString(),
      });

      if (selectedCategory) {
        params.append('category', selectedCategory);
      }

      if (selectedProvider) {
        params.append('provider', selectedProvider);
      }

      // Admin view: include discontinued products
      const response = await apiClient.get<{
        success: boolean;
        message: string;
        data: ProductsResponse;
      }>(`/api/v1/products?${params.toString()}`);

      const data = response.data.data;
      const productList = data.products || [];
      const total = data.total || 0;

      console.log('Products fetched:', productList.length, 'Total:', total);

      setProducts(productList);
      setTotalCount(total);

    } catch (error: any) {
      console.error('Error fetching products:', error);
      const errorMessage = error.detail || error.message || 'Failed to fetch products';
      notifyError('Fetch Error', errorMessage);
      setProducts([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
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

  const handleToggleDiscontinued = async (product: Product) => {
    const action = product.discontinued ? 'reactivate' : 'discontinue';
    const confirmMessage = product.discontinued
      ? `Are you sure you want to reactivate "${product.insurance_name}"? It will be visible to users again.`
      : `Are you sure you want to discontinue "${product.insurance_name}"? It will be hidden from users but existing chat sessions will continue to work.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      await apiClient.put(`/api/v1/products/${product.insurance_id}`, {
        discontinued: !product.discontinued
      });

      notifySuccess(
        'Success',
        `Product ${action}d successfully`
      );

      // Refresh products list
      await fetchProducts();
    } catch (error: any) {
      console.error(`Error ${action}ing product:`, error);
      const errorMessage = error.detail || error.message || `Failed to ${action} product`;
      notifyError('Update Error', errorMessage);
    }
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

  // Pagination controls
  const totalPages = totalCount > 0 ? Math.ceil(totalCount / itemsPerPage) : 0;
  const startIndex = totalCount > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endIndex = totalCount > 0 ? Math.min(currentPage * itemsPerPage, totalCount) : 0;

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page when changing items per page
  };

  const handleFilterChange = (filterType: 'category' | 'provider', value: string) => {
    if (filterType === 'category') {
      setSelectedCategory(value);
    } else {
      setSelectedProvider(value);
    }
    setCurrentPage(1); // Reset to first page when changing filters
  };

  // Filter products client-side for search (since API doesn't support search yet)
  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm ||
      product.insurance_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.provider?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.key_features?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  // Use categories and providers from API
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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
                  onChange={(e) => handleFilterChange('category', e.target.value)}
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
                  onChange={(e) => handleFilterChange('provider', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                >
                  <option value="">All Providers</option>
                  {uniqueProviders.map(provider => (
                    <option key={provider} value={provider}>{provider}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Bottom row with checkbox and clear button */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
              {/* Show Discontinued Checkbox */}
              <label className="flex items-center cursor-pointer group">
                <input
                  type="checkbox"
                  checked={showDiscontinued}
                  onChange={(e) => {
                    setShowDiscontinued(e.target.checked);
                    setCurrentPage(1);
                  }}
                  className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-2 focus:ring-primary-500 cursor-pointer"
                />
                <span className="ml-2 text-sm font-medium text-gray-700 group-hover:text-gray-900">
                  Show discontinued products
                </span>
              </label>

              {/* Clear Filters Button */}
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('');
                  setSelectedProvider('');
                  setShowDiscontinued(true);
                  setCurrentPage(1);
                }}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
              >
                Clear All Filters
              </button>
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
            <>
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
                              <div className="text-sm font-medium text-gray-900 mb-1 flex items-center gap-2">
                                <span className={product.discontinued ? 'text-gray-400' : ''}>
                                  {product.insurance_name || 'Untitled Product'}
                                </span>
                                {product.discontinued && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                    DISCONTINUED
                                  </span>
                                )}
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

                              {/* Discontinue/Reactivate Button */}
                              <button
                                onClick={() => handleToggleDiscontinued(product)}
                                className={`p-2 rounded-lg transition-colors duration-200 ${
                                  product.discontinued
                                    ? 'bg-green-100 hover:bg-green-200 text-green-600'
                                    : 'bg-red-100 hover:bg-red-200 text-red-600'
                                }`}
                                title={product.discontinued ? 'Reactivate Product' : 'Discontinue Product'}
                              >
                                {product.discontinued ? (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination Controls */}
              <div className="mt-6 bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  {/* Results Info */}
                  <div className="text-sm text-gray-600">
                    Showing <span className="font-medium text-gray-900">{startIndex}</span> to{' '}
                    <span className="font-medium text-gray-900">{endIndex}</span> of{' '}
                    <span className="font-medium text-gray-900">{totalCount}</span> products
                  </div>

                  {/* Page Controls */}
                  <div className="flex items-center gap-2">
                    {/* First Page */}
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1 || totalPages === 0}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      First
                    </button>

                    {/* Previous Page */}
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || totalPages === 0}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Previous
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
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
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                              currentPage === pageNum
                                ? 'bg-primary-600 text-white'
                                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    {/* Next Page */}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= totalPages || totalPages === 0}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next →
                    </button>

                    {/* Last Page */}
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage >= totalPages || totalPages === 0}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Last
                    </button>
                  </div>

                  {/* Items Per Page */}
                  <div className="flex items-center gap-2">
                    <label htmlFor="itemsPerPage" className="text-sm text-gray-600">
                      Per page:
                    </label>
                    <select
                      id="itemsPerPage"
                      value={itemsPerPage}
                      onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
              </div>
            </>
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
