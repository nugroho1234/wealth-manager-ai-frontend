'use client';

import { useState } from 'react';
import { Calendar, DollarSign, TrendingUp, Play, AlertTriangle } from 'lucide-react';
import { CoverageOverlap } from '@/lib/api/wealthlens';

interface BacktestConfigurationProps {
  onRunBacktest: (config: BacktestConfig) => void;
  loading: boolean;
  disabled: boolean;
  coverageOverlap: CoverageOverlap | null;
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

export default function BacktestConfiguration({ onRunBacktest, loading, disabled, coverageOverlap }: BacktestConfigurationProps) {
  const [config, setConfig] = useState<BacktestConfig>({
    name: 'My Portfolio Backtest',
    description: '',
    start_date: '2020-01-01',
    end_date: '2024-01-01',
    initial_amount: 10000,
    strategy: 'lump_sum',
  });

  // Date validation
  const isDateRangeValid = () => {
    if (!coverageOverlap || !coverageOverlap.has_coverage) return false;

    const startDate = new Date(config.start_date);
    const endDate = new Date(config.end_date);
    const earliestDate = new Date(coverageOverlap.earliest_overlap);
    const latestDate = new Date(coverageOverlap.latest_overlap);

    return startDate >= earliestDate && endDate <= latestDate;
  };

  const getDateWarning = () => {
    if (!coverageOverlap || !coverageOverlap.has_coverage) return null;

    const startDate = new Date(config.start_date);
    const endDate = new Date(config.end_date);
    const earliestDate = new Date(coverageOverlap.earliest_overlap);
    const latestDate = new Date(coverageOverlap.latest_overlap);

    if (startDate < earliestDate) {
      return `Start date is before available data (${earliestDate.toLocaleDateString()})`;
    }
    if (endDate > latestDate) {
      return `End date is after available data (${latestDate.toLocaleDateString()})`;
    }
    return null;
  };

  // Quick-select functions
  const handleUseMaximumOverlap = () => {
    if (!coverageOverlap || !coverageOverlap.has_coverage) return;

    setConfig({
      ...config,
      start_date: coverageOverlap.earliest_overlap,
      end_date: coverageOverlap.latest_overlap,
    });
  };

  const handleQuickSelectPeriod = (years: number) => {
    if (!coverageOverlap || !coverageOverlap.has_coverage) return;

    const latestDate = new Date(coverageOverlap.latest_overlap);
    const earliestDate = new Date(coverageOverlap.earliest_overlap);

    // Calculate target start date (X years ago from latest date)
    const targetStartDate = new Date(latestDate);
    targetStartDate.setFullYear(targetStartDate.getFullYear() - years);

    // Auto-adjust to earliest available if target is before earliest
    const actualStartDate = targetStartDate < earliestDate ? earliestDate : targetStartDate;

    setConfig({
      ...config,
      start_date: actualStartDate.toISOString().split('T')[0],
      end_date: coverageOverlap.latest_overlap,
    });
  };

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

      {/* Available Date Range Info */}
      {coverageOverlap && coverageOverlap.has_coverage && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Available Date Range</p>
              <p className="text-xs text-gray-600 mt-0.5">
                {new Date(coverageOverlap.earliest_overlap).toLocaleDateString()} to{' '}
                {new Date(coverageOverlap.latest_overlap).toLocaleDateString()}
                {' '}({coverageOverlap.total_days.toLocaleString()} days)
              </p>
            </div>
          </div>

          {/* Quick-Select Buttons */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-700">Quick Select:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={handleUseMaximumOverlap}
                className="px-3 py-2 text-xs font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Maximum Range
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelectPeriod(1)}
                className="px-3 py-2 text-xs font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Last 1 Year
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelectPeriod(3)}
                className="px-3 py-2 text-xs font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Last 3 Years
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelectPeriod(5)}
                className="px-3 py-2 text-xs font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Last 5 Years
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Date Range */}
      <div>
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

        {/* Date Validation Warning */}
        {getDateWarning() && (
          <div className="mt-2 flex items-start gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-orange-800">{getDateWarning()}</p>
          </div>
        )}
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
        disabled={disabled || loading || !isDateRangeValid()}
        className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
          disabled || loading || !isDateRangeValid()
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

      {!disabled && !isDateRangeValid() && (
        <p className="text-sm text-orange-600 text-center">
          Please select a date range within the available data period
        </p>
      )}
    </form>
  );
}
