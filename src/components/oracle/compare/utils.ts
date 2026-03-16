/**
 * Utility functions for product comparison page
 * Handles category detection, field relevance, and formatting
 */

import { InsuranceProduct } from '@/types/oracle/insurance-product';

export type ProductCategory =
  | 'critical illness'
  | 'whole life'
  | 'term life insurance'
  | 'universal life'
  | 'savings plan'
  | 'endowment'
  | 'investment-linked';

export type CategoryGroup = 'critical-illness' | 'life-protection' | 'savings' | 'ilp';

/**
 * Map product category to category group
 */
export function getCategoryGroup(category: string | undefined | null): CategoryGroup | null {
  if (!category) return null;

  const normalized = category.toLowerCase().trim();

  if (normalized === 'critical illness') {
    return 'critical-illness';
  }

  if (normalized === 'whole life' || normalized === 'term life insurance' || normalized === 'universal life') {
    return 'life-protection';
  }

  if (normalized === 'savings plan' || normalized === 'endowment') {
    return 'savings';
  }

  if (normalized === 'investment-linked' || normalized === 'ilp') {
    return 'ilp';
  }

  return null;
}

/**
 * Get color scheme for category badge
 */
export function getCategoryBadgeColor(category: string | undefined | null): string {
  const group = getCategoryGroup(category);

  switch (group) {
    case 'critical-illness':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'life-protection':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'savings':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'ilp':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Format value for display (returns string)
 * Used in places where JSX components cannot be used
 */
export function formatValue(value: any): string {
  if (value === null || value === undefined || value === '') {
    return 'N/A';
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : 'N/A';
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  return String(value);
}

/**
 * Check if a field is applicable for a given category
 */
export function isFieldApplicable(fieldName: string, category: string | undefined | null): boolean {
  const group = getCategoryGroup(category);

  // Universal fields (always applicable)
  const universalFields = [
    'product_core_type',
    'coverage_term',
    'base_currency_options',
    'policy_term_maturity',
    'premium_structure'
  ];

  if (universalFields.includes(fieldName)) {
    return true;
  }

  // Critical Illness fields
  if (fieldName.startsWith('ci_')) {
    return group === 'critical-illness';
  }

  // Life Protection fields
  const lifeFields = [
    'death_benefit_guarantee', 'death_benefit_multipliers', 'death_benefit_payout_options',
    'terminal_illness_benefit', 'total_permanent_disability', 'growth_mechanism',
    'downside_protection_floor', 'upside_potential_cap', 'loyalty_special_bonuses',
    'cash_value_access', 'premium_holiday_pause', 'critical_illness_rider',
    'premium_waiver_riders', 'accidental_death_benefit', 'retrenchment_benefit',
    'change_of_life_insured', 'policy_split_option', 'contingent_policy_owner',
    'mental_incapacity_benefit', 'guaranteed_issuance_option', 'convertibility_option',
    'suicide_exclusion', 'medical_underwriting'
  ];

  if (lifeFields.includes(fieldName)) {
    return group === 'life-protection';
  }

  // Savings fields
  if (fieldName.startsWith('savings_')) {
    return group === 'savings';
  }

  // ILP fields
  if (fieldName.startsWith('ilp_')) {
    return group === 'ilp';
  }

  return false;
}

/**
 * Detect comparison scenario based on products
 */
export function detectComparisonScenario(products: InsuranceProduct[]): {
  scenario: 'same-category' | 'same-group' | 'cross-group';
  primaryGroup: CategoryGroup | null;
  groups: Set<CategoryGroup>;
} {
  if (products.length === 0) {
    return { scenario: 'cross-group', primaryGroup: null, groups: new Set() };
  }

  const categories = products.map(p => p.category?.toLowerCase().trim());
  const groups = new Set(products.map(p => getCategoryGroup(p.category)).filter((g): g is CategoryGroup => g !== null));

  // Same category (exact match)
  if (new Set(categories).size === 1) {
    return {
      scenario: 'same-category',
      primaryGroup: getCategoryGroup(products[0].category),
      groups
    };
  }

  // Same group (different categories but same group)
  if (groups.size === 1) {
    return {
      scenario: 'same-group',
      primaryGroup: Array.from(groups)[0],
      groups
    };
  }

  // Cross-group (different groups)
  return {
    scenario: 'cross-group',
    primaryGroup: Array.from(groups)[0] || null,
    groups
  };
}

/**
 * Determine which category-specific fields to show based on products
 */
export function getRelevantFieldsByCategory(products: InsuranceProduct[]): {
  showCI: boolean;
  showLife: boolean;
  showSavings: boolean;
  showILP: boolean;
} {
  const groups = products.map(p => getCategoryGroup(p.category)).filter((g): g is CategoryGroup => g !== null);
  const groupSet = new Set(groups);

  return {
    showCI: groupSet.has('critical-illness'),
    showLife: groupSet.has('life-protection'),
    showSavings: groupSet.has('savings'),
    showILP: groupSet.has('ilp')
  };
}

/**
 * Format field name for display (convert snake_case to Title Case)
 */
export function formatFieldName(fieldName: string): string {
  return fieldName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
    .replace(/^Ci /, 'CI ')
    .replace(/^Ilp /, 'ILP ')
    .replace(/Snp/, 'S&P')
    .replace(/Tpd/, 'TPD');
}

/**
 * Check if a table has any data across all products
 * Returns true if at least one product has at least one non-null/non-empty field
 * Used for PDF generation to skip completely empty sub-tables
 */
export function hasTableData(
  products: InsuranceProduct[],
  fields: { key: string; label: string }[]
): boolean {
  return products.some(product =>
    fields.some(field => {
      const value = product[field.key as keyof InsuranceProduct];
      // Check if value is not null, undefined, empty string, or empty array
      if (value === null || value === undefined || value === '') {
        return false;
      }
      if (Array.isArray(value) && value.length === 0) {
        return false;
      }
      return true;
    })
  );
}
