/**
 * Category-Specific Table Component
 * Displays category-relevant fields based on product type
 * Updated to match client PDF examples (2026-04-17)
 *
 * Categories (based on client PDF examples):
 * - Critical Illness: 13 fields in 3 categories (CI comparison Result.pdf)
 *   • What am I covered for — and for how long?
 *   • What do I get back financially? (empty - placeholder for ci_premium_refund)
 *   • How flexible is this?
 *
 * - Life Protection: 14 fields in 3 categories (Protection comparison.pdf)
 *   • ① coverage & protection — what is covered and for how long
 *   • ② cash value & growth — what you get back
 *   • ③ flexibility — what can change during the policy
 *
 * - Savings & Wealth: 16 fields in 3 categories (savings_comparison_v2.html)
 *   • ① arrive — what do I actually walk away with?
 *   • ② wait — what if something goes wrong along the way?
 *   • ③ commit — what am I agreeing to pay, and for how long?
 *
 * - Hospital: Kept original structure (not yet finalized)
 * - ILP: Kept original structure (not yet finalized)
 */

import { InsuranceProduct } from '@/types/oracle/insurance-product';
import { formatFieldName, isFieldApplicable, getCategoryGroup, getCategoryBadgeColor, hasTableData } from './utils';
import FormattedValue from './FormattedValue';

interface CategorySpecificTableProps {
  products: InsuranceProduct[];
  forPDF?: boolean; // If true, skip tables with all N/A values
}

