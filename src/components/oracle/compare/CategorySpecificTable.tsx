/**
 * Category-Specific Table Component
 * Displays category-relevant fields based on product type
 * Supports: Critical Illness, Life Protection, Savings, and ILP products
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

  // Critical Illness specific fields - organized into separate tables
  const ciCoverageScope = [
    { key: 'ci_total_conditions_covered', label: 'Total Conditions Covered' },
    { key: 'ci_early_minor_stage', label: 'Early/Minor Stage CIs' },
    { key: 'ci_intermediate_stage', label: 'Intermediate Stage CIs' },
    { key: 'ci_major_advanced_stage', label: 'Major/Advanced Stage CIs' },
    { key: 'ci_max_claims_allowed', label: 'Max Claims Allowed' },
  ];

  const ciMultiPayRules = [
    { key: 'ci_waiting_period_between_claims', label: 'Waiting Period (Between)' },
    { key: 'ci_relapse_recurrent_rule', label: 'Relapse/Recurrent Rule' },
    { key: 'ci_grouping_pot_rules', label: 'Grouping/Pot Rules' },
  ];

  const ciPremiumWaivers = [
    { key: 'ci_waiver_triggers', label: 'Waiver Triggers' },
    { key: 'ci_waiver_duration', label: 'Waiver Duration' },
  ];

  const ciSpecialBenefits = [
    { key: 'ci_icu_benefit', label: 'ICU Benefit' },
    { key: 'ci_juvenile_special_needs', label: 'Juvenile / Special Needs' },
    { key: 'ci_angioplasty_benefit', label: 'Angioplasty Benefit' },
    { key: 'ci_benign_tumor_benefit', label: 'Benign Tumor Benefit' },
  ];

  const ciFinePrint = [
    { key: 'ci_initial_waiting_period', label: 'Initial Waiting Period' },
    { key: 'ci_survival_period', label: 'Survival Period' },
    { key: 'ci_pre_existing_conditions', label: 'Pre-Existing Conditions' },
    { key: 'ci_age_limits_on_coverage', label: 'Age Limits on Coverage' },
  ];

  // Life Protection specific fields - organized into separate tables
  const lifeDeathBenefit = [
    { key: 'death_benefit_guarantee', label: 'Death Benefit Guarantee' },
    { key: 'death_benefit_multipliers', label: 'Multipliers Available' },
    { key: 'death_benefit_payout_options', label: 'Payout Settlement Options' },
    { key: 'terminal_illness_benefit', label: 'Terminal Illness (TI)' },
    { key: 'total_permanent_disability', label: 'Total & Perm. Disab. (TPD)' },
  ];

  const lifeWealthAccumulation = [
    { key: 'growth_mechanism', label: 'Growth Mechanism' },
    { key: 'downside_protection_floor', label: 'Downside Protection / Floor' },
    { key: 'upside_potential_cap', label: 'Upside Potential / Cap' },
    { key: 'loyalty_special_bonuses', label: 'Loyalty / Special Bonuses' },
    { key: 'cash_value_access', label: 'Cash Value Access' },
  ];

  const lifePremiumFunding = [
    { key: 'premium_holiday_pause', label: 'Premium Holiday / Pause' },
  ];

  const lifeRiders = [
    { key: 'critical_illness_rider', label: 'Critical Illness Rider' },
    { key: 'premium_waiver_riders', label: 'Premium Waiver Riders' },
    { key: 'accidental_death_benefit', label: 'Accidental Death Benefit' },
    { key: 'retrenchment_benefit', label: 'Retrenchment Benefit' },
  ];

  const lifeLegacyPlanning = [
    { key: 'change_of_life_insured', label: 'Change of Life Insured' },
    { key: 'policy_split_option', label: 'Policy Split Option' },
    { key: 'contingent_policy_owner', label: 'Contingent Policy Owner' },
    { key: 'mental_incapacity_benefit', label: 'Mental Incapacity Benefit' },
    { key: 'guaranteed_issuance_option', label: 'Guaranteed Issuance (GIO)' },
  ];

  const lifeFinePrint = [
    { key: 'convertibility_option', label: 'Convertibility Option' },
    { key: 'suicide_exclusion', label: 'Suicide Exclusion' },
    { key: 'medical_underwriting', label: 'Medical Underwriting' },
  ];

  // Savings specific fields - organized into separate tables
  const savingsPremiumFunding = [
    { key: 'savings_premium_funding_options', label: 'Premium Funding Options' },
    { key: 'savings_top_up_injections', label: 'Top-Up / Ad-Hoc Injections' },
  ];

  const savingsReturnsEngine = [
    { key: 'savings_growth_mechanism', label: 'Growth Mechanism' },
    { key: 'savings_bonus_structure', label: 'Bonus Structure' },
    { key: 'savings_cashback_coupon_payouts', label: 'Cashback / Coupon Payouts' },
    { key: 'savings_cashback_reinvestment', label: 'Cashback Reinvestment' },
    { key: 'savings_income_payout_period', label: 'Income Payout Period' },
  ];

  const savingsCapitalGuarantees = [
    { key: 'savings_capital_guarantee_status', label: 'Capital Guarantee Status' },
    { key: 'savings_guaranteed_breakeven_target', label: 'Guaranteed Breakeven Target' },
    { key: 'savings_partial_withdrawals', label: 'Partial Withdrawals' },
    { key: 'savings_policy_loan', label: 'Policy Loan Provision' },
  ];

  const savingsPolicyFlexibility = [
    { key: 'savings_premium_holiday', label: 'Premium Holiday' },
    { key: 'savings_retrenchment_benefit', label: 'Retrenchment Benefit' },
    { key: 'savings_embedded_riders', label: 'Embedded Protection Riders' },
    { key: 'savings_accidental_death', label: 'Accidental Death Benefit' },
  ];

  const savingsLegacyPlanning = [
    { key: 'savings_change_of_insured', label: 'Change of Life Insured' },
    { key: 'savings_policy_split', label: 'Policy Split Option' },
    { key: 'savings_contingent_owner', label: 'Contingent Policy Owner' },
    { key: 'savings_death_settlement', label: 'Death Benefit Settlement' },
    { key: 'savings_mental_incapacity', label: 'Mental Incapacity Benefit' },
  ];

  const savingsFinePrint = [
    { key: 'savings_medical_underwriting', label: 'Medical Underwriting' },
    { key: 'savings_entry_age_limits', label: 'Entry Age Limits' },
    { key: 'savings_surrender_penalties', label: 'Surrender Penalties' },
  ];

  // ILP specific fields - organized into separate tables
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

      {/* Critical Illness - Multiple tables matching template structure */}
      {uniqueCategories.includes('critical-illness') && (
        <>
          {renderTable(
            'CI Coverage Scope (The Numbers)',
            ciCoverageScope,
            'bg-gradient-to-r from-red-500 to-red-600'
          )}
          {renderTable(
            'Multi-Pay & Claim Rules',
            ciMultiPayRules,
            'bg-gradient-to-r from-red-500 to-red-600'
          )}
          {renderTable(
            'Built-In Premium Waivers',
            ciPremiumWaivers,
            'bg-gradient-to-r from-red-500 to-red-600'
          )}
          {renderTable(
            'Special / Additional Benefits',
            ciSpecialBenefits,
            'bg-gradient-to-r from-red-500 to-red-600'
          )}
          {renderTable(
            'The Fine Print',
            ciFinePrint,
            'bg-gradient-to-r from-red-500 to-red-600'
          )}
        </>
      )}

      {/* Life Protection - Multiple tables matching template structure */}
      {uniqueCategories.includes('life-protection') && (
        <>
          {renderTable(
            'Death Benefit & Payout Mechanics',
            lifeDeathBenefit,
            'bg-gradient-to-r from-blue-500 to-blue-600'
          )}
          {renderTable(
            'Wealth Accumulation & Growth Engine',
            lifeWealthAccumulation,
            'bg-gradient-to-r from-blue-500 to-blue-600'
          )}
          {renderTable(
            'Premium & Funding Flexibility',
            lifePremiumFunding,
            'bg-gradient-to-r from-blue-500 to-blue-600'
          )}
          {renderTable(
            'Embedded Benefits & Available Riders',
            lifeRiders,
            'bg-gradient-to-r from-blue-500 to-blue-600'
          )}
          {renderTable(
            'Legacy & Estate Planning Features',
            lifeLegacyPlanning,
            'bg-gradient-to-r from-blue-500 to-blue-600'
          )}
          {renderTable(
            'The Fine Print & Exclusions',
            lifeFinePrint,
            'bg-gradient-to-r from-blue-500 to-blue-600'
          )}
        </>
      )}

      {/* Savings - Multiple tables matching template structure */}
      {uniqueCategories.includes('savings') && (
        <>
          {renderTable(
            'Premium Commitment & Funding',
            savingsPremiumFunding,
            'bg-gradient-to-r from-green-500 to-green-600'
          )}
          {renderTable(
            'Returns Engine & Bonus Structure',
            savingsReturnsEngine,
            'bg-gradient-to-r from-green-500 to-green-600'
          )}
          {renderTable(
            'Capital Guarantees & Liquidity',
            savingsCapitalGuarantees,
            'bg-gradient-to-r from-green-500 to-green-600'
          )}
          {renderTable(
            'Policy Flexibility & Protection',
            savingsPolicyFlexibility,
            'bg-gradient-to-r from-green-500 to-green-600'
          )}
          {renderTable(
            'Legacy & Estate Planning Features',
            savingsLegacyPlanning,
            'bg-gradient-to-r from-green-500 to-green-600'
          )}
          {renderTable(
            'The Fine Print',
            savingsFinePrint,
            'bg-gradient-to-r from-green-500 to-green-600'
          )}
        </>
      )}

      {/* ILP - Multiple tables matching template structure */}
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
