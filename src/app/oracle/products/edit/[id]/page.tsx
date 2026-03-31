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
  company_id?: string;

  // Modern fields (23 base fields including new jurisdiction)
  insurance_name?: string;
  provider?: string;
  provider_country?: string;
  jurisdiction?: string; // NEW: Nationality/residency restrictions
  jurisdiction_confidence_score?: number;
  jurisdiction_confidence_level?: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
  jurisdiction_requires_review?: boolean;
  jurisdiction_manually_verified?: boolean;
  category?: string;
  key_features?: string;
  key_features_bullets?: string;
  document_summary?: string;
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
  market_positioning?: string;
  discontinued?: boolean;

  // GROUP 1: Product Identity & Structure (5 fields)
  product_core_type?: string;
  coverage_term?: string;
  base_currency_options?: string[]; // Array field
  policy_term_maturity?: string;
  premium_structure?: string;

  // GROUP 2: Critical Illness Coverage (18 fields)
  ci_total_conditions_covered?: number;
  ci_early_minor_stage?: string | null; // TEXT - descriptive coverage info
  ci_intermediate_stage?: string | null; // TEXT - descriptive coverage info
  ci_major_advanced_stage?: string | null; // TEXT - descriptive coverage info
  ci_max_claims_allowed?: string;
  ci_waiting_period_between_claims?: string;
  ci_relapse_recurrent_rule?: string;
  ci_grouping_pot_rules?: string;
  ci_waiver_triggers?: string;
  ci_waiver_duration?: string;
  ci_icu_benefit?: string;
  ci_juvenile_special_needs?: string;
  ci_angioplasty_benefit?: string;
  ci_benign_tumor_benefit?: string;
  ci_initial_waiting_period?: string;
  ci_survival_period?: string;
  ci_pre_existing_conditions?: string;
  ci_age_limits_on_coverage?: string;

  // GROUP 3: Death Benefit & Life Protection (23 fields)
  death_benefit_guarantee?: string;
  death_benefit_multipliers?: string;
  death_benefit_payout_options?: string;
  terminal_illness_benefit?: string;
  total_permanent_disability?: string;
  growth_mechanism?: string;
  downside_protection_floor?: string;
  upside_potential_cap?: string;
  loyalty_special_bonuses?: string;
  cash_value_access?: string;
  premium_holiday_pause?: string;
  critical_illness_rider?: string;
  premium_waiver_riders?: string;
  accidental_death_benefit?: string;
  retrenchment_benefit?: string;
  change_of_life_insured?: string;
  policy_split_option?: string;
  contingent_policy_owner?: string;
  mental_incapacity_benefit?: string;
  guaranteed_issuance_option?: string;
  convertibility_option?: string;
  suicide_exclusion?: string;
  medical_underwriting?: string;

  // GROUP 4: Savings & Endowment (23 fields)
  savings_premium_funding_options?: string;
  savings_top_up_injections?: string;
  savings_growth_mechanism?: string;
  savings_bonus_structure?: string;
  savings_cashback_coupon_payouts?: string;
  savings_cashback_reinvestment?: string;
  savings_income_payout_period?: string;
  savings_capital_guarantee_status?: string;
  savings_guaranteed_breakeven_target?: string;
  savings_partial_withdrawals?: string;
  savings_policy_loan?: string;
  savings_premium_holiday?: string;
  savings_retrenchment_benefit?: string;
  savings_embedded_riders?: string;
  savings_accidental_death?: string;
  savings_change_of_insured?: string;
  savings_policy_split?: string;
  savings_contingent_owner?: string;
  savings_death_settlement?: string;
  savings_mental_incapacity?: string;
  savings_medical_underwriting?: string;
  savings_entry_age_limits?: string;
  savings_surrender_penalties?: string;

  // GROUP 5: Investment-Linked Plans (21 fields)
  ilp_premium_funding_options?: string;
  ilp_top_up_injections?: string;
  ilp_fund_universe?: string;
  ilp_fund_switching_fee?: string;
  ilp_dividend_paying_funds?: string;
  ilp_dividend_settlement?: string;
  ilp_auto_rebalancing?: string;
  ilp_welcome_initial_bonus?: string;
  ilp_loyalty_bonus?: string;
  ilp_special_milestone_bonus?: string;
  ilp_bonus_clawback_rules?: string;
  ilp_premium_charge?: string;
  ilp_account_maintenance_fee?: string;
  ilp_fund_management_fee?: string;
  ilp_early_surrender_penalty?: string;
  ilp_premium_holiday?: string;
  ilp_partial_withdrawals?: string;
  ilp_minimum_account_balance?: string;
  death_benefit_options?: string;
  ilp_embedded_riders?: string;
  ilp_change_of_insured?: string;
  ilp_medical_underwriting?: string;

  // GROUP 6: Hospital Insurance (17 fields)
  hospital_geographical_coverage?: string;
  hospital_room_board_entitlement?: string;
  hospital_annual_limit?: string;
  hospital_lifetime_limit?: string;
  hospital_as_charged_vs_sublimits?: string;
  hospital_deductible?: string;
  hospital_coinsurance_copay?: string;
  hospital_oop_maximum?: string;
  hospital_pre_hospitalization_coverage?: string;
  hospital_post_hospitalization_coverage?: string;
  hospital_outpatient_cancer_dialysis?: string;
  hospital_maternity_dental_options?: string;
  hospital_direct_billing_cashless?: string;
  hospital_guaranteed_renewability?: string;
  hospital_pre_existing_conditions?: string;
  hospital_emergency_evacuation?: string;
  hospital_second_opinion_concierge?: string;

  // Legacy fields (for backward compatibility)
  title?: string;
  company_name?: string;
  product_type?: string;
  description?: string;
}

