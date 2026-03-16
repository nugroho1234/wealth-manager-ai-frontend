import React from 'react';
import { Info } from 'lucide-react';
import { CategoryGroup } from './utils';

interface CrossCategoryBannerProps {
  groups: Set<CategoryGroup>;
}

/**
 * Educational banner shown when comparing products from different category groups
 * Only displays when comparing cross-category products (e.g., Critical Illness vs Whole Life)
 */
export default function CrossCategoryBanner({ groups }: CrossCategoryBannerProps) {
  // Only show if comparing different groups
  if (groups.size <= 1) {
    return null;
  }

  const groupNames = Array.from(groups).map(g => {
    switch (g) {
      case 'critical-illness': return 'Critical Illness';
      case 'life-protection': return 'Life Protection';
      case 'savings': return 'Savings';
      case 'ilp': return 'Investment-Linked';
      default: return g;
    }
  }).join(', ');

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-blue-900 mb-1">
            Cross-Category Comparison
          </h3>
          <p className="text-sm text-blue-800 leading-relaxed">
            You are comparing products from different categories: <span className="font-medium">{groupNames}</span>.
            Some fields may show "N/A" because they don't apply to all product types.
            Use the chatbot below to understand which product best fits your specific needs.
          </p>
        </div>
      </div>
    </div>
  );
}
