'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import InsuranceSearch from './InsuranceSearch';

interface ExtractedData {
  basic_info: {
    insurance_name: string | null;
    insurance_provider: string | null;
    currency: string | null;
    product_category: string | null;
  };
  financial_data: {
    death_benefit: string | null;
    premium_per_year: string | null;
    total_premium: string | null;
    payment_period: string | null;
    coverage_term: string | null;
  };
  cash_value_data: {
    has_cash_value: boolean | null;
    breakeven_years: string | null;
    cash_values: Array<{
      age: number;
      value: string;
    }>;
  };
  ratings: {
    snp_rating: string | null;
    financial_strength: string | null;
  };
  policy_details: {
    benefits: string | null;
    exclusions: string | null;
    conditions: string | null;
  };
  extraction_metadata: {
    confidence_score: number;
    extraction_notes: string;
  };
}

interface DatabaseMatch {
  exact_match: any | null;
  fuzzy_matches: Array<{
    insurance_id: string;
    insurance_name: string;
    provider: string;
    similarity_score: number;
  }>;
  match_confidence: number;
  requires_manual_input: boolean;
}

interface IllustrationReviewData {
  illustration_order: number;
  original_filename: string;
  file_size: number;
  extracted_data: ExtractedData;
  database_match: DatabaseMatch;
  extraction_status: string;
  extraction_confidence: number;
  processing_notes: string;
}

interface IllustrationDataReviewProps {
  illustration: IllustrationReviewData;
  onSave: (illustration: IllustrationReviewData) => void;
  onCancel: () => void;
}

