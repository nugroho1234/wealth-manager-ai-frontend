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
  similarity_score?: number;
  matched_content?: string;
}

interface SearchResult {
  query: string;
  category: string;
  results: Product[];
  total: number;
  category_fallback?: boolean;
  requested_category?: string;
}

function ProductsContent() {
  const { user } = useAuth();
  const { notifyError, notifySuccess } = useNotifications();
  const router = useRouter();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>('ai');
  
  // AI Search state
  const [aiQuery, setAiQuery] = useState('');
  const [aiCategory, setAiCategory] = useState('All');
  const [aiResults, setAiResults] = useState<Product[]>([]);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [categoryFallback, setCategoryFallback] = useState(false);
  const [requestedCategory, setRequestedCategory] = useState<string | null>(null);
  
  // Manual Search state
  const [manualProducts, setManualProducts] = useState<Product[]>([]);
  const [manualSearchName, setManualSearchName] = useState('');
  const [manualCategory, setManualCategory] = useState('');
  const [manualProvider, setManualProvider] = useState('');
  const [isManualLoading, setIsManualLoading] = useState(false);
  
  // Common state
  const [categories, setCategories] = useState<string[]>([]);
  const [providers, setProviders] = useState<string[]>([]);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  
  // Product selection state
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [showMobileWarning, setShowMobileWarning] = useState(false);

  // Chat modal state
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [productToChat, setProductToChat] = useState<Product | null>(null);
  const [chatSessions, setChatSessions] = useState<any[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  useEffect(() => {
    fetchCategories();
    if (activeTab === 'manual') {
      fetchManualProducts();
    }
  }, [activeTab]);

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: string[];
      }>('/api/v1/oracle/products/categories');
      
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchManualProducts = async () => {
    try {
      setIsManualLoading(true);
      
      const params = new URLSearchParams();
      if (manualSearchName) params.append('search', manualSearchName);
      if (manualCategory) params.append('category', manualCategory);
      if (manualProvider) params.append('provider', manualProvider);
      
      const response = await apiClient.get<{
        success: boolean;
        data: {
          total: number;
          limit: number;
          offset: number;
          products: Product[];
        };
      }>(`/api/v1/oracle/products?${params.toString()}`);

      const productList = response.data.data?.products || [];
      setManualProducts(productList);
      
      // Extract unique providers for filter
      const uniqueProviders = Array.from(new Set(
        productList.map(p => p.provider).filter(Boolean)
      ));
      setProviders(uniqueProviders);
      
    } catch (error: any) {
      console.error('Error fetching products:', error);
      const errorMessage = error.detail || error.message || 'Failed to fetch products';
      notifyError('Fetch Error', errorMessage);
      setManualProducts([]);
    } finally {
      setIsManualLoading(false);
    }
  };

  const handleAiSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    if (!aiQuery.trim()) {
      notifyError('Search Error', 'Please enter a search query');
      return;
    }

    try {
      setIsAiSearching(true);
      
      const params = new URLSearchParams({
        query: aiQuery.trim(),
        category: aiCategory,
        limit: '50', // Show top 50 most relevant results
        similarity_threshold: '0.0'
      });
      
      const response = await apiClient.post<{
        success: boolean;
        data: SearchResult;
      }>(`/api/v1/oracle/products/search-ai?${params.toString()}`);
      
      if (response.data.success) {
        setAiResults(response.data.data.results);
        setCategoryFallback(response.data.data.category_fallback || false);
        setRequestedCategory(response.data.data.requested_category || null);

        if (response.data.data.category_fallback) {
          notifySuccess('Search Complete', `No products in '${response.data.data.requested_category}'. Showing ${response.data.data.total} from all categories.`);
        } else {
          notifySuccess('Search Complete', `Found ${response.data.data.total} relevant products`);
        }
      }
      
    } catch (error: any) {
      console.error('Error in AI search:', error);
      const errorMessage = error.detail || error.message || 'AI search failed';
      notifyError('Search Error', errorMessage);
      setAiResults([]);
    } finally {
      setIsAiSearching(false);
    }
  };

  const toggleDescription = (productId: string) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedCards(newExpanded);
  };

  const fetchChatSessions = async () => {
    try {
      setIsLoadingSessions(true);
      const response = await apiClient.get<{
        success: boolean;
        sessions: any[];
        active_count: number;
      }>('/api/v1/oracle/chat/sessions', {
        params: {
          status: 'active',
          limit: 50
        }
      });

      if (response.data.success) {
        setChatSessions(response.data.sessions);
        return response.data.sessions;
      }
      return [];
    } catch (error: any) {
      console.error('Error fetching chat sessions:', error);
      notifyError('Error', 'Failed to fetch chat sessions');
      return [];
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleArchiveSession = async (sessionId: string) => {
    try {
      setIsArchiving(true);
      const response = await apiClient.delete(`/api/v1/oracle/chat/sessions/${sessionId}`);

      if (response.data.success) {
        // Remove from local state
        setChatSessions(prev => prev.filter(s => s.session_id !== sessionId));
        notifySuccess('Session Archived', 'Chat session has been archived');

        // After archiving, navigate to chat with the selected product
        if (productToChat) {
          router.push(`/chat?product=${productToChat.insurance_id}`);
        }
        setShowArchiveModal(false);
        setProductToChat(null);
      }
    } catch (error: any) {
      console.error('Error archiving session:', error);
      notifyError('Error', 'Failed to archive session');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleChatClick = async (product: Product) => {
    // Fetch current sessions
    const sessions = await fetchChatSessions();

    // Check if there's already an existing session for this product
    const existingSession = sessions.find((s: any) => s.insurance_id === product.insurance_id);

    if (existingSession) {
      // Session already exists - navigate directly (even if we have 5 sessions)
      console.log('✅ Existing session found for product:', product.insurance_name);
      router.push(`/chat?product=${product.insurance_id}`);
      return;
    }

    // No existing session - check if we're at the limit
    if (sessions.length >= 5) {
      // Show archive modal to make room for new session
      console.log('⚠️ No existing session, and at 5 session limit. Showing archive modal.');
      setProductToChat(product);
      setShowArchiveModal(true);
    } else {
      // Navigate directly to create new session
      console.log('✅ No existing session, but have room. Creating new session.');
      router.push(`/chat?product=${product.insurance_id}`);
    }
  };

  const handleSelectClick = (product: Product) => {
    const newSelected = new Set(selectedProducts);
    
    if (newSelected.has(product.insurance_id)) {
      // Deselect the product
      newSelected.delete(product.insurance_id);
      setSelectedProducts(newSelected);
      setShowMobileWarning(false);
    } else {
      // Check if we're at the limit
      if (newSelected.size >= 5) {
        notifyError('Selection Limit', 'You can only compare up to 5 products at a time');
        return;
      }
      
      // Select the product
      newSelected.add(product.insurance_id);
      setSelectedProducts(newSelected);
      
      // Show mobile warning if we have 5 products and on mobile
      if (newSelected.size === 5 && window.innerWidth < 768) {
        setShowMobileWarning(true);
        setTimeout(() => setShowMobileWarning(false), 5000); // Hide after 5 seconds
      }
    }
  };

  const handleCompareClick = () => {
    const selectedIds = Array.from(selectedProducts);
    // Open comparison page in new tab
    const compareUrl = `/products/compare?products=${selectedIds.join(',')}`;
    window.open(compareUrl, '_blank');
  };

  const handleViewDocument = (product: Product) => {
    if (!product.pdf_url) {
      console.log('No PDF document available for:', product.insurance_name);
      return;
    }
    
    const gcsBaseUrl = 'https://storage.googleapis.com/wealth-manager-public';
    const documentUrl = `${gcsBaseUrl}/${product.pdf_url}`;
    
    window.open(documentUrl, '_blank', 'noopener,noreferrer');
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const truncateText = (text: string, maxLength: number = 150) => {
    if (!text) return 'No description available';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const renderProductCard = (product: Product) => {
    const isExpanded = expandedCards.has(product.insurance_id);
    const isSelected = selectedProducts.has(product.insurance_id);
    const description = product.key_features || 'No description available';
    
    return (
      <div
        key={product.insurance_id}
        className={`backdrop-blur-sm rounded-2xl p-6 shadow-lg border transition-all duration-300 hover:shadow-xl ${
          isSelected 
            ? 'bg-green-50/90 border-green-300 ring-2 ring-green-200' 
            : 'bg-white/80 border-white/20'
        }`}
      >
        {/* Card Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 pr-3">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
              {product.insurance_name}
            </h3>
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm text-gray-600">🏢</span>
              <span className="text-sm font-medium text-gray-700">
                {product.provider}
              </span>
            </div>
            <div className="flex items-center space-x-2 mb-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(product.category)}`}>
                {product.category}
              </span>
              {product.similarity_score && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {Math.round(product.similarity_score * 100)}% match
                </span>
              )}
            </div>
          </div>
          
          {/* View Document Button */}
          {product.pdf_url && (
            <button
              onClick={() => handleViewDocument(product)}
              className="flex items-center justify-center w-9 h-9 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-full transition-colors duration-200 flex-shrink-0"
              title="View PDF Document"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </button>
          )}
        </div>

        {/* Description */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            {isExpanded ? description : truncateText(description)}
          </p>
          {description.length > 150 && (
            <button
              onClick={() => toggleDescription(product.insurance_id)}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium mt-2 focus:outline-none"
            >
              {isExpanded ? 'Show Less' : 'Show More'}
            </button>
          )}
          {product.matched_content && (
            <div className="mt-2 p-2 bg-purple-50 rounded-lg">
              <p className="text-xs text-purple-700">
                <strong>AI Match:</strong> {product.matched_content}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            Added {formatDate(product.created_at)}
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Chat Button */}
            <button
              onClick={() => handleChatClick(product)}
              className="flex items-center justify-center w-10 h-10 bg-primary-100 hover:bg-primary-200 text-primary-600 rounded-full transition-colors duration-200"
              title="Chat about this product"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>

            {/* Select Button */}
            <button
              onClick={() => handleSelectClick(product)}
              disabled={!isSelected && selectedProducts.size >= 5}
              className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors duration-200 ${
                isSelected
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : selectedProducts.size >= 5
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-100 hover:bg-green-200 text-green-600'
              }`}
              title={
                isSelected 
                  ? 'Deselect this product' 
                  : selectedProducts.size >= 5 
                  ? 'Maximum 5 products can be selected'
                  : 'Select this product'
              }
            >
              {isSelected ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Sidebar>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <main className="max-w-7xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Insurance Products
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Search using AI for intelligent product recommendations, or browse manually with filters
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex justify-center mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-2 shadow-lg border border-white/20">
              <div className="flex space-x-2">
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    activeTab === 'ai'
                      ? 'bg-primary-600 text-white shadow-lg'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  🤖 Search with AI
                </button>
                <button
                  onClick={() => setActiveTab('manual')}
                  className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                    activeTab === 'manual'
                      ? 'bg-primary-600 text-white shadow-lg'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  🔍 Manual Search
                </button>
              </div>
            </div>
          </div>

          {/* AI Search Tab */}
          {activeTab === 'ai' && (
            <div className="space-y-8">
              {/* AI Search Form */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    AI-Powered Product Search
                  </h2>
                  <p className="text-gray-600">
                    Describe your client's needs in natural language and let AI find the best matches
                  </p>
                </div>

                <form onSubmit={handleAiSearch} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Describe Your Client's Needs
                    </label>
                    <textarea
                      value={aiQuery}
                      onChange={(e) => setAiQuery(e.target.value)}
                      placeholder="Example: 55 year old smoker looking for life insurance that accepts smokers with good coverage..."
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category Filter
                      </label>
                      <select
                        value={aiCategory}
                        onChange={(e) => setAiCategory(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                      >
                        <option value="All">All Categories</option>
                        {categories.map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        type="submit"
                        disabled={isAiSearching || !aiQuery.trim()}
                        className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {isAiSearching && (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        )}
                        {isAiSearching ? 'Searching with AI...' : '🤖 Search with AI'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Category Fallback Warning Banner */}
              {categoryFallback && aiResults.length > 0 && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg mb-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        <strong>No insurance products with the {requestedCategory} found.</strong> Displaying other categories.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Search Results */}
              {aiResults.length > 0 ? (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-900">
                      AI Search Results ({aiResults.length})
                    </h3>
                    <span className="text-sm text-gray-600">
                      Query: "{aiQuery}"
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {aiResults.map(renderProductCard)}
                  </div>
                </div>
              ) : aiQuery && !isAiSearching ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No matching insurance products found</h3>
                  <p className="text-gray-600">
                    Try adjusting your search query or selecting "All Categories".
                  </p>
                </div>
              ) : null}
            </div>
          )}

          {/* Manual Search Tab */}
          {activeTab === 'manual' && (
            <div className="space-y-8">
              {/* Manual Search Filters */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/20">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    Manual Product Search
                  </h2>
                  <p className="text-gray-600">
                    Filter products by name, category, and provider
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Name
                    </label>
                    <input
                      type="text"
                      value={manualSearchName}
                      onChange={(e) => setManualSearchName(e.target.value)}
                      placeholder="Search by product name..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category
                    </label>
                    <select
                      value={manualCategory}
                      onChange={(e) => setManualCategory(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    >
                      <option value="">All Categories</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Provider
                    </label>
                    <select
                      value={manualProvider}
                      onChange={(e) => setManualProvider(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    >
                      <option value="">All Providers</option>
                      {providers.map(provider => (
                        <option key={provider} value={provider}>{provider}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-6 flex justify-center">
                  <button
                    onClick={fetchManualProducts}
                    disabled={isManualLoading}
                    className="px-8 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isManualLoading && (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    )}
                    {isManualLoading ? 'Searching...' : '🔍 Search Products'}
                  </button>
                </div>
              </div>

              {/* Manual Search Results */}
              {isManualLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="text-gray-600 mt-4">Loading products...</p>
                </div>
              ) : manualProducts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Found</h3>
                  <p className="text-gray-600">Try adjusting your search filters.</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-center mb-8">
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary-600 mb-2">
                          {manualProducts.length}
                        </div>
                        <div className="text-sm text-gray-600">Products Found</div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {manualProducts.map(renderProductCard)}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
        
        {/* Floating Compare Button */}
        {selectedProducts.size >= 2 && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-white/20">
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  {selectedProducts.size} of 5 products selected
                </div>
                <button
                  onClick={handleCompareClick}
                  className="px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>Compare Products</span>
                </button>
                <button
                  onClick={() => setSelectedProducts(new Set())}
                  className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors text-sm"
                  title="Clear all selections"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Warning */}
        {showMobileWarning && (
          <div className="fixed top-20 left-4 right-4 z-50 md:hidden">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Mobile Notice:</strong> Comparing 5 products on mobile may affect readability. Consider using fewer products for better experience.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Archive Session Modal */}
        {showArchiveModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Chat Session Limit Reached</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    You have 5 active chats (maximum). Archive one to continue with{' '}
                    <strong>{productToChat?.insurance_name}</strong>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowArchiveModal(false);
                    setProductToChat(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {isLoadingSessions ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                  <p className="text-sm text-gray-600 mt-3">Loading sessions...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {chatSessions.map((session: any) => (
                    <div
                      key={session.session_id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1 min-w-0 mr-4">
                        <h4 className="font-medium text-gray-900 truncate">
                          {session.session_name}
                        </h4>
                        <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                          <span>{session.message_count} messages</span>
                          <span>•</span>
                          <span>
                            Last active: {new Date(session.last_message_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleArchiveSession(session.session_id)}
                        disabled={isArchiving}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                      >
                        {isArchiving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Archiving...</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            <span>Archive</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowArchiveModal(false);
                    setProductToChat(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Sidebar>
  );
}

export default function ProductsPage() {
  return (
    <ProtectedRoute>
      <ProductsContent />
    </ProtectedRoute>
  );
}