// Common currency options
const COMMON_CURRENCIES = ['USD', 'SGD', 'HKD', 'GBP', 'EUR', 'AUD', 'IDR', 'MYR', 'THB', 'CNY', 'JPY'];

// Category colors for badges
const CATEGORY_COLORS: Record<string, string> = {
  'critical illness': 'bg-red-100 text-red-800',
  'whole life': 'bg-blue-100 text-blue-800',
  'term life insurance': 'bg-indigo-100 text-indigo-800',
  'universal life': 'bg-purple-100 text-purple-800',
  'indexed universal life': 'bg-violet-100 text-violet-800',
  'variable universal life': 'bg-fuchsia-100 text-fuchsia-800',
  'endowment': 'bg-green-100 text-green-800',
  'savings plan': 'bg-emerald-100 text-emerald-800',
  'investment-linked': 'bg-yellow-100 text-yellow-800',
  'hospital': 'bg-pink-100 text-pink-800',
};

// Determine category type for conditional rendering
function getCategoryType(category?: string): 'CI' | 'LIFE' | 'SAVINGS' | 'ILP' | 'HOSPITAL' | null {
  if (!category) return null;
  const cat = category.toLowerCase();

  if (cat === 'critical illness') return 'CI';
  if (['whole life', 'term life insurance', 'universal life', 'indexed universal life', 'variable universal life'].includes(cat)) {
    return 'LIFE';
  }
  if (['endowment', 'savings plan'].includes(cat)) return 'SAVINGS';
  if (cat === 'investment-linked') return 'ILP';
  if (cat === 'hospital') return 'HOSPITAL';

  return null;
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

    } catch (error: any) {
      console.error('Error fetching product details:', error);
      const errorMessage = error.detail || error.message || 'Failed to fetch product details';
      notifyError('Fetch Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const updateField = (field: keyof ProductDetails, value: any) => {
    setProduct((prev) => prev ? { ...prev, [field]: value } : null);
  };

  const handleSave = async () => {
    if (!product) return;

    setIsSaving(true);

    try {
      const response = await apiClient.put<{
        success: boolean;
        message: string;
        data: ProductDetails;
      }>(`/api/v1/oracle/products/${productId}`, product);

      if (response.data.success) {
        notifySuccess('Success', 'Product updated successfully');
        router.push('/oracle/admin/products');
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
    router.push('/oracle/admin/products');
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
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
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

  const categoryType = getCategoryType(product.category);

  return (
    <Sidebar>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Edit Insurance Product</h1>
                <p className="mt-1 text-sm text-gray-500">Product ID: {productId}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* CORE PRODUCT INFORMATION - Always Visible */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 pb-2 border-b">
                CORE PRODUCT INFORMATION
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Insurance Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Name</label>
                  <input
                    type="text"
                    value={product.insurance_name || ''}
                    onChange={(e) => updateField('insurance_name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Provider */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                  <input
                    type="text"
                    value={product.provider || ''}
                    onChange={(e) => updateField('provider', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Provider Country */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider Country</label>
                  <input
                    type="text"
                    value={product.provider_country || ''}
                    onChange={(e) => updateField('provider_country', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={product.category || ''}
                      onChange={(e) => updateField('category', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select category</option>
                      <option value="critical illness">Critical Illness</option>
                      <option value="whole life">Whole Life</option>
                      <option value="term life insurance">Term Life Insurance</option>
                      <option value="universal life">Universal Life</option>
                      <option value="indexed universal life">Indexed Universal Life</option>
                      <option value="variable universal life">Variable Universal Life</option>
                      <option value="endowment">Endowment</option>
                      <option value="savings plan">Savings Plan</option>
                      <option value="investment-linked">Investment-Linked</option>
                      <option value="hospital">Hospital / Medical</option>
                    </select>
                    {product.category && (
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[product.category.toLowerCase()] || 'bg-gray-100 text-gray-800'}`}>
                        {product.category}
                      </span>
                    )}
                  </div>
                </div>

                {/* Jurisdiction */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jurisdiction
                    {product.jurisdiction_confidence_score && (
                      <span className={`ml-2 text-xs ${
                        product.jurisdiction_confidence_level === 'HIGH'
                          ? 'text-green-600'
                          : product.jurisdiction_confidence_level === 'MEDIUM'
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}>
                        ({product.jurisdiction_confidence_score.toFixed(0)}% confidence)
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={product.jurisdiction || ''}
                    onChange={(e) => updateField('jurisdiction', e.target.value)}
                    placeholder="e.g., Singaporeans only, Malaysia residents"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {product.jurisdiction_requires_review && (
                    <div className="mt-2">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={product.jurisdiction_manually_verified || false}
                          onChange={(e) => updateField('jurisdiction_manually_verified', e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          I have verified this jurisdiction is correct
                        </span>
                      </label>
                      <p className="mt-1 text-xs text-gray-500">
                        Checking this box will remove the review warning from the manage products page.
                      </p>
                    </div>
                  )}
                </div>

                {/* Product Core Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Core Type</label>
                  <input
                    type="text"
                    value={product.product_core_type || ''}
                    onChange={(e) => updateField('product_core_type', e.target.value)}
                    placeholder="e.g., Standalone Term CI, Whole Life CI Rider"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Coverage Term */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Coverage Term</label>
                  <input
                    type="text"
                    value={product.coverage_term || ''}
                    onChange={(e) => updateField('coverage_term', e.target.value)}
                    placeholder="e.g., Up to Age 99, 20 Years"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Policy Term / Maturity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Policy Term / Maturity</label>
                  <input
                    type="text"
                    value={product.policy_term_maturity || ''}
                    onChange={(e) => updateField('policy_term_maturity', e.target.value)}
                    placeholder="e.g., 10 years, Up to Age 65"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Base Currency Options */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Currency Options</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {COMMON_CURRENCIES.map((currency) => {
                      const isSelected = product.base_currency_options?.includes(currency);
                      return (
                        <button
                          key={currency}
                          type="button"
                          onClick={() => {
                            const current = product.base_currency_options || [];
                            const updated = isSelected
                              ? current.filter((c) => c !== currency)
                              : [...current, currency];
                            updateField('base_currency_options', updated);
                          }}
                          className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {currency}
                        </button>
                      );
                    })}
                  </div>
                  <div className="text-xs text-gray-500">
                    Selected: {product.base_currency_options?.join(', ') || 'None'}
                  </div>
                </div>
              </div>

              {/* Key Features, Key Features Bullets, Document Summary */}
              <div className="grid grid-cols-1 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Key Features</label>
                  <textarea
                    value={product.key_features || ''}
                    onChange={(e) => updateField('key_features', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Key Features Bullets</label>
                  <textarea
                    value={product.key_features_bullets || ''}
                    onChange={(e) => updateField('key_features_bullets', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Document Summary</label>
                  <textarea
                    value={product.document_summary || ''}
                    onChange={(e) => updateField('document_summary', e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* CRITICAL ILLNESS CATEGORY-SPECIFIC FIELDS */}
            {categoryType === 'CI' && (
              <div className="bg-white shadow rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b">
                  CRITICAL ILLNESS SPECIFIC FIELDS
                </h2>

                {/* Section 1: Product Identity & Structure */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 1: Product Identity & Structure</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Premium Structure</label>
                      <input
                        type="text"
                        value={product.premium_structure || ''}
                        onChange={(e) => updateField('premium_structure', e.target.value)}
                        placeholder="e.g., Level Guaranteed, Step-up, Reviewable"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: CI Coverage Scope */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 2: CI Coverage Scope</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total Conditions Covered</label>
                      <input
                        type="number"
                        value={product.ci_total_conditions_covered || ''}
                        onChange={(e) => updateField('ci_total_conditions_covered', parseInt(e.target.value) || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Max Claims Allowed</label>
                      <input
                        type="text"
                        value={product.ci_max_claims_allowed || ''}
                        onChange={(e) => updateField('ci_max_claims_allowed', e.target.value)}
                        placeholder="e.g., Single-Pay only, Multi-Pay up to 600% of SA"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Early/Minor Stage CIs - TEXT */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Early/Minor Stage CIs</label>
                      <input
                        type="text"
                        value={product.ci_early_minor_stage || ''}
                        onChange={(e) => updateField('ci_early_minor_stage', e.target.value)}
                        placeholder="e.g., 42 conditions, pays 25% of SA"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Intermediate Stage CIs - TEXT */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Intermediate Stage CIs</label>
                      <input
                        type="text"
                        value={product.ci_intermediate_stage || ''}
                        onChange={(e) => updateField('ci_intermediate_stage', e.target.value)}
                        placeholder="e.g., 15 conditions, pays 50% of SA"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Major/Advanced Stage CIs - TEXT */}
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Major/Advanced Stage CIs</label>
                      <input
                        type="text"
                        value={product.ci_major_advanced_stage || ''}
                        onChange={(e) => updateField('ci_major_advanced_stage', e.target.value)}
                        placeholder="e.g., 60 conditions, pays 100% of SA"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Multi-Pay & Claim Rules */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 3: Multi-Pay & Claim Rules</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Waiting Period (Between Claims)</label>
                      <input
                        type="text"
                        value={product.ci_waiting_period_between_claims || ''}
                        onChange={(e) => updateField('ci_waiting_period_between_claims', e.target.value)}
                        placeholder="e.g., 1 year between major claims"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Relapse/Recurrent Rule</label>
                      <input
                        type="text"
                        value={product.ci_relapse_recurrent_rule || ''}
                        onChange={(e) => updateField('ci_relapse_recurrent_rule', e.target.value)}
                        placeholder="e.g., Covers relapse after 2 years"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Grouping/Pot Rules</label>
                      <input
                        type="text"
                        value={product.ci_grouping_pot_rules || ''}
                        onChange={(e) => updateField('ci_grouping_pot_rules', e.target.value)}
                        placeholder="e.g., Grouped into 3 pots, max 2 claims per pot"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Built-In Premium Waivers */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 4: Built-In Premium Waivers</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Waiver Triggers</label>
                      <input
                        type="text"
                        value={product.ci_waiver_triggers || ''}
                        onChange={(e) => updateField('ci_waiver_triggers', e.target.value)}
                        placeholder="e.g., Upon Early CI, or only Major CI"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Waiver Duration</label>
                      <input
                        type="text"
                        value={product.ci_waiver_duration || ''}
                        onChange={(e) => updateField('ci_waiver_duration', e.target.value)}
                        placeholder="e.g., Rest of policy term"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 5: Special / Additional Benefits */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 5: Special / Additional Benefits</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ICU Benefit</label>
                      <input
                        type="text"
                        value={product.ci_icu_benefit || ''}
                        onChange={(e) => updateField('ci_icu_benefit', e.target.value)}
                        placeholder="e.g., Pays 20% of SA if in ICU > 4 days"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Juvenile / Special Needs Coverage</label>
                      <input
                        type="text"
                        value={product.ci_juvenile_special_needs || ''}
                        onChange={(e) => updateField('ci_juvenile_special_needs', e.target.value)}
                        placeholder="e.g., Covers severe autism, ADHD up to age 18"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Angioplasty Benefit</label>
                      <input
                        type="text"
                        value={product.ci_angioplasty_benefit || ''}
                        onChange={(e) => updateField('ci_angioplasty_benefit', e.target.value)}
                        placeholder="e.g., 10% payout, does not reduce SA"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Benign Tumor Benefit</label>
                      <input
                        type="text"
                        value={product.ci_benign_tumor_benefit || ''}
                        onChange={(e) => updateField('ci_benign_tumor_benefit', e.target.value)}
                        placeholder="e.g., 10% for surgical removal"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Death Benefit</label>
                      <input
                        type="text"
                        value={product.death_benefit_options || ''}
                        onChange={(e) => updateField('death_benefit_options', e.target.value)}
                        placeholder="e.g., Refund of premiums, Nominal $5,000, 100% SA"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 6: The Fine Print */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 6: The Fine Print</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Initial Waiting Period</label>
                      <input
                        type="text"
                        value={product.ci_initial_waiting_period || ''}
                        onChange={(e) => updateField('ci_initial_waiting_period', e.target.value)}
                        placeholder="e.g., 90 days from inception"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Survival Period</label>
                      <input
                        type="text"
                        value={product.ci_survival_period || ''}
                        onChange={(e) => updateField('ci_survival_period', e.target.value)}
                        placeholder="e.g., Must survive 14 days after diagnosis"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pre-Existing Conditions</label>
                      <input
                        type="text"
                        value={product.ci_pre_existing_conditions || ''}
                        onChange={(e) => updateField('ci_pre_existing_conditions', e.target.value)}
                        placeholder="e.g., Standard exclusions applied"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Age Limits on Coverage</label>
                      <input
                        type="text"
                        value={product.ci_age_limits_on_coverage || ''}
                        onChange={(e) => updateField('ci_age_limits_on_coverage', e.target.value)}
                        placeholder="e.g., Early CI to 70; Major to 99"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* LIFE PROTECTION CATEGORY-SPECIFIC FIELDS */}
            {categoryType === 'LIFE' && (
              <div className="bg-white shadow rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b">
                  LIFE PROTECTION SPECIFIC FIELDS
                </h2>

                {/* Section 1: Product Identity & Structure */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 1: Product Identity & Structure</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Core fields already shown above: Product Core Type, Coverage Term, Base Currency Options
                  </p>
                </div>

                {/* Section 2: Death Benefit & Payout Mechanics */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 2: Death Benefit & Payout Mechanics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Death Benefit Guarantee</label>
                      <input
                        type="text"
                        value={product.death_benefit_guarantee || ''}
                        onChange={(e) => updateField('death_benefit_guarantee', e.target.value)}
                        placeholder="e.g., 100% Guaranteed, Base + Non-Guaranteed Bonus"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Multipliers Available</label>
                      <input
                        type="text"
                        value={product.death_benefit_multipliers || ''}
                        onChange={(e) => updateField('death_benefit_multipliers', e.target.value)}
                        placeholder="e.g., 2x, 3x, 4x up to age 70"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payout Settlement Options</label>
                      <input
                        type="text"
                        value={product.death_benefit_payout_options || ''}
                        onChange={(e) => updateField('death_benefit_payout_options', e.target.value)}
                        placeholder="e.g., Lump sum only, or monthly installments"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Terminal Illness (TI) Benefit</label>
                      <input
                        type="text"
                        value={product.terminal_illness_benefit || ''}
                        onChange={(e) => updateField('terminal_illness_benefit', e.target.value)}
                        placeholder="e.g., 100% of Death Benefit advanced"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Total & Permanent Disability (TPD)</label>
                      <input
                        type="text"
                        value={product.total_permanent_disability || ''}
                        onChange={(e) => updateField('total_permanent_disability', e.target.value)}
                        placeholder="e.g., Built-in up to age 70, or requires rider"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Wealth Accumulation & Growth Engine */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 3: Wealth Accumulation & Growth Engine</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Growth Mechanism</label>
                      <input
                        type="text"
                        value={product.growth_mechanism || ''}
                        onChange={(e) => updateField('growth_mechanism', e.target.value)}
                        placeholder="e.g., Par Fund Bonuses, S&P 500 Indexing"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Downside Protection / Floor</label>
                      <input
                        type="text"
                        value={product.downside_protection_floor || ''}
                        onChange={(e) => updateField('downside_protection_floor', e.target.value)}
                        placeholder="e.g., 0% Index Floor, Guaranteed Cash Value"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Upside Potential / Cap</label>
                      <input
                        type="text"
                        value={product.upside_potential_cap || ''}
                        onChange={(e) => updateField('upside_potential_cap', e.target.value)}
                        placeholder="e.g., Index Cap of 9-11%"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Loyalty / Special Bonuses</label>
                      <input
                        type="text"
                        value={product.loyalty_special_bonuses || ''}
                        onChange={(e) => updateField('loyalty_special_bonuses', e.target.value)}
                        placeholder="e.g., 0.35% bonus from Year 11"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cash Value Access</label>
                      <input
                        type="text"
                        value={product.cash_value_access || ''}
                        onChange={(e) => updateField('cash_value_access', e.target.value)}
                        placeholder="e.g., Policy Loans allowed, Partial Withdrawals"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Premium & Funding Flexibility */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 4: Premium & Funding Flexibility</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Premium Structure</label>
                      <input
                        type="text"
                        value={product.premium_structure || ''}
                        onChange={(e) => updateField('premium_structure', e.target.value)}
                        placeholder="e.g., Level & Guaranteed, Flexible subject to COI"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Premium Holiday / Pause</label>
                      <input
                        type="text"
                        value={product.premium_holiday_pause || ''}
                        onChange={(e) => updateField('premium_holiday_pause', e.target.value)}
                        placeholder="e.g., Allowed after Year 2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 5: Embedded Benefits & Available Riders */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 5: Embedded Benefits & Available Riders</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Critical Illness Rider</label>
                      <input
                        type="text"
                        value={product.critical_illness_rider || ''}
                        onChange={(e) => updateField('critical_illness_rider', e.target.value)}
                        placeholder="e.g., Optional Early/Major CI rider available"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Premium Waiver Riders</label>
                      <input
                        type="text"
                        value={product.premium_waiver_riders || ''}
                        onChange={(e) => updateField('premium_waiver_riders', e.target.value)}
                        placeholder="e.g., Waives on CI or TPD of payor"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Accidental Death Benefit</label>
                      <input
                        type="text"
                        value={product.accidental_death_benefit || ''}
                        onChange={(e) => updateField('accidental_death_benefit', e.target.value)}
                        placeholder="e.g., Additional 100% of SA"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Retrenchment Benefit</label>
                      <input
                        type="text"
                        value={product.retrenchment_benefit || ''}
                        onChange={(e) => updateField('retrenchment_benefit', e.target.value)}
                        placeholder="e.g., 365 days grace period"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 6: Legacy & Estate Planning Features */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 6: Legacy & Estate Planning Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Change of Life Insured</label>
                      <input
                        type="text"
                        value={product.change_of_life_insured || ''}
                        onChange={(e) => updateField('change_of_life_insured', e.target.value)}
                        placeholder="e.g., Unlimited after Year 2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Policy Split Option</label>
                      <input
                        type="text"
                        value={product.policy_split_option || ''}
                        onChange={(e) => updateField('policy_split_option', e.target.value)}
                        placeholder="e.g., Can split for different heirs"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contingent Policy Owner</label>
                      <input
                        type="text"
                        value={product.contingent_policy_owner || ''}
                        onChange={(e) => updateField('contingent_policy_owner', e.target.value)}
                        placeholder="e.g., Can nominate successor owner"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mental Incapacity Benefit</label>
                      <input
                        type="text"
                        value={product.mental_incapacity_benefit || ''}
                        onChange={(e) => updateField('mental_incapacity_benefit', e.target.value)}
                        placeholder="e.g., Designated Benefit Recipient can claim"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Guaranteed Issuance Option (GIO)</label>
                      <input
                        type="text"
                        value={product.guaranteed_issuance_option || ''}
                        onChange={(e) => updateField('guaranteed_issuance_option', e.target.value)}
                        placeholder="e.g., Increase coverage at marriage/childbirth"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 7: The Fine Print & Exclusions */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 7: The Fine Print & Exclusions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Convertibility Option</label>
                      <input
                        type="text"
                        value={product.convertibility_option || ''}
                        onChange={(e) => updateField('convertibility_option', e.target.value)}
                        placeholder="e.g., Convert Term to Whole Life without medicals"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Suicide Exclusion</label>
                      <input
                        type="text"
                        value={product.suicide_exclusion || ''}
                        onChange={(e) => updateField('suicide_exclusion', e.target.value)}
                        placeholder="e.g., Excluded for first 12-24 months"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Medical Underwriting</label>
                      <input
                        type="text"
                        value={product.medical_underwriting || ''}
                        onChange={(e) => updateField('medical_underwriting', e.target.value)}
                        placeholder="e.g., Fully underwritten, Simplified, or Guaranteed Issue"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SAVINGS & ENDOWMENT CATEGORY-SPECIFIC FIELDS */}
            {categoryType === 'SAVINGS' && (
              <div className="bg-white shadow rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b">
                  SAVINGS & ENDOWMENT SPECIFIC FIELDS
                </h2>

                {/* Section 1: Product Identity & Structure */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 1: Product Identity & Structure</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Core fields already shown above: Product Core Type, Policy Term / Maturity, Base Currency Options
                  </p>
                </div>

                {/* Section 2: Premium Commitment & Funding */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 2: Premium Commitment & Funding</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Premium Funding Options</label>
                      <input
                        type="text"
                        value={product.savings_premium_funding_options || ''}
                        onChange={(e) => updateField('savings_premium_funding_options', e.target.value)}
                        placeholder="e.g., Cash, SRS, CPF-OA/SA"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Top-Up / Ad-Hoc Injections</label>
                      <input
                        type="text"
                        value={product.savings_top_up_injections || ''}
                        onChange={(e) => updateField('savings_top_up_injections', e.target.value)}
                        placeholder="e.g., Allowed anytime, min. $5,000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Returns Engine & Bonus Structure */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 3: Returns Engine & Bonus Structure</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Growth Mechanism</label>
                      <input
                        type="text"
                        value={product.savings_growth_mechanism || ''}
                        onChange={(e) => updateField('savings_growth_mechanism', e.target.value)}
                        placeholder="e.g., Par Fund, Fixed Rate, Index-Linked"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bonus Structure</label>
                      <input
                        type="text"
                        value={product.savings_bonus_structure || ''}
                        onChange={(e) => updateField('savings_bonus_structure', e.target.value)}
                        placeholder="e.g., Annual bonuses + terminal bonus"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cashback / Coupon Payouts</label>
                      <input
                        type="text"
                        value={product.savings_cashback_coupon_payouts || ''}
                        onChange={(e) => updateField('savings_cashback_coupon_payouts', e.target.value)}
                        placeholder="e.g., 5% annually from Year 3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cashback Reinvestment</label>
                      <input
                        type="text"
                        value={product.savings_cashback_reinvestment || ''}
                        onChange={(e) => updateField('savings_cashback_reinvestment', e.target.value)}
                        placeholder="e.g., Optional reinvestment"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Income Payout Period</label>
                      <input
                        type="text"
                        value={product.savings_income_payout_period || ''}
                        onChange={(e) => updateField('savings_income_payout_period', e.target.value)}
                        placeholder="e.g., Years 11-20, or from age 65"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Capital Guarantees & Liquidity */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 4: Capital Guarantees & Liquidity</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Capital Guarantee Status</label>
                      <input
                        type="text"
                        value={product.savings_capital_guarantee_status || ''}
                        onChange={(e) => updateField('savings_capital_guarantee_status', e.target.value)}
                        placeholder="e.g., 100% at maturity, 105% guaranteed"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Guaranteed Breakeven Target</label>
                      <input
                        type="text"
                        value={product.savings_guaranteed_breakeven_target || ''}
                        onChange={(e) => updateField('savings_guaranteed_breakeven_target', e.target.value)}
                        placeholder="e.g., Breakeven at Year 8"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Partial Withdrawals</label>
                      <input
                        type="text"
                        value={product.savings_partial_withdrawals || ''}
                        onChange={(e) => updateField('savings_partial_withdrawals', e.target.value)}
                        placeholder="e.g., Allowed from Year 3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Policy Loan Provision</label>
                      <input
                        type="text"
                        value={product.savings_policy_loan || ''}
                        onChange={(e) => updateField('savings_policy_loan', e.target.value)}
                        placeholder="e.g., Up to 80% of surrender value"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 5: Policy Flexibility & Protection */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 5: Policy Flexibility & Protection</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Premium Holiday</label>
                      <input
                        type="text"
                        value={product.savings_premium_holiday || ''}
                        onChange={(e) => updateField('savings_premium_holiday', e.target.value)}
                        placeholder="e.g., Allowed after Year 2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Retrenchment Benefit</label>
                      <input
                        type="text"
                        value={product.savings_retrenchment_benefit || ''}
                        onChange={(e) => updateField('savings_retrenchment_benefit', e.target.value)}
                        placeholder="e.g., Extended grace period if laid off"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Embedded Protection Riders</label>
                      <input
                        type="text"
                        value={product.savings_embedded_riders || ''}
                        onChange={(e) => updateField('savings_embedded_riders', e.target.value)}
                        placeholder="e.g., CI, TPD coverage included"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Accidental Death Benefit</label>
                      <input
                        type="text"
                        value={product.savings_accidental_death || ''}
                        onChange={(e) => updateField('savings_accidental_death', e.target.value)}
                        placeholder="e.g., Additional 100% payout"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 6: Legacy & Estate Planning Features */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 6: Legacy & Estate Planning Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Change of Life Insured</label>
                      <input
                        type="text"
                        value={product.savings_change_of_insured || ''}
                        onChange={(e) => updateField('savings_change_of_insured', e.target.value)}
                        placeholder="e.g., Unlimited changes after Year 2"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Policy Split Option</label>
                      <input
                        type="text"
                        value={product.savings_policy_split || ''}
                        onChange={(e) => updateField('savings_policy_split', e.target.value)}
                        placeholder="e.g., Can split for different heirs"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contingent Policy Owner</label>
                      <input
                        type="text"
                        value={product.savings_contingent_owner || ''}
                        onChange={(e) => updateField('savings_contingent_owner', e.target.value)}
                        placeholder="e.g., Can nominate successor owner"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Death Benefit Settlement</label>
                      <input
                        type="text"
                        value={product.savings_death_settlement || ''}
                        onChange={(e) => updateField('savings_death_settlement', e.target.value)}
                        placeholder="e.g., Lump sum or installments"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mental Incapacity Benefit</label>
                      <input
                        type="text"
                        value={product.savings_mental_incapacity || ''}
                        onChange={(e) => updateField('savings_mental_incapacity', e.target.value)}
                        placeholder="e.g., Designated recipient can claim"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 7: The Fine Print */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 7: The Fine Print</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Medical Underwriting</label>
                      <input
                        type="text"
                        value={product.savings_medical_underwriting || ''}
                        onChange={(e) => updateField('savings_medical_underwriting', e.target.value)}
                        placeholder="e.g., Simplified, Full, or Guaranteed Issue"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Entry Age Limits</label>
                      <input
                        type="text"
                        value={product.savings_entry_age_limits || ''}
                        onChange={(e) => updateField('savings_entry_age_limits', e.target.value)}
                        placeholder="e.g., 18-65 years old"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Surrender Penalties</label>
                      <input
                        type="text"
                        value={product.savings_surrender_penalties || ''}
                        onChange={(e) => updateField('savings_surrender_penalties', e.target.value)}
                        placeholder="e.g., Heavy penalty years 1-5, scales down to 0%"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* INVESTMENT-LINKED PLAN (ILP) CATEGORY-SPECIFIC FIELDS */}
            {categoryType === 'ILP' && (
              <div className="bg-white shadow rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b">
                  INVESTMENT-LINKED PLAN SPECIFIC FIELDS
                </h2>

                {/* Section 1: Product Identity & Structure */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 1: Product Identity & Structure</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Core fields already shown above: Product Core Type, Policy Term / Maturity, Base Currency Options
                  </p>
                </div>

                {/* Section 2: Premium Commitment & Funding */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 2: Premium Commitment & Funding</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Premium Funding Options</label>
                      <input
                        type="text"
                        value={product.ilp_premium_funding_options || ''}
                        onChange={(e) => updateField('ilp_premium_funding_options', e.target.value)}
                        placeholder="e.g., Cash, SRS, CPF-OA/SA"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Top-Up / Ad-Hoc Injections</label>
                      <input
                        type="text"
                        value={product.ilp_top_up_injections || ''}
                        onChange={(e) => updateField('ilp_top_up_injections', e.target.value)}
                        placeholder="e.g., Allowed anytime, min. SGD 5,000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: The Investment Engine */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 3: The Investment Engine</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fund Universe</label>
                      <input
                        type="text"
                        value={product.ilp_fund_universe || ''}
                        onChange={(e) => updateField('ilp_fund_universe', e.target.value)}
                        placeholder="e.g., Access to 100+ ILP sub-funds"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fund Switching Fee</label>
                      <input
                        type="text"
                        value={product.ilp_fund_switching_fee || ''}
                        onChange={(e) => updateField('ilp_fund_switching_fee', e.target.value)}
                        placeholder="e.g., Free and unlimited, or free 12 times/year"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dividend-Paying Funds</label>
                      <input
                        type="text"
                        value={product.ilp_dividend_paying_funds || ''}
                        onChange={(e) => updateField('ilp_dividend_paying_funds', e.target.value)}
                        placeholder="e.g., Yes, can choose dividend funds"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dividend Settlement Option</label>
                      <input
                        type="text"
                        value={product.ilp_dividend_settlement || ''}
                        onChange={(e) => updateField('ilp_dividend_settlement', e.target.value)}
                        placeholder="e.g., Reinvest or payout to bank"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Auto-Rebalancing Option</label>
                      <input
                        type="text"
                        value={product.ilp_auto_rebalancing || ''}
                        onChange={(e) => updateField('ilp_auto_rebalancing', e.target.value)}
                        placeholder="e.g., Free automatic rebalancing annually"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Bonus Structure */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 4: Bonus Structure</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Welcome / Initial Bonus</label>
                      <input
                        type="text"
                        value={product.ilp_welcome_initial_bonus || ''}
                        onChange={(e) => updateField('ilp_welcome_initial_bonus', e.target.value)}
                        placeholder="e.g., 10% extra units in Year 1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Loyalty Bonus</label>
                      <input
                        type="text"
                        value={product.ilp_loyalty_bonus || ''}
                        onChange={(e) => updateField('ilp_loyalty_bonus', e.target.value)}
                        placeholder="e.g., 0.5% of Account Value from Year 10"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Special / Milestone Bonus</label>
                      <input
                        type="text"
                        value={product.ilp_special_milestone_bonus || ''}
                        onChange={(e) => updateField('ilp_special_milestone_bonus', e.target.value)}
                        placeholder="e.g., 5% at Year 15"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bonus Clawback Rules</label>
                      <input
                        type="text"
                        value={product.ilp_bonus_clawback_rules || ''}
                        onChange={(e) => updateField('ilp_bonus_clawback_rules', e.target.value)}
                        placeholder="e.g., Clawed back if surrendered before Year 5"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 5: Fee Structure */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 5: Fee Structure</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Premium Charge</label>
                      <input
                        type="text"
                        value={product.ilp_premium_charge || ''}
                        onChange={(e) => updateField('ilp_premium_charge', e.target.value)}
                        placeholder="e.g., 5% deducted from each premium, or 0%"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Maintenance Fee</label>
                      <input
                        type="text"
                        value={product.ilp_account_maintenance_fee || ''}
                        onChange={(e) => updateField('ilp_account_maintenance_fee', e.target.value)}
                        placeholder="e.g., 2.5% p.a. for first 10 years"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fund Management Fee</label>
                      <input
                        type="text"
                        value={product.ilp_fund_management_fee || ''}
                        onChange={(e) => updateField('ilp_fund_management_fee', e.target.value)}
                        placeholder="e.g., 1.0% - 1.5% p.a. built into NAV"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Early Surrender Penalty</label>
                      <input
                        type="text"
                        value={product.ilp_early_surrender_penalty || ''}
                        onChange={(e) => updateField('ilp_early_surrender_penalty', e.target.value)}
                        placeholder="e.g., Heavy penalty years 1-10, scales to 0%"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 6: Policy Flexibility & Liquidity */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 6: Policy Flexibility & Liquidity</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Premium Holiday</label>
                      <input
                        type="text"
                        value={product.ilp_premium_holiday || ''}
                        onChange={(e) => updateField('ilp_premium_holiday', e.target.value)}
                        placeholder="e.g., Can pause after Year 3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Partial Withdrawals</label>
                      <input
                        type="text"
                        value={product.ilp_partial_withdrawals || ''}
                        onChange={(e) => updateField('ilp_partial_withdrawals', e.target.value)}
                        placeholder="e.g., Allowed from Year 1, may incur charges"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Account Balance</label>
                      <input
                        type="text"
                        value={product.ilp_minimum_account_balance || ''}
                        onChange={(e) => updateField('ilp_minimum_account_balance', e.target.value)}
                        placeholder="e.g., Must maintain at least SGD 10,000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 7: Protection & Legacy Features */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 7: Protection & Legacy Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Death Benefit</label>
                      <input
                        type="text"
                        value={product.death_benefit_options || ''}
                        onChange={(e) => updateField('death_benefit_options', e.target.value)}
                        placeholder="e.g., Higher of 101% Net Premiums or Account Value"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Embedded Riders</label>
                      <input
                        type="text"
                        value={product.ilp_embedded_riders || ''}
                        onChange={(e) => updateField('ilp_embedded_riders', e.target.value)}
                        placeholder="e.g., Premium Waiver on TPD or TI"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Change of Life Insured</label>
                      <input
                        type="text"
                        value={product.ilp_change_of_insured || ''}
                        onChange={(e) => updateField('ilp_change_of_insured', e.target.value)}
                        placeholder="e.g., Unlimited after 1st year"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Medical Underwriting</label>
                      <input
                        type="text"
                        value={product.ilp_medical_underwriting || ''}
                        onChange={(e) => updateField('ilp_medical_underwriting', e.target.value)}
                        placeholder="e.g., Guaranteed Issuance / No Medical Questions"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* HOSPITAL CATEGORY-SPECIFIC FIELDS */}
            {categoryType === 'HOSPITAL' && (
              <div className="bg-white shadow rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 pb-2 border-b">
                  HOSPITAL / MEDICAL INSURANCE SPECIFIC FIELDS
                </h2>

                {/* Section 1: Coverage Scope */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 1: Coverage Scope</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Geographical Coverage</label>
                      <input
                        type="text"
                        value={product.hospital_geographical_coverage || ''}
                        onChange={(e) => updateField('hospital_geographical_coverage', e.target.value)}
                        placeholder="e.g., Worldwide excluding USA, Asia-Pacific region"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Room & Board Entitlement</label>
                      <input
                        type="text"
                        value={product.hospital_room_board_entitlement || ''}
                        onChange={(e) => updateField('hospital_room_board_entitlement', e.target.value)}
                        placeholder="e.g., Private room up to SGD 500/day"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Annual Limit</label>
                      <input
                        type="text"
                        value={product.hospital_annual_limit || ''}
                        onChange={(e) => updateField('hospital_annual_limit', e.target.value)}
                        placeholder="e.g., SGD 500,000 per year"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Lifetime Limit</label>
                      <input
                        type="text"
                        value={product.hospital_lifetime_limit || ''}
                        onChange={(e) => updateField('hospital_lifetime_limit', e.target.value)}
                        placeholder="e.g., Unlimited, or SGD 2 million lifetime"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">As-Charged vs Sublimits</label>
                      <input
                        type="text"
                        value={product.hospital_as_charged_vs_sublimits || ''}
                        onChange={(e) => updateField('hospital_as_charged_vs_sublimits', e.target.value)}
                        placeholder="e.g., As-charged for hospitalization, sublimits for outpatient"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Cost Sharing */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 2: Cost Sharing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Deductible</label>
                      <input
                        type="text"
                        value={product.hospital_deductible || ''}
                        onChange={(e) => updateField('hospital_deductible', e.target.value)}
                        placeholder="e.g., SGD 5,000 per claim"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Coinsurance / Co-pay</label>
                      <input
                        type="text"
                        value={product.hospital_coinsurance_copay || ''}
                        onChange={(e) => updateField('hospital_coinsurance_copay', e.target.value)}
                        placeholder="e.g., 10% coinsurance after deductible"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Out-of-Pocket Maximum</label>
                      <input
                        type="text"
                        value={product.hospital_oop_maximum || ''}
                        onChange={(e) => updateField('hospital_oop_maximum', e.target.value)}
                        placeholder="e.g., SGD 10,000 per year"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Coverage Extensions */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 3: Coverage Extensions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pre-Hospitalization Coverage</label>
                      <input
                        type="text"
                        value={product.hospital_pre_hospitalization_coverage || ''}
                        onChange={(e) => updateField('hospital_pre_hospitalization_coverage', e.target.value)}
                        placeholder="e.g., 60 days before admission"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Post-Hospitalization Coverage</label>
                      <input
                        type="text"
                        value={product.hospital_post_hospitalization_coverage || ''}
                        onChange={(e) => updateField('hospital_post_hospitalization_coverage', e.target.value)}
                        placeholder="e.g., 90 days after discharge"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Outpatient Cancer / Dialysis</label>
                      <input
                        type="text"
                        value={product.hospital_outpatient_cancer_dialysis || ''}
                        onChange={(e) => updateField('hospital_outpatient_cancer_dialysis', e.target.value)}
                        placeholder="e.g., Covered up to annual limit"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Maternity / Dental Options</label>
                      <input
                        type="text"
                        value={product.hospital_maternity_dental_options || ''}
                        onChange={(e) => updateField('hospital_maternity_dental_options', e.target.value)}
                        placeholder="e.g., Maternity optional rider, basic dental included"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 4: Service Features */}
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-800 mb-4">Section 4: Service Features</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Direct Billing / Cashless</label>
                      <input
                        type="text"
                        value={product.hospital_direct_billing_cashless || ''}
                        onChange={(e) => updateField('hospital_direct_billing_cashless', e.target.value)}
                        placeholder="e.g., Available at 500+ panel hospitals"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Guaranteed Renewability</label>
                      <input
                        type="text"
                        value={product.hospital_guaranteed_renewability || ''}
                        onChange={(e) => updateField('hospital_guaranteed_renewability', e.target.value)}
                        placeholder="e.g., Guaranteed renewable up to age 99"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pre-Existing Conditions</label>
                      <input
                        type="text"
                        value={product.hospital_pre_existing_conditions || ''}
                        onChange={(e) => updateField('hospital_pre_existing_conditions', e.target.value)}
                        placeholder="e.g., Covered after 3 years"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Emergency Evacuation</label>
                      <input
                        type="text"
                        value={product.hospital_emergency_evacuation || ''}
                        onChange={(e) => updateField('hospital_emergency_evacuation', e.target.value)}
                        placeholder="e.g., Covered up to USD 100,000"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Second Opinion / Concierge</label>
                      <input
                        type="text"
                        value={product.hospital_second_opinion_concierge || ''}
                        onChange={(e) => updateField('hospital_second_opinion_concierge', e.target.value)}
                        placeholder="e.g., Medical concierge service included"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Save Button */}
            <div className="flex justify-end mt-6">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
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