export default function CategorySpecificTable({ products, forPDF = false }: CategorySpecificTableProps) {
  if (products.length === 0) return null;

  // Determine which tables to show based on product categories
  const categories = products.map(p => getCategoryGroup(p.category));
  const uniqueCategories = Array.from(new Set(categories));

  // Universal Product Structure fields (shown in all category tables)
  const universalFields = [
    { key: 'product_core_type', label: 'Product Core Type' },
    { key: 'coverage_term', label: 'Coverage Term' },
    { key: 'base_currency_options', label: 'Base Currency Options' },
    { key: 'policy_term_maturity', label: 'Policy Term / Maturity' },
    { key: 'premium_structure', label: 'Premium Structure' },
  ];

  // ============================================================================
  // CRITICAL ILLNESS - 3 Categories (13 fields total)
  // Based on final-columns.md
  // ============================================================================

  // Category 1: What am I covered for — and for how long? (8 fields)
  const ciCoveredForHowLong = [
    { key: 'ci_total_conditions_covered', label: 'Conditions Covered' },
    { key: 'ci_early_minor_stage', label: 'Early-stage CI' },
    { key: 'ci_major_advanced_stage', label: 'Major/Advanced Stage' },
    { key: 'ci_max_claims_allowed', label: 'Multi-claim Allowed' },
    { key: 'ci_waiting_period_between_claims', label: 'Waiting Period (Between Claims)' },
    { key: 'ci_initial_waiting_period', label: 'Initial Waiting Period' },
    { key: 'ci_survival_period', label: 'Survival Period' },
    { key: 'ci_age_limits_on_coverage', label: 'Age Limits on Coverage' },
  ];

  // Category 2: What do I get back financially? (0 fields currently)
  // Note: ci_premium_refund will be added here in future update
  const ciFinancialReturns: { key: string; label: string }[] = [
    // Empty for now - placeholder for future ci_premium_refund field
  ];

  // Category 3: How flexible is this? (5 fields)
  const ciFlexibility = [
    { key: 'ci_waiver_triggers', label: 'Premium Waiver' },
    { key: 'ci_juvenile_special_needs', label: 'Juvenile / Prenatal Cover' },
    { key: 'ci_icu_benefit', label: 'ICU Benefit' },
    { key: 'ci_angioplasty_benefit', label: 'Angioplasty Benefit' },
    { key: 'ci_benign_tumor_benefit', label: 'Benign Tumor Benefit' },
  ];

  // ============================================================================
  // LIFE PROTECTION - 3 Categories (14 fields total)
  // Based on final-columns.md
  // ============================================================================

  // Category 1: Coverage & Protection — What is Covered and For How Long (7 fields)
  const lifeCoverageProtection = [
    { key: 'death_benefit_guarantee', label: 'Death Benefit' },
    { key: 'death_benefit_multipliers', label: 'Death Benefit Multiplier' },
    { key: 'death_benefit_payout_options', label: 'Payout on Death' },
    { key: 'terminal_illness_benefit', label: 'Terminal Illness Advance' },
    { key: 'total_permanent_disability', label: 'Total Permanent Disability' },
    { key: 'accidental_death_benefit', label: 'Accidental Death' },
    { key: 'critical_illness_rider', label: 'Critical Illness' },
  ];

  // Category 2: Cash Value & Growth — What You Get Back (4 fields)
  const lifeCashValueGrowth = [
    { key: 'growth_mechanism', label: 'Growth Engine / Index' },
    { key: 'downside_protection_floor', label: 'Downside Floor' },
    { key: 'upside_potential_cap', label: 'Upside / Ceiling' },
    { key: 'cash_value_access', label: 'Cash Access / Policy Loan' },
  ];

  // Category 3: Flexibility — What Can Change During the Policy (3 fields)
  const lifeFlexibility = [
    { key: 'premium_waiver_riders', label: 'Premium Waiver' },
    { key: 'convertibility_option', label: 'Can Upgrade to Permanent Cover Later?' },
    { key: 'medical_underwriting', label: 'Medical Underwriting' },
  ];

  // ============================================================================
  // SAVINGS & WEALTH - 3 Categories (16 fields total)
  // Based on savings_comparison_v2.html structure
  // Category headings: ① arrive / ② wait / ③ commit
  // ============================================================================

  // Category 1: ① arrive — what do I actually walk away with? (5 fields)
  const savingsArrive = [
    { key: 'savings_growth_mechanism', label: 'Growth engine' },
    { key: 'savings_capital_guarantee_status', label: 'Guaranteed return' },
    { key: 'savings_bonus_structure', label: 'Illustrated upside' },
    { key: 'savings_income_payout_period', label: 'Income option' },
    { key: 'policy_term_maturity', label: 'Policy horizon' },
  ];

  // Category 2: ② wait — what if something goes wrong along the way? (8 fields)
  const savingsWait = [
    { key: 'savings_death_settlement', label: 'Death benefit' },
    { key: 'savings_change_of_insured', label: 'Change of life insured' },
    { key: 'savings_policy_split', label: 'Policy split option' },
    { key: 'savings_partial_withdrawals', label: 'Partial withdrawal' },
    { key: 'savings_premium_holiday', label: 'Premium holiday' },
    { key: 'savings_accidental_death', label: 'Accidental death benefit' },
    { key: 'savings_policy_loan', label: 'Policy loan' },
    { key: 'savings_guaranteed_breakeven_target', label: 'Guaranteed breakeven target' },
  ];

  // Category 3: ③ commit — what am I agreeing to pay, and for how long? (3 fields)
  const savingsCommit = [
    { key: 'savings_premium_funding_options', label: 'Premium payment term' },
    { key: 'savings_top_up_injections', label: 'Top-up / ad-hoc injection' },
    { key: 'savings_entry_age_limits', label: 'Entry age limits' },
    { key: 'base_currency_options', label: 'Currency options' },
    { key: 'savings_medical_underwriting', label: 'Medical underwriting' },
  ];

  // ============================================================================
  // ILP - Keep original structure (not yet finalized)
  // ============================================================================

  const ilpPremiumFunding = [
    { key: 'ilp_top_up_injections', label: 'Top-Up / Ad-Hoc Injections' },
    { key: 'ilp_premium_funding_options', label: 'Premium Funding Options' },
  ];

  const ilpInvestmentEngine = [
    { key: 'ilp_fund_universe', label: 'Fund Universe' },
    { key: 'ilp_fund_switching_fee', label: 'Fund Switching Fee' },
    { key: 'ilp_dividend_paying_funds', label: 'Dividend-Paying Funds' },
    { key: 'ilp_dividend_settlement', label: 'Dividend Settlement Option' },
    { key: 'ilp_auto_rebalancing', label: 'Auto-Rebalancing Option' },
  ];

  const ilpBonusStructure = [
    { key: 'ilp_welcome_initial_bonus', label: 'Welcome / Initial Bonus' },
    { key: 'ilp_loyalty_bonus', label: 'Loyalty Bonus' },
    { key: 'ilp_special_milestone_bonus', label: 'Special / Milestone Bonus' },
    { key: 'ilp_bonus_clawback_rules', label: 'Bonus Clawback Rules' },
  ];

  const ilpFeeStructure = [
    { key: 'ilp_premium_charge', label: 'Premium Charge' },
    { key: 'ilp_account_maintenance_fee', label: 'Account Maintenance Fee' },
    { key: 'ilp_fund_management_fee', label: 'Fund Management Fee' },
    { key: 'ilp_early_surrender_penalty', label: 'Early Surrender Penalty' },
  ];

  const ilpFlexibility = [
    { key: 'ilp_premium_holiday', label: 'Premium Holiday' },
    { key: 'ilp_partial_withdrawals', label: 'Partial Withdrawals' },
    { key: 'ilp_minimum_account_balance', label: 'Minimum Account Balance' },
  ];

  const ilpProtectionLegacy = [
    { key: 'ilp_embedded_riders', label: 'Embedded Riders' },
    { key: 'ilp_change_of_insured', label: 'Change of Life Insured' },
    { key: 'ilp_medical_underwriting', label: 'Medical Underwriting' },
  ];

  const renderTable = (title: string, fields: {key: string, label: string}[], bgColor: string) => {
    // Skip rendering if fields array is empty
    if (fields.length === 0) {
      return null;
    }

    // For PDF generation, skip tables where all products have N/A for all fields
    if (forPDF && !hasTableData(products, fields)) {
      return null;
    }

    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 overflow-hidden">
        <div className={`${bgColor} px-6 py-4`}>
          <h3 className="text-xl font-semibold text-white">{title}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-900 sticky left-0 bg-gray-50 min-w-48">
                  Field
                </th>
                {products.map(product => (
                  <th key={product.insurance_id} className="px-6 py-4 text-left text-sm font-medium text-gray-900 min-w-48">
                    <div className="break-words max-w-48">
                      {product.insurance_name}
                    </div>
                    {product.category && (
                      <div className="mt-2">
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded border ${getCategoryBadgeColor(product.category)}`}>
                          {product.category}
                        </span>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fields.map((field, index) => (
                <tr key={field.key} className={index % 2 === 0 ? '' : 'bg-gray-50'}>
                  <td className={`px-6 py-4 text-sm font-medium text-gray-900 sticky left-0 border-r ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    {field.label}
                  </td>
                  {products.map(product => {
                    const value = product[field.key as keyof InsuranceProduct];
                    const applicable = isFieldApplicable(field.key, product.category);

                    return (
                      <td key={product.insurance_id} className="px-6 py-4 text-sm">
                        {applicable ? (
                          <FormattedValue value={value} />
                        ) : (
                          <span className="text-gray-400 italic">Not applicable</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Universal Product Structure (shown for all categories) */}
      {renderTable('Product Structure', universalFields, 'bg-gradient-to-r from-indigo-500 to-indigo-600')}

      {/* ========================================================================
          CRITICAL ILLNESS - 3 Categories (13 fields)
          Based on CI comparison Result.pdf
      ========================================================================= */}
      {uniqueCategories.includes('critical-illness') && (
        <>
          {renderTable(
            'What am I covered for — and for how long?',
            ciCoveredForHowLong,
            'bg-gradient-to-r from-red-500 to-red-600'
          )}
          {/* Note: "What do I get back financially?" category is empty for now (will add ci_premium_refund later) */}
          {renderTable(
            'How flexible is this?',
            ciFlexibility,
            'bg-gradient-to-r from-red-500 to-red-600'
          )}
        </>
      )}

      {/* ========================================================================
          LIFE PROTECTION - 3 Categories (14 fields)
          Based on Protection comparison.pdf
      ========================================================================= */}
      {uniqueCategories.includes('life-protection') && (
        <>
          {renderTable(
            '① coverage & protection — what is covered and for how long',
            lifeCoverageProtection,
            'bg-gradient-to-r from-blue-500 to-blue-600'
          )}
          {renderTable(
            '② cash value & growth — what you get back',
            lifeCashValueGrowth,
            'bg-gradient-to-r from-blue-500 to-blue-600'
          )}
          {renderTable(
            '③ flexibility — what can change during the policy',
            lifeFlexibility,
            'bg-gradient-to-r from-blue-500 to-blue-600'
          )}
        </>
      )}

      {/* ========================================================================
          SAVINGS & WEALTH - 3 Categories
          Based on savings_comparison_v2.html: arrive / wait / commit
      ========================================================================= */}
      {uniqueCategories.includes('savings') && (
        <>
          {renderTable(
            '① arrive — what do I actually walk away with?',
            savingsArrive,
            'bg-gradient-to-r from-green-500 to-green-600'
          )}
          {renderTable(
            '② wait — what if something goes wrong along the way?',
            savingsWait,
            'bg-gradient-to-r from-green-500 to-green-600'
          )}
          {renderTable(
            '③ commit — what am I agreeing to pay, and for how long?',
            savingsCommit,
            'bg-gradient-to-r from-green-500 to-green-600'
          )}
        </>
      )}

      {/* ========================================================================
          ILP - Keep original structure (not yet finalized)
      ========================================================================= */}
      {uniqueCategories.includes('ilp') && (
        <>
          {renderTable(
            'Premium Commitment & Funding',
            ilpPremiumFunding,
            'bg-gradient-to-r from-purple-500 to-purple-600'
          )}
          {renderTable(
            'The Investment Engine (Fund Access & Control)',
            ilpInvestmentEngine,
            'bg-gradient-to-r from-purple-500 to-purple-600'
          )}
          {renderTable(
            'Bonus Structure (The "Carrots")',
            ilpBonusStructure,
            'bg-gradient-to-r from-purple-500 to-purple-600'
          )}
          {renderTable(
            'Fee Structure (The "Sticks")',
            ilpFeeStructure,
            'bg-gradient-to-r from-purple-500 to-purple-600'
          )}
          {renderTable(
            'Policy Flexibility & Liquidity',
            ilpFlexibility,
            'bg-gradient-to-r from-purple-500 to-purple-600'
          )}
          {renderTable(
            'Protection & Legacy Features',
            ilpProtectionLegacy,
            'bg-gradient-to-r from-purple-500 to-purple-600'
          )}
        </>
      )}
    </div>
  );
}
