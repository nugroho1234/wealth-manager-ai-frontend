'use client';

import { TrendingUp, TrendingDown, Activity, Target, BarChart3 } from 'lucide-react';
import { ComparisonMetrics, BenchmarkResult } from '@/lib/api/wealthlens';

interface BenchmarkComparisonResultsProps {
  benchmark: BenchmarkResult;
  comparison: ComparisonMetrics;
}

export default function BenchmarkComparisonResults({ benchmark, comparison }: BenchmarkComparisonResultsProps) {
  const isOutperforming = Number(comparison.excess_return) > 0;
  const hasPositiveAlpha = Number(comparison.alpha) > 0;

  return (
    <div className="space-y-6">
      {/* Benchmark Performance Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-600" />
          Benchmark: {benchmark.symbol}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">Total Return</div>
            <div className="text-lg font-bold text-gray-900">
              {(Number(benchmark.total_return) * 100).toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">CAGR</div>
            <div className="text-lg font-bold text-gray-900">
              {(Number(benchmark.cagr) * 100).toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Sharpe Ratio</div>
            <div className="text-lg font-bold text-gray-900">
              {Number(benchmark.sharpe_ratio).toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Max Drawdown</div>
            <div className="text-lg font-bold text-red-600">
              {(Number(benchmark.max_drawdown)).toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* Performance Comparison */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-purple-600" />
          Performance Comparison
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Excess Return */}
          <div className={`p-4 rounded-lg ${isOutperforming ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Excess Return</span>
              {isOutperforming ? (
                <TrendingUp className="h-5 w-5 text-green-600" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-600" />
              )}
            </div>
            <div className={`text-2xl font-bold ${isOutperforming ? 'text-green-700' : 'text-red-700'}`}>
              {isOutperforming ? '+' : ''}
              {(Number(comparison.excess_return) * 100).toFixed(2)}%
            </div>
            <p className="text-xs text-gray-600 mt-1">
              {isOutperforming ? 'Portfolio outperformed benchmark' : 'Portfolio underperformed benchmark'}
            </p>
          </div>

          {/* Alpha */}
          <div className={`p-4 rounded-lg ${hasPositiveAlpha ? 'bg-blue-50 border border-blue-200' : 'bg-orange-50 border border-orange-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Alpha</span>
              <Activity className={`h-5 w-5 ${hasPositiveAlpha ? 'text-blue-600' : 'text-orange-600'}`} />
            </div>
            <div className={`text-2xl font-bold ${hasPositiveAlpha ? 'text-blue-700' : 'text-orange-700'}`}>
              {hasPositiveAlpha ? '+' : ''}
              {(Number(comparison.alpha) * 100).toFixed(2)}%
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Risk-adjusted {hasPositiveAlpha ? 'outperformance' : 'underperformance'}
            </p>
          </div>
        </div>
      </div>

      {/* Risk Metrics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Analysis</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">Beta</div>
            <div className="text-xl font-bold text-gray-900">
              {Number(comparison.beta).toFixed(3)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {Number(comparison.beta) < 1 ? 'Less volatile' : Number(comparison.beta) > 1 ? 'More volatile' : 'Same volatility'}
            </p>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Correlation</div>
            <div className="text-xl font-bold text-gray-900">
              {Number(comparison.correlation).toFixed(3)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {Number(comparison.correlation) > 0.8 ? 'High' : Number(comparison.correlation) > 0.5 ? 'Moderate' : 'Low'}
            </p>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">R-Squared</div>
            <div className="text-xl font-bold text-gray-900">
              {Number(comparison.r_squared).toFixed(3)}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {(Number(comparison.r_squared) * 100).toFixed(0)}% explained
            </p>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Tracking Error</div>
            <div className="text-xl font-bold text-gray-900">
              {(Number(comparison.tracking_error) * 100).toFixed(2)}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Deviation</p>
          </div>
        </div>
      </div>

      {/* Advanced Metrics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="text-sm font-medium text-gray-700">Information Ratio</div>
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {Number(comparison.information_ratio).toFixed(3)}
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Excess return per unit of tracking error
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="text-sm font-medium text-gray-700">Sharpe Ratio Comparison</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <div className="text-gray-600">Portfolio</div>
                <div className="font-bold text-blue-700">
                  {Number(comparison.portfolio_sharpe).toFixed(3)}
                </div>
              </div>
              <div>
                <div className="text-gray-600">Benchmark</div>
                <div className="font-bold text-gray-700">
                  {Number(comparison.benchmark_sharpe).toFixed(3)}
                </div>
              </div>
            </div>
            <div className={`text-sm mt-2 ${Number(comparison.sharpe_difference) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              Difference: {Number(comparison.sharpe_difference) >= 0 ? '+' : ''}
              {Number(comparison.sharpe_difference).toFixed(3)}
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm font-medium text-gray-700 mb-2">Interpretation</div>
            <ul className="text-xs text-gray-600 space-y-1">
              <li className="flex items-start gap-1">
                <span className="text-gray-400">•</span>
                <span>
                  <strong>Alpha:</strong> {hasPositiveAlpha ? 'Positive alpha indicates skill' : 'Negative alpha suggests underperformance'}
                </span>
              </li>
              <li className="flex items-start gap-1">
                <span className="text-gray-400">•</span>
                <span>
                  <strong>Beta:</strong> {Number(comparison.beta) < 1 ? 'Lower systematic risk' : 'Higher systematic risk'}
                </span>
              </li>
              <li className="flex items-start gap-1">
                <span className="text-gray-400">•</span>
                <span>
                  <strong>Info Ratio:</strong> {Number(comparison.information_ratio) > 0.5 ? 'Good' : Number(comparison.information_ratio) > 0 ? 'Fair' : 'Poor'}
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Explanation Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="text-sm text-blue-900">
          <p className="font-medium mb-2">Understanding Benchmark Comparison:</p>
          <ul className="space-y-1 text-blue-800">
            <li><strong>Alpha:</strong> Measures excess return adjusted for risk. Positive alpha suggests the portfolio manager added value.</li>
            <li><strong>Beta:</strong> Measures sensitivity to benchmark movements. Beta &lt; 1 means less volatile, &gt; 1 means more volatile.</li>
            <li><strong>Correlation:</strong> How closely portfolio follows benchmark. Range: -1 to +1.</li>
            <li><strong>R²:</strong> % of portfolio variance explained by benchmark. Higher R² means portfolio closely tracks benchmark.</li>
            <li><strong>Tracking Error:</strong> Standard deviation of excess returns. Lower is better for index trackers.</li>
            <li><strong>Information Ratio:</strong> Excess return divided by tracking error. Higher is better (&gt;0.5 is good).</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
