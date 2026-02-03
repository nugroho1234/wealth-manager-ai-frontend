'use client';

import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import apiClient from '@/lib/api';

interface Insurance {
  insurance_id: string;
  insurance_name: string;
  provider: string;
  category: string;
}

interface InsuranceSearchProps {
  selectedInsurance?: Insurance | null;
  onSelect: (insurance: Insurance | null) => void;
  placeholder?: string;
  disabled?: boolean;
  fuzzyMatches?: Array<{
    insurance_id: string;
    insurance_name: string;
    provider: string;
    similarity_score: number;
  }>;
  showFuzzyMatches?: boolean;
}

export default function InsuranceSearch({ 
  selectedInsurance, 
  onSelect, 
  placeholder = "Search or select insurance...",
  disabled = false,
  fuzzyMatches = [],
  showFuzzyMatches = false
}: InsuranceSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<Insurance[]>([]);
  const [loading, setLoading] = useState(false);
  const [allInsurances, setAllInsurances] = useState<Insurance[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load all insurances on mount
  useEffect(() => {
    loadAllInsurances();
  }, []);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update query when selectedInsurance changes
  useEffect(() => {
    if (selectedInsurance) {
      setQuery(selectedInsurance.insurance_name);
    } else {
      setQuery('');
    }
  }, [selectedInsurance]);

  // Filter options based on query
  useEffect(() => {
    if (query.length === 0) {
      setOptions(allInsurances.slice(0, 20)); // Show first 20 when no query
    } else {
      const filtered = allInsurances.filter(insurance =>
        insurance.insurance_name.toLowerCase().includes(query.toLowerCase()) ||
        insurance.provider.toLowerCase().includes(query.toLowerCase()) ||
        insurance.category.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 20); // Limit to 20 results
      
      setOptions(filtered);
    }
  }, [query, allInsurances]);

  const loadAllInsurances = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/v1/oracle/insurance');
      setAllInsurances(response.data.data || []);
    } catch (error: any) {
      console.error('Error loading insurances:', error);
      toast.error('Failed to load insurance options');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(true);

    // Clear selection if query doesn't match selected insurance
    if (selectedInsurance && value !== selectedInsurance.insurance_name) {
      onSelect(null);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleSelect = (insurance: Insurance) => {
    setQuery(insurance.insurance_name);
    setIsOpen(false);
    onSelect(insurance);
  };

  const handleClear = () => {
    setQuery('');
    onSelect(null);
    inputRef.current?.focus();
  };

  const handleCreateNew = () => {
    if (query.trim()) {
      // Create a temporary insurance object for manual entry
      const newInsurance: Insurance = {
        insurance_id: '', // Empty ID indicates manual entry
        insurance_name: query.trim(),
        provider: 'Manual Entry',
        category: 'Unknown'
      };
      handleSelect(newInsurance);
    }
  };

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />
        
        {/* Clear/Loading indicator */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          ) : query ? (
            <button
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600"
              type="button"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          ) : (
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div
          ref={dropdownRef}
          className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {/* Fuzzy Matches Section */}
          {showFuzzyMatches && fuzzyMatches.length > 0 && (
            <>
              <div className="px-3 py-2 bg-blue-50 border-b border-gray-200">
                <p className="text-xs font-medium text-blue-800">Suggested Matches</p>
              </div>
              {fuzzyMatches.map((match, index) => (
                <button
                  key={`fuzzy-${index}`}
                  onClick={() => handleSelect({
                    insurance_id: match.insurance_id,
                    insurance_name: match.insurance_name,
                    provider: match.provider,
                    category: 'Insurance'
                  })}
                  className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {match.insurance_name}
                    </p>
                    <p className="text-xs text-gray-500">{match.provider}</p>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                      {Math.round(match.similarity_score * 100)}% match
                    </span>
                  </div>
                </button>
              ))}
              {options.length > 0 && (
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                  <p className="text-xs font-medium text-gray-800">All Results</p>
                </div>
              )}
            </>
          )}

          {/* Regular Options */}
          {options.length > 0 ? (
            options.map((insurance) => (
              <button
                key={insurance.insurance_id}
                onClick={() => handleSelect(insurance)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {insurance.insurance_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {insurance.provider} • {insurance.category}
                    </p>
                  </div>
                </div>
              </button>
            ))
          ) : query.length > 0 ? (
            <>
              {/* No results found */}
              <div className="px-4 py-3 text-center text-gray-500">
                <p className="text-sm">No insurances found for "{query}"</p>
                <button
                  onClick={handleCreateNew}
                  className="mt-2 px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                >
                  Use "{query.slice(0, 30)}{query.length > 30 ? '...' : ''}" as manual entry
                </button>
              </div>
            </>
          ) : (
            <div className="px-4 py-3 text-center text-gray-500">
              <p className="text-sm">Start typing to search...</p>
            </div>
          )}
        </div>
      )}

      {/* Selected Insurance Info */}
      {selectedInsurance && !isOpen && (
        <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="font-medium text-green-800">{selectedInsurance.insurance_name}</p>
              <p className="text-green-600">{selectedInsurance.provider} • {selectedInsurance.category}</p>
            </div>
            {selectedInsurance.insurance_id === '' && (
              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                Manual Entry
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}