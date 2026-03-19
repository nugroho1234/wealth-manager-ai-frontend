/**
 * Mobile Product Selector Modal
 * Modal for selecting insurance products on mobile devices
 *
 * Part of Mobile Chat Sessions Enhancement
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search } from "lucide-react";

interface Product {
  insurance_id: string;
  insurance_name: string;
  provider: string;
  category: string;
  key_features: string;
  created_at: string;
}

interface MobileProductSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  isLoading: boolean;
  onSelectProduct: (product: Product) => void;
  selectedProduct: Product | null;
}

export default function MobileProductSelector({
  isOpen,
  onClose,
  products,
  isLoading,
  onSelectProduct,
  selectedProduct,
}: MobileProductSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter products based on search query
  const filteredProducts = products.filter(product => {
    const searchLower = searchQuery.toLowerCase();
    return (
      product.insurance_name.toLowerCase().includes(searchLower) ||
      product.provider.toLowerCase().includes(searchLower) ||
      product.category.toLowerCase().includes(searchLower)
    );
  });

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Handle product selection
  const handleProductSelect = (product: Product) => {
    onSelectProduct(product);
    onClose();
  };

  // Get category color
  const getCategoryColor = (category: string) => {
    const colors = {
      'critical illness': 'bg-red-100 text-red-800 border-red-200',
      'whole life': 'bg-purple-100 text-purple-800 border-purple-200',
      'term life': 'bg-blue-100 text-blue-800 border-blue-200',
      'endowment': 'bg-green-100 text-green-800 border-green-200',
      'universal life': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'hospital & surgical': 'bg-pink-100 text-pink-800 border-pink-200',
      'savings plan': 'bg-teal-100 text-teal-800 border-teal-200',
      'investment-linked': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'other': 'bg-gray-100 text-gray-800 border-gray-200'
    };

    return colors[category.toLowerCase() as keyof typeof colors] || colors.other;
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-x-4 top-[10%] bottom-[10%] bg-white rounded-2xl shadow-2xl z-[71] flex flex-col animate-in slide-in-from-bottom-5 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-primary-50 to-blue-50">
          <div className="flex items-center space-x-2">
            <Search className="w-5 h-5 text-primary-600" />
            <h3 className="font-semibold text-gray-900">Select Insurance Product</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search insurance products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
          </div>
          {searchQuery && (
            <p className="text-xs text-gray-500 mt-2">
              Found {filteredProducts.length} product{filteredProducts.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Products List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-sm text-gray-500">Loading products...</p>
              </div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center px-4">
                <div className="text-4xl mb-3">🔍</div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">No Products Found</h3>
                <p className="text-xs text-gray-500">
                  {searchQuery
                    ? `No products match "${searchQuery}". Try a different search term.`
                    : 'No insurance products available.'
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {filteredProducts.map((product) => (
                <button
                  key={product.insurance_id}
                  onClick={() => handleProductSelect(product)}
                  className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                    selectedProduct?.insurance_id === product.insurance_id
                      ? 'border-primary-300 bg-primary-50'
                      : 'border-gray-200 hover:border-primary-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm text-gray-900 leading-tight flex-1 pr-2">
                      {product.insurance_name}
                    </h4>
                    {selectedProduct?.insurance_id === product.insurance_id && (
                      <svg className="w-5 h-5 text-primary-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    🏢 {product.provider}
                  </p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(product.category)}`}>
                    {product.category}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Select a product to start chatting about it
          </p>
        </div>
      </div>
    </>
  );
}
