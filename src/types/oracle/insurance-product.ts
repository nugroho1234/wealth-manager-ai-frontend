/**
 * Insurance Product Type Definitions
 * Phase 7: Frontend Type Definitions for 113-Field Schema
 *
 * Updated: 2026-03-15
 * Total Fields: 113 (23 core + 5 universal + 18 CI + 23 Life + 23 Savings + 21 ILP)
 */

// ===== CORE PRODUCT INTERFACE (23 FIELDS) =====
export interface InsuranceProduct {
  // System fields
  insurance_id: string;
  created_at?: string;
  updated_at?: string;
  company_id?: string;
  processing_status?: string;
  uploaded_by?: string;

  // ===== 23 CORE PRODUCT FIELDS =====
  insurance_name: string;
  provider: string;
  provider_country?: string;
  jurisdiction?: string;
  category: string;
  key_features?: string;
  key_features_bullets?: string;
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
  death_benefit_options?: string;
  market_positioning?: string;

  // ===== 5 UNIVERSAL PRODUCT STRUCTURE FIELDS =====
  product_core_type?: string;
  coverage_term?: string;
  base_currency_options?: string[];
  policy_term_maturity?: string;
  premium_structure?: string;

  // ===== 18 CRITICAL ILLNESS (CI) SPECIFIC FIELDS =====
  ci_total_conditions_covered?: number;
  ci_early_minor_stage?: string;
  ci_intermediate_stage?: string;
  ci_major_advanced_stage?: string;
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

  // ===== 23 LIFE PROTECTION SPECIFIC FIELDS =====
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

  // ===== 23 SAVINGS SPECIFIC FIELDS =====
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

  // ===== 21 ILP (INVESTMENT-LINKED PRODUCT) SPECIFIC FIELDS =====
  ilp_top_up_injections?: string;
  ilp_premium_funding_options?: string;
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
  ilp_embedded_riders?: string;
  ilp_change_of_insured?: string;
  ilp_medical_underwriting?: string;

  // ===== ADVISOR'S VERDICT (3 FIELDS) =====
  key_strengths?: string;
  key_weaknesses?: string;
  best_for?: string;

  // ===== ADDITIONAL FIELDS =====
  pdf_url?: string;
  markdown_url?: string;
  vector_id?: string;
  document_summary?: string;
  snp_rating?: string;
}

// ===== PRODUCT CATEGORY TYPE =====
export type ProductCategory =
  | "critical illness"
  | "whole life"
  | "term life insurance"
  | "universal life"
  | "savings plan"
  | "endowment"
  | "investment-linked";

// ===== CATEGORY-SPECIFIC FIELD GROUPS =====
export interface CriticalIllnessFields {
  ci_total_conditions_covered?: number;
  ci_early_minor_stage?: string;
  ci_intermediate_stage?: string;
  ci_major_advanced_stage?: string;
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
}

export interface LifeProtectionFields {
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
}

export interface SavingsFields {
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
}

export interface ILPFields {
  ilp_top_up_injections?: string;
  ilp_premium_funding_options?: string;
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
  ilp_embedded_riders?: string;
  ilp_change_of_insured?: string;
  ilp_medical_underwriting?: string;
}

// ===== UTILITY FUNCTIONS =====

/**
 * Helper to determine which category-specific fields are relevant for a product
 */
export function getRelevantFieldsByCategory(
  category: ProductCategory
): {
  showCI: boolean;
  showLife: boolean;
  showSavings: boolean;
  showILP: boolean;
} {
  switch (category) {
    case "critical illness":
      return { showCI: true, showLife: false, showSavings: false, showILP: false };

    case "whole life":
    case "term life insurance":
    case "universal life":
      return { showCI: false, showLife: true, showSavings: false, showILP: false };

    case "savings plan":
    case "endowment":
      return { showCI: false, showLife: false, showSavings: true, showILP: false };

    case "investment-linked":
      return { showCI: false, showLife: false, showSavings: false, showILP: true };

    default:
      // Show all if unknown category
      return { showCI: true, showLife: true, showSavings: true, showILP: true };
  }
}

/**
 * Helper to extract category-specific fields from a product
 */
