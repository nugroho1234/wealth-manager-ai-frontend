/**
 * Guided Discovery Question Templates
 *
 * Defines questions for each insurance category to help users
 * specify their requirements through a guided questionnaire.
 *
 * Based on rough-plan.md specifications - uses plain language
 * that explains benefits rather than technical insurance jargon.
 */

export interface QuestionOption {
  value: string;
  label: string;
  description?: string;
}

export interface Question {
  id: string;
  question: string;
  type: 'single' | 'multiple' | 'input';
  options?: QuestionOption[];
  placeholder?: string;
  required: boolean;
  helpText?: string;
}

export interface CategoryQuestions {
  [categoryId: string]: Question[];
}

export const GUIDED_QUESTIONS: CategoryQuestions = {
  // 🛡️ Life Protection Questions
  life_protection: [
    {
      id: 'q1_duration',
      question: 'How long do you need this coverage to last?',
      type: 'single',
      required: true,
      options: [
        {
          value: 'specific_period',
          label: 'For a specific period',
          description: 'Just until I hit a milestone (like retiring or the kids finishing school).'
        },
        {
          value: 'whole_life',
          label: 'For my whole life',
          description: 'I want to leave a legacy behind, no matter what age I pass away.'
        },
        {
          value: 'others',
          label: 'Others',
          description: 'Please specify your preference'
        }
      ]
    },
    {
      id: 'q2_goal',
      question: 'What is the main goal for your money?',
      type: 'single',
      required: true,
      options: [
        {
          value: 'pure_protection',
          label: 'Pure Protection',
          description: "I don't need cash savings. I just want the highest payout for the lowest monthly cost."
        },
        {
          value: 'protection_and_savings',
          label: 'Protection + Savings',
          description: 'I want the policy to build cash value over time so I can withdraw from it later if I need to.'
        }
      ]
    },
    {
      id: 'q3_payment',
      question: 'How do you want to pay your premiums?',
      type: 'single',
      required: true,
      options: [
        {
          value: 'fixed_for_life',
          label: 'Fixed for life',
          description: 'Same amount every year, ongoing'
        },
        {
          value: 'short_pay',
          label: 'Pay it off in a few years',
          description: '5 or 10-pay, then covered forever'
        },
        {
          value: 'single_lump_sum',
          label: 'Single lump sum',
          description: 'Pay once, done'
        }
      ]
    },
    {
      id: 'q4_growth',
      question: 'If you want cash savings, how do you prefer it to grow?',
      type: 'single',
      required: false,
      options: [
        {
          value: 'safe_and_steady',
          label: 'Safe & Steady',
          description: 'I prefer stable growth with guaranteed minimums, even if the returns are a bit lower.'
        },
        {
          value: 'market_linked',
          label: 'Market-Linked',
          description: 'I am okay with market ups and downs if it means higher potential growth (like tracking the S&P 500).'
        }
      ],
      helpText: 'Optional - only if you chose "Protection + Savings" as your goal'
    },
    {
      id: 'q5_boost',
      question: 'Do you need extra protection while you are working and raising a family?',
      type: 'single',
      required: false,
      options: [
        {
          value: 'boost_coverage',
          label: 'Yes, "Boost" my coverage',
          description: 'I want a higher payout while I am young and have dependents, which can safely drop down after I retire (e.g., age 70).'
        },
        {
          value: 'keep_flat',
          label: 'No, keep it flat',
          description: 'I want the exact same payout amount from day one until the day I pass away.'
        }
      ],
      helpText: 'Many Whole Life plans feature a "Multiplier" (e.g., 2x Multiplier up to age 85). This helps find the perfect fit.'
    },
    {
      id: 'q6_currency',
      question: 'Do you have a currency preference for this policy?',
      type: 'single',
      required: true,
      options: [
        {
          value: 'local_currency_only',
          label: 'Local Currency Only',
          description: 'I earn and spend in my home currency, so I want my policy in my local currency (like SGD, MYR, or IDR) to avoid any exchange rate risks.'
        },
        {
          value: 'usd',
          label: 'US Dollars (USD)',
          description: 'I specifically want a USD-denominated plan to hold a globally stable currency and diversify my wealth.'
        },
        {
          value: 'multi_currency',
          label: 'Multi-Currency Flexibility',
          description: 'I want a plan that lets me switch my money between different global currencies (like USD, GBP, RMB, or AUD) in the future—great for retiring abroad or sending kids overseas!'
        }
      ],
      helpText: 'High-end legacy plans (IULs) are often in global currencies like USD. Choose local currency if you want to avoid exchange rate risk.'
    }
  ],

  // 🩺 Critical Illness Questions (from rough-plan.md)
  critical_illness: [
    {
      id: 'q1_payout_timing',
      question: 'When do you want the policy to pay out?',
      type: 'single',
      required: true,
      options: [
        {
          value: 'advanced_stage',
          label: 'Only for severe, advanced illnesses',
          description: 'Keep my monthly costs as low as possible. I only need a major payout if the condition becomes life-threatening (like late-stage cancer or a major heart attack).'
        },
        {
          value: 'earliest_diagnosis',
          label: 'Only for early detection',
          description: 'I just want a smaller safety net if an illness is caught in its very first stages, so I can pay for early treatments and take a short break from work.'
        },
        {
          value: 'both_early_and_severe',
          label: 'Cover me from start to finish (Both)',
          description: 'I want total peace of mind. I want a payout whether the illness is caught on day one, and I want coverage if it ever progresses to a severe stage.'
        }
      ]
    },
    {
      id: 'q2_multiple_claims',
      question: 'What if the illness comes back, or you get a different illness later?',
      type: 'single',
      required: true,
      options: [
        {
          value: 'one_time',
          label: 'One-time payout is fine',
          description: 'Just give me one big lump sum to help me recover, and the policy ends.'
        },
        {
          value: 'multiple_claims',
          label: 'I want continuous safety (Multiple Claims)',
          description: 'I want the ability to claim again in the future if the cancer returns or if I get a different condition (like a heart attack) years later.'
        }
      ]
    },
    {
      id: 'q3_premium_return',
      question: 'What happens if you stay healthy and never need to claim?',
      type: 'single',
      required: true,
      options: [
        {
          value: 'lowest_premium',
          label: "That's fine — I want the lowest possible premium",
          description: "I accept I won't get anything back if I never claim"
        },
        {
          value: 'refund_premiums',
          label: 'I want my premiums refunded',
          description: 'If I stay healthy until the policy ends, I want my money back'
        }
      ]
    },
    {
      id: 'q4_coverage_duration',
      question: 'How long do you need this illness protection to last?',
      type: 'single',
      required: true,
      options: [
        {
          value: 'working_years',
          label: 'Just during my working years',
          description: 'I only need cover until I retire (e.g., age 65 or 70), when getting sick would hurt my income the most.'
        },
        {
          value: 'whole_life',
          label: 'For my whole life',
          description: 'I want to be covered in my old age too (e.g., up to age 99 or 100), even though I know it costs a bit more.'
        }
      ],
      helpText: 'CI premiums increase significantly for coverage into 80s and 90s. Choose working years if on a budget.'
    },
    {
      id: 'q5_coverage_breadth',
      question: 'How broad do you want your coverage to be?',
      type: 'single',
      required: true,
      options: [
        {
          value: 'common_illnesses',
          label: 'The most common illnesses only',
          description: 'Cancer, Heart Attack, Stroke. Lower cost, covers what matters most statistically'
        },
        {
          value: 'comprehensive',
          label: 'Comprehensive',
          description: '100+ conditions including rare diseases, ICU events, and gender-specific conditions'
        }
      ],
      helpText: 'Many insurers offer "Cancer-only" or "Big 3" plans for budget-friendly coverage.'
    }
  ],

  // 💰 Savings & Wealth Plans Questions (from rough-plan.md)
  // Includes: Endowment, ILP, Retirement, Education savings
  savings_and_wealth: [
    {
      id: 'q1_goal',
      question: 'What is the main goal for this money?',
      type: 'single',
      required: true,
      options: [
        {
          value: 'short_medium_term',
          label: 'Short/Medium-Term Goal',
          description: 'Saving for something specific in the next 5 to 15 years (like a house downpayment or child\'s education).'
        },
        {
          value: 'retirement_income',
          label: 'Retirement Income',
          description: 'Building a nest egg that will pay me a steady income during my golden years.'
        },
        {
          value: 'wealth_legacy',
          label: 'Wealth Accumulation & Legacy',
          description: 'Growing my money over the long term (20+ years) to eventually pass down to my children or grandchildren.'
        }
      ]
    },
    {
      id: 'q2_payout_type',
      question: 'How do you want to receive the money in the future?',
      type: 'single',
      required: true,
      options: [
        {
          value: 'lump_sum',
          label: 'One Big Payout',
          description: 'Grow my money and give it all back to me in one massive lump sum at a specific time (like when I retire or when the policy matures).'
        },
        {
          value: 'yearly_income',
          label: 'Steady Regular Income',
          description: 'Just pay me a steady, predictable stream of cash every month or year (like a pension or passive dividend) once the plan is ready.'
        },
        {
          value: 'mix_of_both',
          label: 'A Mix of Both (Lump Sums + Income)',
          description: 'I want cash payouts at key milestones (like a lump sum to travel when I retire), but I also want a steady stream of regular income afterward.'
        }
      ]
    },
    {
      id: 'q3_funding_method',
      question: 'How do you prefer to put money into this plan?',
      type: 'single',
      required: true,
      options: [
        {
          value: 'one_time_lump',
          label: 'One-Time Lump Sum',
          description: 'I have a chunk of cash right now that I want to put to work.'
        },
        {
          value: 'pay_quickly',
          label: 'Pay it off quickly',
          description: 'I want to fund the plan over a short, fixed period (e.g., 3 to 5 years) and then let it grow.'
        },
        {
          value: 'slow_steady',
          label: 'Slow and Steady',
          description: 'I want to save a smaller, manageable amount every month or year for a longer period (10+ years).'
        }
      ]
    },
    {
      id: 'q4_growth_preference',
      question: 'How do you feel about guarantees vs. higher potential growth?',
      type: 'single',
      required: true,
      options: [
        {
          value: 'maximum_safety',
          label: 'Maximum Safety',
          description: 'I want a plan where my base capital is 100% guaranteed, even if the overall growth is a bit slower.'
        },
        {
          value: 'higher_potential',
          label: 'Higher Potential',
          description: 'I am okay with relying on non-guaranteed bonuses for part of the payout if it means my money can grow much faster over time.'
        }
      ]
    },
    {
      id: 'q5_currency',
      question: 'Do you have a currency preference?',
      type: 'single',
      required: true,
      options: [
        {
          value: 'local_currency',
          label: 'Local Currency Only',
          description: 'I want to save and withdraw in my home currency to avoid exchange rate risks.'
        },
        {
          value: 'usd',
          label: 'US Dollars (USD)',
          description: 'I prefer a USD plan to diversify my wealth globally.'
        },
        {
          value: 'multi_currency',
          label: 'Multi-Currency Flexibility',
          description: 'I want the freedom to switch my policy between different global currencies (like GBP, RMB, or AUD) in the future—perfect for sending kids overseas!'
        }
      ]
    },
    {
      id: 'q6_management',
      question: 'How do you want your money to be managed?',
      type: 'single',
      required: true,
      options: [
        {
          value: 'hands_off',
          label: 'Hands-off (Let the insurer do it)',
          description: 'I want the insurance company to manage everything smoothly and declare yearly bonuses. I prefer a "set it and forget it" approach.'
        },
        {
          value: 'hands_on',
          label: 'Hands-on (I want fund choices)',
          description: 'I want my money invested in global funds (like mutual funds or tech sectors). I know there are no guarantees, but I want maximum control and potential returns.'
        }
      ],
      helpText: 'Choosing "Hands-on" will show Investment-Linked Products (ILPs) with fund selection options.'
    }
  ],

  // 🏥 Hospital & Health Insurance Questions (from rough-plan.md)
  health_insurance: [
    {
      id: 'q1_hospital_preference',
      question: 'If you need a surgery or hospital stay, where do you prefer to be treated?',
      type: 'single',
      required: true,
      options: [
        {
          value: 'government_public',
          label: 'Government / Public Hospitals',
          description: 'I am happy with subsidized public hospitals and staying in shared wards (e.g., 4-bed or 6-bed wards) to keep my premiums as low as possible.'
        },
        {
          value: 'private_local',
          label: 'Private Hospitals (Local)',
          description: 'I want the freedom to choose my own doctor, skip the public waitlists, and stay in a private hospital in a 1-bed or 2-bed room.'
        },
        {
          value: 'top_tier_global',
          label: 'Top-Tier / Global Hospitals',
          description: 'I want VIP access to the best premium hospitals anywhere in the world.'
        }
      ]
    },
    {
      id: 'q2_cost_sharing',
      question: 'How do you feel about paying a portion of the hospital bill out of your own pocket?',
      type: 'single',
      required: true,
      options: [
        {
          value: 'cover_everything',
          label: 'Cover as much as legally possible',
          description: 'I want the insurance to handle almost the entire bill. I am willing to pay a higher monthly premium so I don\'t get shocked by a massive hospital bill later.'
        },
        {
          value: 'small_percentage',
          label: 'I can share a small percentage of the bill',
          description: 'I am okay paying a small percentage (e.g., 10%) of the final bill to keep my monthly premiums reasonable.'
        },
        {
          value: 'high_deductible',
          label: 'I will pay the first few thousand dollars',
          description: 'I have cash savings. I only want the insurance to kick in for massive, catastrophic bills (e.g., bills over $5,000 or $10,000) so my monthly premiums stay very cheap.'
        }
      ]
    },
    {
      id: 'q3_coverage_location',
      question: 'Where do you need this medical coverage to work?',
      type: 'single',
      required: true,
      options: [
        {
          value: 'home_country',
          label: 'Just in my home country',
          description: 'I only need coverage for local hospitals.'
        },
        {
          value: 'across_asia',
          label: 'Across Asia',
          description: 'I travel frequently for work or leisure within Asia and want peace of mind regionally.'
        },
        {
          value: 'worldwide',
          label: 'Anywhere in the World',
          description: 'I am an expat or global citizen and need coverage globally (including or excluding the US).'
        }
      ]
    },
    {
      id: 'q4_coverage_scope',
      question: 'Do you want coverage for everyday doctor visits, or just major hospital stays?',
      type: 'single',
      required: true,
      options: [
        {
          value: 'inpatient_only',
          label: 'Just Hospital Stays & Surgeries (Inpatient)',
          description: 'Only cover me for the big, expensive emergencies. I will pay for my own cough and cold clinics.'
        },
        {
          value: 'outpatient_too',
          label: 'Cover Everyday Visits too (Outpatient)',
          description: 'I want the insurance to also pay for regular GP visits, specialists, and maybe even alternative medicine (like TCM/chiropractor).'
        }
      ]
    },
    {
      id: 'q5_optional_benefits',
      question: 'Do you want to add any of these optional benefits?',
      type: 'multiple',
      required: false,
      options: [
        {
          value: 'no_extras',
          label: 'No, keep it basic',
          description: 'Standard hospital coverage is enough for me.'
        },
        {
          value: 'maternity',
          label: 'Maternity',
          description: 'Cover pregnancy, childbirth, and newborn care.'
        },
        {
          value: 'dental_vision',
          label: 'Dental & Vision',
          description: 'Cover routine scaling, polishing, and eye exams.'
        },
        {
          value: 'wellness',
          label: 'Wellness & Screenings',
          description: 'Cover my annual full-body health checks and vaccinations.'
        },
        {
          value: 'alternative_medicine',
          label: 'Alternative Medicine',
          description: 'Cover Traditional Chinese Medicine (TCM), acupuncture, or chiropractors.'
        },
        {
          value: 'mental_health',
          label: 'Mental Health',
          description: 'Cover psychiatric treatments and therapy.'
        },
        {
          value: 'other',
          label: 'Other specific needs',
          description: 'Special coverage like medical evacuation, pre-existing conditions, etc.'
        }
      ]
    }
  ],

};

/**
 * Get questions for a specific category
 */
export function getQuestionsForCategory(categoryId: string): Question[] {
  return GUIDED_QUESTIONS[categoryId] || [];
}

/**
 * Get all categories with questions
 */
export function getAllCategories(): string[] {
  return Object.keys(GUIDED_QUESTIONS).filter(cat => GUIDED_QUESTIONS[cat].length > 0);
}
