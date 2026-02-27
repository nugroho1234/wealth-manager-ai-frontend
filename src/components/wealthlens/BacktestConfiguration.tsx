'use client';

import { useState } from 'react';
import { Calendar, DollarSign, TrendingUp, Play } from 'lucide-react';

interface BacktestConfigurationProps {
  onRunBacktest: (config: BacktestConfig) => void;
  loading: boolean;
  disabled: boolean;
}

export interface BacktestConfig {
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  initial_amount: number;
  strategy: 'lump_sum' | 'dca';
  dca_frequency?: 'monthly' | 'weekly' | 'biweekly' | 'quarterly';
  dca_amount?: number;
}

export default function BacktestConfiguration({ onRunBacktest, loading, disabled }: BacktestConfigurationProps) {
  const [config, setConfig] = useState<BacktestConfig>({
    name: 'My Portfolio Backtest',
    description: '',
    start_date: '2020-01-01',
    end_date: '2024-01-01',
    initial_amount: 10000,
    strategy: 'lump_sum',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRunBacktest(config);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Backtest Configuration</h3>

      {/* Backtest Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Backtest Name</label>
        <input
          type="text"
          value={config.name}
          onChange={(e) => setConfig({ ...config, name: e.target.value })}
          placeholder="e.g., My 60/40 Portfolio"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      {/* Description (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          value={config.description}
          onChange={(e) => setConfig({ ...config, description: e.target.value })}
          placeholder="Brief description of your backtest strategy..."
          rows={2}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Start Date
          </label>
          <input
            type="date"
            value={config.start_date}
            onChange={(e) => setConfig({ ...config, start_date: e.target.value })}
            max={config.end_date}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            End Date
          </label>
          <input
            type="date"
            value={config.end_date}
            onChange={(e) => setConfig({ ...config, end_date: e.target.value })}
            min={config.start_date}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
      </div>

      {/* Initial Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          Initial Investment Amount (USD)
        </label>
        <input
          type="number"
          value={config.initial_amount}
          onChange={(e) => setConfig({ ...config, initial_amount: parseFloat(e.target.value) })}
          min="100"
          step="100"
          placeholder="10000"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        />
      </div>

      {/* Strategy Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Investment Strategy
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setConfig({ ...config, strategy: 'lump_sum', dca_frequency: undefined, dca_amount: undefined })}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              config.strategy === 'lump_sum'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-semibold text-gray-900">Lump Sum</div>
            <div className="text-sm text-gray-600 mt-1">Invest all money at start date</div>
          </button>
          <button
            type="button"
            onClick={() => setConfig({ ...config, strategy: 'dca', dca_frequency: 'monthly', dca_amount: 500 })}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              config.strategy === 'dca'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-semibold text-gray-900">Dollar-Cost Averaging</div>
            <div className="text-sm text-gray-600 mt-1">Regular periodic investments</div>
          </button>
        </div>
      </div>

      {/* DCA Options (shown only if DCA is selected) */}
      {config.strategy === 'dca' && (
        <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-medium text-gray-900">DCA Configuration</h4>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Investment Frequency</label>
            <select
              value={config.dca_frequency}
              onChange={(e) => setConfig({ ...config, dca_frequency: e.target.value as any })}
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
              value={config.dca_amount}
              onChange={(e) => setConfig({ ...config, dca_amount: parseFloat(e.target.value) })}
              min="10"
              step="10"
              placeholder="500"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            <p className="text-xs text-gray-600 mt-1">
              Amount to invest every {config.dca_frequency || 'period'}
            </p>
          </div>
        </div>
      )}

      {/* Run Backtest Button */}
      <button
        type="submit"
        disabled={disabled || loading}
        className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
          disabled || loading
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl'
        }`}
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Running Backtest...</span>
          </>
        ) : (
          <>
            <Play className="h-5 w-5" />
            <span>Run Backtest</span>
          </>
        )}
      </button>

      {disabled && (
        <p className="text-sm text-orange-600 text-center">
          Please ensure your portfolio allocations sum to 100% before running a backtest
        </p>
      )}
    </form>
  );
}