export function extractCategoryFields(product: InsuranceProduct): {
  ci?: CriticalIllnessFields;
  life?: LifeProtectionFields;
  savings?: SavingsFields;
  ilp?: ILPFields;
} {
  const relevance = getRelevantFieldsByCategory(product.category as ProductCategory);
  const result: any = {};

  if (relevance.showCI) {
    result.ci = {
      ci_total_conditions_covered: product.ci_total_conditions_covered,
      ci_early_minor_stage: product.ci_early_minor_stage,
      ci_intermediate_stage: product.ci_intermediate_stage,
      ci_major_advanced_stage: product.ci_major_advanced_stage,
      ci_max_claims_allowed: product.ci_max_claims_allowed,
      ci_waiting_period_between_claims: product.ci_waiting_period_between_claims,
      ci_relapse_recurrent_rule: product.ci_relapse_recurrent_rule,
      ci_grouping_pot_rules: product.ci_grouping_pot_rules,
      ci_waiver_triggers: product.ci_waiver_triggers,
      ci_waiver_duration: product.ci_waiver_duration,
      ci_icu_benefit: product.ci_icu_benefit,
      ci_juvenile_special_needs: product.ci_juvenile_special_needs,
      ci_angioplasty_benefit: product.ci_angioplasty_benefit,
      ci_benign_tumor_benefit: product.ci_benign_tumor_benefit,
      ci_initial_waiting_period: product.ci_initial_waiting_period,
      ci_survival_period: product.ci_survival_period,
      ci_pre_existing_conditions: product.ci_pre_existing_conditions,
      ci_age_limits_on_coverage: product.ci_age_limits_on_coverage,
    };
  }

  if (relevance.showLife) {
    result.life = {
      death_benefit_guarantee: product.death_benefit_guarantee,
      death_benefit_multipliers: product.death_benefit_multipliers,
      death_benefit_payout_options: product.death_benefit_payout_options,
      terminal_illness_benefit: product.terminal_illness_benefit,
      total_permanent_disability: product.total_permanent_disability,
      growth_mechanism: product.growth_mechanism,
      downside_protection_floor: product.downside_protection_floor,
      upside_potential_cap: product.upside_potential_cap,
      loyalty_special_bonuses: product.loyalty_special_bonuses,
      cash_value_access: product.cash_value_access,
      premium_holiday_pause: product.premium_holiday_pause,
      critical_illness_rider: product.critical_illness_rider,
      premium_waiver_riders: product.premium_waiver_riders,
      accidental_death_benefit: product.accidental_death_benefit,
      retrenchment_benefit: product.retrenchment_benefit,
      change_of_life_insured: product.change_of_life_insured,
      policy_split_option: product.policy_split_option,
      contingent_policy_owner: product.contingent_policy_owner,
      mental_incapacity_benefit: product.mental_incapacity_benefit,
      guaranteed_issuance_option: product.guaranteed_issuance_option,
      convertibility_option: product.convertibility_option,
      suicide_exclusion: product.suicide_exclusion,
      medical_underwriting: product.medical_underwriting,
    };
  }

  if (relevance.showSavings) {
    result.savings = {
      savings_premium_funding_options: product.savings_premium_funding_options,
      savings_top_up_injections: product.savings_top_up_injections,
      savings_growth_mechanism: product.savings_growth_mechanism,
      savings_bonus_structure: product.savings_bonus_structure,
      savings_cashback_coupon_payouts: product.savings_cashback_coupon_payouts,
      savings_cashback_reinvestment: product.savings_cashback_reinvestment,
      savings_income_payout_period: product.savings_income_payout_period,
      savings_capital_guarantee_status: product.savings_capital_guarantee_status,
      savings_guaranteed_breakeven_target: product.savings_guaranteed_breakeven_target,
      savings_partial_withdrawals: product.savings_partial_withdrawals,
      savings_policy_loan: product.savings_policy_loan,
      savings_premium_holiday: product.savings_premium_holiday,
      savings_retrenchment_benefit: product.savings_retrenchment_benefit,
      savings_embedded_riders: product.savings_embedded_riders,
      savings_accidental_death: product.savings_accidental_death,
      savings_change_of_insured: product.savings_change_of_insured,
      savings_policy_split: product.savings_policy_split,
      savings_contingent_owner: product.savings_contingent_owner,
      savings_death_settlement: product.savings_death_settlement,
      savings_mental_incapacity: product.savings_mental_incapacity,
      savings_medical_underwriting: product.savings_medical_underwriting,
      savings_entry_age_limits: product.savings_entry_age_limits,
      savings_surrender_penalties: product.savings_surrender_penalties,
    };
  }

  if (relevance.showILP) {
    result.ilp = {
      ilp_top_up_injections: product.ilp_top_up_injections,
      ilp_premium_funding_options: product.ilp_premium_funding_options,
      ilp_fund_universe: product.ilp_fund_universe,
      ilp_fund_switching_fee: product.ilp_fund_switching_fee,
      ilp_dividend_paying_funds: product.ilp_dividend_paying_funds,
      ilp_dividend_settlement: product.ilp_dividend_settlement,
      ilp_auto_rebalancing: product.ilp_auto_rebalancing,
      ilp_welcome_initial_bonus: product.ilp_welcome_initial_bonus,
      ilp_loyalty_bonus: product.ilp_loyalty_bonus,
      ilp_special_milestone_bonus: product.ilp_special_milestone_bonus,
      ilp_bonus_clawback_rules: product.ilp_bonus_clawback_rules,
      ilp_premium_charge: product.ilp_premium_charge,
      ilp_account_maintenance_fee: product.ilp_account_maintenance_fee,
      ilp_fund_management_fee: product.ilp_fund_management_fee,
      ilp_early_surrender_penalty: product.ilp_early_surrender_penalty,
      ilp_premium_holiday: product.ilp_premium_holiday,
      ilp_partial_withdrawals: product.ilp_partial_withdrawals,
      ilp_minimum_account_balance: product.ilp_minimum_account_balance,
      ilp_embedded_riders: product.ilp_embedded_riders,
      ilp_change_of_insured: product.ilp_change_of_insured,
      ilp_medical_underwriting: product.ilp_medical_underwriting,
    };
  }

  return result;
}
