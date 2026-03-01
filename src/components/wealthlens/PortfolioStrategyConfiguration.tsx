'use client';

import { DollarSign, TrendingUp } from 'lucide-react';

interface Portfolio {
  strategy: 'lump_sum' | 'dca';
  initial_amount?: number;
  dca_frequency?: 'monthly' | 'weekly' | 'biweekly' | 'quarterly';
  dca_amount?: number;
}

interface PortfolioStrategyConfigurationProps {
  portfolio: Portfolio;
  onUpdate: (updates: Partial<Portfolio>) => void;
}

export default function PortfolioStrategyConfiguration({
  portfolio,
  onUpdate,
}: PortfolioStrategyConfigurationProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
          3
        </div>
        <h2 className="text-lg font-semibold text-gray-900">Investment Strategy</h2>
      </div>

      {/* Strategy Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Strategy Type
        </label>
        <div className="grid grid-cols-1 gap-3">
          <button
            type="button"
            onClick={() =>
              onUpdate({
                strategy: 'lump_sum',
                initial_amount: 10000,
                dca_frequency: undefined,
                dca_amount: undefined,
              })
            }
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              portfolio.strategy === 'lump_sum'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-semibold text-gray-900">Lump Sum</div>
            <div className="text-sm text-gray-600 mt-1">Invest all money at start date</div>
          </button>
          <button
            type="button"
            onClick={() =>
              onUpdate({
                strategy: 'dca',
                initial_amount: 0,
                dca_frequency: 'monthly',
                dca_amount: 1000,
              })
            }
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              portfolio.strategy === 'dca'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-semibold text-gray-900">Dollar-Cost Averaging</div>
            <div className="text-sm text-gray-600 mt-1">Regular periodic investments</div>
          </button>
        </div>
      </div>

      {/* Conditional Investment Amount Fields */}
      {portfolio.strategy === 'lump_sum' ? (
        /* Lump Sum: Show only required initial amount */
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Initial Investment Amount (USD)
          </label>
          <input
            type="number"
            value={portfolio.initial_amount}
            onChange={(e) => onUpdate({ initial_amount: parseFloat(e.target.value) })}
            min="100"
            step="100"
            placeholder="10000"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
      ) : (
        /* DCA: Show optional initial amount + DCA configuration */
        <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-gray-900">DCA Configuration</h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Initial Investment Amount (USD){' '}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="number"
              value={portfolio.initial_amount || 0}
              onChange={(e) => onUpdate({ initial_amount: parseFloat(e.target.value) || 0 })}
              min="0"
              step="100"
              placeholder="0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-600 mt-1">
              Optional lump sum to invest at start date, before DCA begins
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Investment Frequency
            </label>
            <select
              value={portfolio.dca_frequency}
              onChange={(e) =>
                onUpdate({ dca_frequency: e.target.value as Portfolio['dca_frequency'] })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              required
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly (every 2 weeks)</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Regular Investment Amount (USD)
            </label>
            <input
              type="number"
              value={portfolio.dca_amount}
              onChange={(e) => onUpdate({ dca_amount: parseFloat(e.target.value) })}
              min="10"
              step="10"
              placeholder="1000"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-600 mt-1">
              Amount to invest every {portfolio.dca_frequency || 'period'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