export default function IllustrationDataReview({ 
  illustration, 
  onSave, 
  onCancel 
}: IllustrationDataReviewProps) {
  const [editedData, setEditedData] = useState<ExtractedData>(illustration.extracted_data);
  const [selectedInsurance, setSelectedInsurance] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('basic');
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize selected insurance from database match
  useEffect(() => {
    if (illustration.database_match.exact_match) {
      setSelectedInsurance(illustration.database_match.exact_match);
    } else if (illustration.database_match.fuzzy_matches.length > 0 && illustration.database_match.match_confidence > 0.8) {
      const bestMatch = illustration.database_match.fuzzy_matches[0];
      setSelectedInsurance({
        insurance_id: bestMatch.insurance_id,
        insurance_name: bestMatch.insurance_name,
        provider: bestMatch.provider,
        category: 'Insurance'
      });
    }
  }, [illustration.database_match]);

  // Track changes
  useEffect(() => {
    const originalData = illustration.extracted_data;
    const isDifferent = JSON.stringify(originalData) !== JSON.stringify(editedData);
    setHasChanges(isDifferent);
  }, [editedData, illustration.extracted_data]);

  const handleBasicInfoChange = (field: string, value: string) => {
    setEditedData(prev => ({
      ...prev,
      basic_info: {
        ...prev.basic_info,
        [field]: value || null
      }
    }));
  };

  const handleFinancialDataChange = (field: string, value: string) => {
    setEditedData(prev => ({
      ...prev,
      financial_data: {
        ...prev.financial_data,
        [field]: value || null
      }
    }));
  };

  const handleCashValueChange = (field: string, value: any) => {
    setEditedData(prev => ({
      ...prev,
      cash_value_data: {
        ...prev.cash_value_data,
        [field]: value
      }
    }));
  };

  const handleRatingChange = (field: string, value: string) => {
    setEditedData(prev => ({
      ...prev,
      ratings: {
        ...prev.ratings,
        [field]: value || null
      }
    }));
  };

  const handlePolicyDetailsChange = (field: string, value: string) => {
    setEditedData(prev => ({
      ...prev,
      policy_details: {
        ...prev.policy_details,
        [field]: value || null
      }
    }));
  };

  const addCashValue = () => {
    setEditedData(prev => ({
      ...prev,
      cash_value_data: {
        ...prev.cash_value_data,
        cash_values: [
          ...prev.cash_value_data.cash_values,
          { age: 0, value: '' }
        ]
      }
    }));
  };

  const removeCashValue = (index: number) => {
    setEditedData(prev => ({
      ...prev,
      cash_value_data: {
        ...prev.cash_value_data,
        cash_values: prev.cash_value_data.cash_values.filter((_, i) => i !== index)
      }
    }));
  };

  const updateCashValue = (index: number, field: 'age' | 'value', value: string | number) => {
    setEditedData(prev => ({
      ...prev,
      cash_value_data: {
        ...prev.cash_value_data,
        cash_values: prev.cash_value_data.cash_values.map((item, i) => 
          i === index ? { ...item, [field]: value } : item
        )
      }
    }));
  };

  const handleSave = () => {
    // Update the illustration with edited data and selected insurance
    const updatedIllustration: IllustrationReviewData = {
      ...illustration,
      extracted_data: editedData,
      database_match: {
        ...illustration.database_match,
        exact_match: selectedInsurance
      }
    };

    onSave(updatedIllustration);
    toast.success('Illustration data saved successfully');
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: '📋' },
    { id: 'financial', label: 'Financial', icon: '💰' },
    { id: 'cash_value', label: 'Cash Value', icon: '📈' },
    { id: 'ratings', label: 'Ratings', icon: '⭐' },
    { id: 'policy', label: 'Policy Details', icon: '📄' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Review & Edit Illustration Data
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {illustration.original_filename} • Confidence: {Math.round(illustration.extraction_confidence * 100)}%
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Insurance Selection
                </label>
                <InsuranceSearch
                  selectedInsurance={selectedInsurance}
                  onSelect={setSelectedInsurance}
                  fuzzyMatches={illustration.database_match.fuzzy_matches}
                  showFuzzyMatches={true}
                  placeholder="Search for insurance or use extracted name..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Insurance Name
                  </label>
                  <input
                    type="text"
                    value={editedData.basic_info.insurance_name || ''}
                    onChange={(e) => handleBasicInfoChange('insurance_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Provider
                  </label>
                  <input
                    type="text"
                    value={editedData.basic_info.insurance_provider || ''}
                    onChange={(e) => handleBasicInfoChange('insurance_provider', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={editedData.basic_info.currency || ''}
                    onChange={(e) => handleBasicInfoChange('currency', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select currency</option>
                    <option value="USD">USD</option>
                    <option value="SGD">SGD</option>
                    <option value="MYR">MYR</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="IDR">IDR</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Product Category
                  </label>
                  <select
                    value={editedData.basic_info.product_category || ''}
                    onChange={(e) => handleBasicInfoChange('product_category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category</option>
                    <option value="Life Insurance">Life Insurance</option>
                    <option value="Investment-Linked">Investment-Linked</option>
                    <option value="Term Life">Term Life</option>
                    <option value="Whole Life">Whole Life</option>
                    <option value="Medical">Medical</option>
                    <option value="Critical Illness">Critical Illness</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Financial Tab */}
          {activeTab === 'financial' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Death Benefit
                </label>
                <input
                  type="text"
                  value={editedData.financial_data.death_benefit || ''}
                  onChange={(e) => handleFinancialDataChange('death_benefit', e.target.value)}
                  placeholder="e.g., 100,000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Premium per Year
                </label>
                <input
                  type="text"
                  value={editedData.financial_data.premium_per_year || ''}
                  onChange={(e) => handleFinancialDataChange('premium_per_year', e.target.value)}
                  placeholder="e.g., 1,500"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Premium
                </label>
                <input
                  type="text"
                  value={editedData.financial_data.total_premium || ''}
                  onChange={(e) => handleFinancialDataChange('total_premium', e.target.value)}
                  placeholder="e.g., 30,000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Period
                </label>
                <input
                  type="text"
                  value={editedData.financial_data.payment_period || ''}
                  onChange={(e) => handleFinancialDataChange('payment_period', e.target.value)}
                  placeholder="e.g., 20 Years"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Coverage Term
                </label>
                <input
                  type="text"
                  value={editedData.financial_data.coverage_term || ''}
                  onChange={(e) => handleFinancialDataChange('coverage_term', e.target.value)}
                  placeholder="e.g., Lifetime, 65 Years"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Cash Value Tab */}
          {activeTab === 'cash_value' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editedData.cash_value_data.has_cash_value || false}
                      onChange={(e) => handleCashValueChange('has_cash_value', e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">Has Cash Value</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Breakeven Years
                  </label>
                  <input
                    type="text"
                    value={editedData.cash_value_data.breakeven_years || ''}
                    onChange={(e) => handleCashValueChange('breakeven_years', e.target.value)}
                    placeholder="e.g., 15"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700">
                    Cash Values by Age
                  </label>
                  <button
                    onClick={addCashValue}
                    className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                  >
                    Add Cash Value
                  </button>
                </div>

                <div className="space-y-2">
                  {editedData.cash_value_data.cash_values.map((item, index) => (
                    <div key={index} className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        value={item.age}
                        onChange={(e) => updateCashValue(index, 'age', parseInt(e.target.value) || 0)}
                        placeholder="Age"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={item.value}
                        onChange={(e) => updateCashValue(index, 'value', e.target.value)}
                        placeholder="Cash value"
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => removeCashValue(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Ratings Tab */}
          {activeTab === 'ratings' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  S&P Rating
                </label>
                <input
                  type="text"
                  value={editedData.ratings.snp_rating || ''}
                  onChange={(e) => handleRatingChange('snp_rating', e.target.value)}
                  placeholder="e.g., A+, AA-, BBB+"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Financial Strength
                </label>
                <input
                  type="text"
                  value={editedData.ratings.financial_strength || ''}
                  onChange={(e) => handleRatingChange('financial_strength', e.target.value)}
                  placeholder="e.g., Excellent, Very Good"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Policy Details Tab */}
          {activeTab === 'policy' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Benefits
                </label>
                <textarea
                  value={editedData.policy_details.benefits || ''}
                  onChange={(e) => handlePolicyDetailsChange('benefits', e.target.value)}
                  rows={3}
                  placeholder="Key benefits and coverage details..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exclusions
                </label>
                <textarea
                  value={editedData.policy_details.exclusions || ''}
                  onChange={(e) => handlePolicyDetailsChange('exclusions', e.target.value)}
                  rows={3}
                  placeholder="Important exclusions or limitations..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conditions
                </label>
                <textarea
                  value={editedData.policy_details.conditions || ''}
                  onChange={(e) => handlePolicyDetailsChange('conditions', e.target.value)}
                  rows={3}
                  placeholder="Key policy conditions..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {hasChanges && (
                <span className="text-orange-600">● Unsaved changes</span>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}