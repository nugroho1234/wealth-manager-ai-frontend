'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Award, AlertTriangle, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { MultiPortfolioComparisonResponse, PortfolioComparisonResult, MultiPortfolioRequest, generateComparisonPDF } from '@/lib/api/wealthlens';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface PortfolioComparisonProps {
  comparison: MultiPortfolioComparisonResponse;
  comparisonRequest?: MultiPortfolioRequest;
}

// Helper function to format currency
const formatCurrency = (value: number): string => {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// Helper function to format percentage
const formatPercent = (value: number): string => {
  return `${(value * 100).toFixed(2)}%`;
};

// Phase 6.5: Format investment details based on strategy
const formatInvestmentDetails = (portfolio: PortfolioComparisonResult): string => {
  const { results } = portfolio;

  if (results.strategy === 'lump_sum') {
    return `${formatCurrency(Number(results.total_invested))} initial`;
  } else {
    // DCA strategy
    const frequencyMap: Record<string, string> = {
      'monthly': 'month',
      'weekly': 'week',
      'biweekly': '2 weeks',
      'quarterly': 'quarter',
    };

    // Calculate approximate DCA amount per period
    const timeSeriesLen = results.time_series.length;
    const dcaAmount = timeSeriesLen > 0 ? Number(results.total_invested) / timeSeriesLen : 0;
    const frequency = results.dca_frequency || 'monthly';
    const freqLabel = frequencyMap[frequency] || frequency;

    // Check if there's an initial amount
    const initialAmount = Number(results.initial_amount) || 0;
    if (initialAmount > 0) {
      return `${formatCurrency(initialAmount)} + $${dcaAmount.toFixed(0)}/${freqLabel}`;
    } else {
      return `$${dcaAmount.toFixed(0)}/${freqLabel}`;
    }
  }
};

export default function PortfolioComparison({ comparison, comparisonRequest }: PortfolioComparisonProps) {
  const { portfolios } = comparison;

  // State for "Show All Assets" toggles (one per portfolio)
  const [showAllAssets, setShowAllAssets] = useState<Record<string, boolean>>({});
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const handleDownloadPDF = async () => {
    if (!comparisonRequest) {
      toast.error('Cannot generate PDF: comparison request data not available');
      return;
    }

    setDownloadingPDF(true);
    try {
      toast.loading('Generating comparison PDF report...', { id: 'pdf-gen' });

      const pdfBlob = await generateComparisonPDF(comparisonRequest);

      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      const today = new Date().toISOString().split('T')[0];
      a.download = `portfolio-comparison-${today}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Comparison PDF downloaded!', { id: 'pdf-gen' });
    } catch (error: any) {
      console.error('Error generating comparison PDF:', error);
      toast.error('Failed to generate comparison PDF', { id: 'pdf-gen' });
    } finally {
      setDownloadingPDF(false);
    }
  };

  // Portfolio line colors
  const portfolioColors = ['#3b82f6', '#10b981', '#f59e0b']; // Blue, Green, Orange
  const benchmarkColor = '#ef4444'; // Red for benchmark

  // Asset colors for individual assets (different shades)
  const assetColors = ['#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#fb7185'];

  // Prepare chart data - merge time series from all portfolios
  const chartData = portfolios[0].results.time_series.map((point, index) => {
    const dataPoint: any = {
      date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    };

    portfolios.forEach((portfolio, idx) => {
      const value = portfolio.results.time_series[index]?.value || 0;
      dataPoint[portfolio.name] = parseFloat(Number(value).toFixed(2));
    });

    return dataPoint;
  });

  return (
    <div className="space-y-6">
      {/* Header with Quick Insights and Download Button */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-2xl font-bold">Portfolio Comparison</h2>
          {comparisonRequest && (
            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPDF}
              className="ml-4 px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 shadow-lg"
            >
              {downloadingPDF ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Download PDF</span>
                </>
              )}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Award className="h-5 w-5" />
              <span className="text-sm font-medium">Best Return</span>
            </div>
            <div className="text-lg font-bold">{comparison.best_return_portfolio}</div>
          </div>

          <div className="bg-white/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-5 w-5" />
              <span className="text-sm font-medium">Best Risk-Adjusted</span>
            </div>
            <div className="text-lg font-bold">{comparison.best_sharpe_portfolio}</div>
          </div>

          <div className="bg-white/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-5 w-5" />
              <span className="text-sm font-medium">Worst Return</span>
            </div>
            <div className="text-lg font-bold">{comparison.worst_return_portfolio}</div>
          </div>

          <div className="bg-white/20 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-5 w-5" />
              <span className="text-sm font-medium">Highest Volatility</span>
            </div>
            <div className="text-lg font-bold">{comparison.highest_volatility_portfolio}</div>
          </div>
        </div>
      </div>

      {/* Multi-Portfolio Chart */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Value Over Time</h3>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              stroke="#6b7280"
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px',
              }}
              formatter={(value: number, name: string) => [
                `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                name,
              ]}
            />
            <Legend />

            {/* Portfolio lines */}
            {portfolios.map((portfolio, idx) => (
              <Line
                key={portfolio.name}
                type="monotone"
                dataKey={portfolio.name}
                stroke={portfolioColors[idx % portfolioColors.length]}
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Phase 6.7: Subdivided Comparison Tables */}

      {/* Performance Metrics Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Portfolio
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Strategy
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Investment Details
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CAGR
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Return
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank (Return)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {portfolios.map((portfolio, idx) => {
                const isProfitable = Number(portfolio.results.total_return) >= 0;
                const isBestReturn = portfolio.is_best_return;
                const isBestSharpe = portfolio.is_best_sharpe;
                const isBestAlpha = portfolio.is_best_alpha;
                const isWorstReturn = portfolio.is_worst_return;

                return (
                  <tr
                    key={portfolio.name}
                    className={`hover:bg-gray-50 ${
                      isBestReturn ? 'bg-green-50' : isWorstReturn ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: portfolioColors[idx % portfolioColors.length] }}
                        />
                        <div>
                          <div className="font-medium text-gray-900">{portfolio.name}</div>
                          <div className="flex gap-1 mt-1">
                            {isBestReturn && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                🏆 Best Return
                              </span>
                            )}
                            {isBestSharpe && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                ⭐ Best Sharpe
                              </span>
                            )}
                            {isBestAlpha && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                💎 Best Alpha
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                      {portfolio.results.strategy === 'lump_sum' ? 'Lump Sum' : 'DCA'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                      {formatInvestmentDetails(portfolio)}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatPercent(Number(portfolio.results.cagr))}
                    </td>
                    <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium text-right ${
                      isProfitable ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {isProfitable ? '+' : ''}{formatPercent(Number(portfolio.results.total_return))}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 font-medium">
                        #{portfolio.rank_by_return}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Risk Metrics Table */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Metrics</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Portfolio
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Volatility
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sharpe Ratio
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Max Drawdown
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank (Sharpe)
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {portfolios.map((portfolio, idx) => {
                const isBestReturn = portfolio.is_best_return;
                const isBestSharpe = portfolio.is_best_sharpe;
                const isBestAlpha = portfolio.is_best_alpha;
                const isWorstReturn = portfolio.is_worst_return;

                return (
                  <tr
                    key={portfolio.name}
                    className={`hover:bg-gray-50 ${
                      isBestReturn ? 'bg-green-50' : isWorstReturn ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: portfolioColors[idx % portfolioColors.length] }}
                        />
                        <div>
                          <div className="font-medium text-gray-900">{portfolio.name}</div>
                          <div className="flex gap-1 mt-1">
                            {isBestReturn && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                🏆 Best Return
                              </span>
                            )}
                            {isBestSharpe && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                ⭐ Best Sharpe
                              </span>
                            )}
                            {isBestAlpha && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                💎 Best Alpha
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatPercent(Number(portfolio.results.risk_metrics.volatility_annual))}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {portfolio.results.risk_metrics.sharpe_ratio != null
                        ? Number(portfolio.results.risk_metrics.sharpe_ratio).toFixed(2)
                        : 'N/A'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-red-600 text-right">
                      {formatPercent(Number(portfolio.results.risk_metrics.max_drawdown))}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 font-medium">
                        #{portfolio.rank_by_sharpe}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Benchmark Comparison Table (Phase 6.7: Only shown if benchmarks exist) */}
      {comparison.benchmarks && comparison.benchmarks.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Benchmark Comparison vs {comparison.benchmarks.map(b => b.symbol).join(', ')}
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Portfolio
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alpha
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Beta
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Correlation
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tracking Error
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank (Alpha)
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {portfolios.map((portfolio, idx) => {
                  const isBestReturn = portfolio.is_best_return;
                  const isBestSharpe = portfolio.is_best_sharpe;
                  const isBestAlpha = portfolio.is_best_alpha;
                  const isWorstReturn = portfolio.is_worst_return;
                  const benchmarkMetrics = portfolio.benchmark_comparisons?.[0]; // Use first benchmark

                  return (
                    <tr
                      key={portfolio.name}
                      className={`hover:bg-gray-50 ${
                        isBestReturn ? 'bg-green-50' : isWorstReturn ? 'bg-red-50' : ''
                      }`}
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: portfolioColors[idx % portfolioColors.length] }}
                          />
                          <div>
                            <div className="font-medium text-gray-900">{portfolio.name}</div>
                            <div className="flex gap-1 mt-1">
                              {isBestReturn && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  🏆 Best Return
                                </span>
                              )}
                              {isBestSharpe && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  ⭐ Best Sharpe
                                </span>
                              )}
                              {isBestAlpha && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                  💎 Best Alpha
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className={`px-4 py-4 whitespace-nowrap text-sm font-medium text-right ${
                        benchmarkMetrics && Number(benchmarkMetrics.alpha) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {benchmarkMetrics
                          ? `${Number(benchmarkMetrics.alpha) >= 0 ? '+' : ''}${formatPercent(Number(benchmarkMetrics.alpha))}`
                          : 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {benchmarkMetrics ? Number(benchmarkMetrics.beta).toFixed(2) : 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {benchmarkMetrics ? Number(benchmarkMetrics.correlation).toFixed(2) : 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                        {benchmarkMetrics ? formatPercent(Number(benchmarkMetrics.tracking_error)) : 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                        {portfolio.rank_by_alpha ? (
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 font-medium">
                            #{portfolio.rank_by_alpha}
                          </span>
                        ) : (
                          'N/A'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Expandable Portfolio Details (Phase 6.7: Added individual charts with benchmark) */}
      <div className="space-y-4">
        {portfolios.map((portfolio, idx) => {
          // Prepare chart data for this portfolio
          const portfolioChartData = portfolio.results.time_series.map((point, timeIndex) => {
            const dataPoint: any = {
              date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
              'Portfolio Total': parseFloat(Number(point.value).toFixed(2)),
            };

            // Add benchmark data if available
            if (comparison.benchmarks && comparison.benchmarks.length > 0) {
              const benchmark = comparison.benchmarks[0];
              const benchmarkValue = benchmark.time_series[timeIndex]?.value || 0;
              dataPoint[benchmark.symbol] = parseFloat(Number(benchmarkValue).toFixed(2));
            }

            // Add individual asset data if "Show All Assets" is toggled
            if (showAllAssets[portfolio.name]) {
              portfolio.results.allocations.forEach((allocation) => {
                const assetValue = allocation.time_series[timeIndex]?.value || 0;
                dataPoint[allocation.symbol] = parseFloat(Number(assetValue).toFixed(2));
              });
            }

            return dataPoint;
          });

          return (
            <details key={portfolio.name} className="bg-white rounded-lg border border-gray-200">
              <summary className="px-6 py-4 cursor-pointer hover:bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: portfolioColors[idx % portfolioColors.length] }}
                  />
                  <span className="font-semibold text-gray-900">{portfolio.name} - Details</span>
                </div>
                <span className="text-sm text-gray-500">Click to expand</span>
              </summary>
              <div className="px-6 pb-6 pt-2 border-t border-gray-200 space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Final Value</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatCurrency(Number(portfolio.results.final_value))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Total Invested</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {formatCurrency(Number(portfolio.results.total_invested))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Risk Level</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {portfolio.results.risk_metrics.risk_level}
                    </div>
                  </div>
                </div>

                {/* Phase 6.7: Individual Portfolio Chart with Benchmark */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">Portfolio Performance Over Time</h4>
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showAllAssets[portfolio.name] || false}
                        onChange={(e) => {
                          setShowAllAssets({
                            ...showAllAssets,
                            [portfolio.name]: e.target.checked,
                          });
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      Show All Assets
                    </label>
                  </div>

                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={portfolioChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                      />
                      <YAxis
                        tick={{ fontSize: 12 }}
                        stroke="#6b7280"
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '12px',
                        }}
                        formatter={(value: number, name: string) => [
                          `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                          name,
                        ]}
                      />
                      <Legend />

                      {/* Portfolio Total (always shown) */}
                      <Line
                        type="monotone"
                        dataKey="Portfolio Total"
                        stroke={portfolioColors[idx % portfolioColors.length]}
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 6 }}
                      />

                      {/* Benchmark (always shown if available) */}
                      {comparison.benchmarks && comparison.benchmarks.length > 0 && (
                        <Line
                          type="monotone"
                          dataKey={comparison.benchmarks[0].symbol}
                          stroke={benchmarkColor}
                          strokeWidth={3}
                          strokeDasharray="5 5"
                          dot={false}
                          activeDot={{ r: 6 }}
                        />
                      )}

                      {/* Individual Assets (shown only if toggled) */}
                      {showAllAssets[portfolio.name] &&
                        portfolio.results.allocations.map((allocation, assetIdx) => (
                          <Line
                            key={allocation.instrument_id}
                            type="monotone"
                            dataKey={allocation.symbol}
                            stroke={assetColors[assetIdx % assetColors.length]}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                          />
                        ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Asset Allocation Table */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Asset Allocation</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Asset</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Allocation</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Final Value</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {portfolio.results.allocations.map((allocation) => (
                          <tr key={allocation.instrument_id}>
                            <td className="px-3 py-2 text-sm text-gray-900">{allocation.symbol}</td>
                            <td className="px-3 py-2 text-sm text-gray-900 text-right">
                              {Number(allocation.percentage).toFixed(1)}%
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900 text-right">
                              {formatCurrency(Number(allocation.final_value))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </div>
  );
}
