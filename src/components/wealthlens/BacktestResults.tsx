'use client';

import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Percent, Activity, AlertTriangle, Download } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { BacktestResults as BacktestResultsType, BenchmarkResult, BacktestCreateRequest, generateBacktestPDF } from '@/lib/api/wealthlens';

interface BacktestResultsProps {
  results: BacktestResultsType;
  benchmark?: BenchmarkResult | null;
  backtestRequest?: BacktestCreateRequest;
}

export default function BacktestResults({ results, benchmark, backtestRequest }: BacktestResultsProps) {
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const profitLoss = Number(results.final_value) - Number(results.total_invested);
  const isProfitable = profitLoss >= 0;

  const handleDownloadPDF = async () => {
    if (!backtestRequest) {
      toast.error('Cannot generate PDF: backtest request data not available');
      return;
    }

    setDownloadingPDF(true);
    try {
      toast.loading('Generating PDF report...', { id: 'pdf-gen' });

      const pdfBlob = await generateBacktestPDF(backtestRequest);

      // Create download link
      const url = window.URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      const safePortfolioName = results.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
      const today = new Date().toISOString().split('T')[0];
      a.download = `backtest-${safePortfolioName}-${today}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('PDF report downloaded!', { id: 'pdf-gen' });
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF report', { id: 'pdf-gen' });
    } finally {
      setDownloadingPDF(false);
    }
  };

  // Colors for each instrument line
  const instrumentColors = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1'];

  // Format chart data with individual instruments and benchmark
  // First validate that time_series is an array
  if (!Array.isArray(results.time_series)) {
    console.error('time_series is not an array:', results.time_series);
    throw new Error('Invalid time_series data received from API');
  }

  const fullChartData = results.time_series.map((point, index) => {
    // Validate each point has required fields
    if (!point || typeof point !== 'object' || !point.date) {
      console.error('Invalid data point at index', index, ':', point);
      throw new Error(`Invalid data point at index ${index}`);
    }

    const dataPoint: any = {
      date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      'Total Portfolio': parseFloat(Number(point.value).toFixed(2)),
    };

    // Add each individual instrument value from their time series
    results.allocations.forEach((allocation) => {
      // Use the per-instrument time series data from backend
      if (allocation.time_series && allocation.time_series[index]) {
        const instrumentValue = parseFloat(Number(allocation.time_series[index].value).toFixed(2));
        dataPoint[allocation.symbol] = instrumentValue;
      }
    });

    // Add benchmark value if available
    if (benchmark && benchmark.time_series && benchmark.time_series[index]) {
      dataPoint['Benchmark'] = parseFloat(Number(benchmark.time_series[index].value).toFixed(2));
    }

    // Add total invested line for lump sum
    if (results.strategy === 'lump_sum') {
      dataPoint['Total Invested'] = parseFloat(Number(results.total_invested).toFixed(2));
    }

    return dataPoint;
  });

  // Downsample chart data based on data point count to prevent chart truncation
  const downsampleChartData = (data: any[]): any[] => {
    const count = data.length;

    // Validate data exists
    if (!data || count === 0) {
      console.warn('No chart data to downsample');
      return [];
    }

    let targetPoints: number;

    // Determine target points based on data count
    if (count >= 1000) {
      targetPoints = 200;  // ~200 points for >= 1000 (yearly intervals for ~19+ years)
    } else if (count >= 700) {
      targetPoints = 150;  // ~150 points for 700-999 (quarterly)
    } else if (count >= 365) {
      targetPoints = 100;  // ~100 points for 365-699 (monthly)
    } else {
      // Less than 1 year of data - keep all points
      return data;
    }

    // Calculate step size to evenly distribute samples across entire dataset
    const step = (count - 1) / (targetPoints - 1);
    const downsampled: any[] = [];

    // Sample evenly across the entire dataset
    for (let i = 0; i < targetPoints; i++) {
      const index = Math.round(i * step);
      // Ensure index is within bounds
      if (index >= 0 && index < count && data[index]) {
        downsampled.push(data[index]);
      }
    }

    console.log('Downsampling summary:', {
      originalPoints: count,
      targetPoints,
      actualDownsampledPoints: downsampled.length,
      step: step.toFixed(2),
      firstPoint: downsampled[0]?.date,
      lastPoint: downsampled[downsampled.length - 1]?.date
    });

    return downsampled;
  };

  const chartData = downsampleChartData(fullChartData);

  // Risk level colors
  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'conservative':
        return 'text-green-600 bg-green-100';
      case 'moderate':
        return 'text-yellow-600 bg-yellow-100';
      case 'aggressive':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Download Button */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">{results.name}</h2>
            {results.description && <p className="text-blue-100">{results.description}</p>}
            <div className="flex items-center gap-4 mt-4 text-sm">
              <span>
                {new Date(results.start_date).toLocaleDateString()} → {new Date(results.end_date).toLocaleDateString()}
              </span>
              <span className="px-3 py-1 bg-white/20 rounded-full">
                {results.strategy === 'lump_sum' ? 'Lump Sum' : `DCA ${results.dca_frequency}`}
              </span>
            </div>
          </div>
          {backtestRequest && (
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
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Invested</span>
            <DollarSign className="h-5 w-5 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            ${Number(results.total_invested).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Final Value</span>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            ${Number(results.final_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className={`bg-white rounded-lg border ${isProfitable ? 'border-green-200' : 'border-red-200'} p-6`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Total Return</span>
            {isProfitable ? (
              <TrendingUp className="h-5 w-5 text-green-500" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-500" />
            )}
          </div>
          <div className={`text-2xl font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
            {isProfitable ? '+' : ''}
            {(Number(results.total_return) * 100).toFixed(2)}%
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {isProfitable ? '+' : ''}${profitLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-blue-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">CAGR</span>
            <Percent className="h-5 w-5 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {(Number(results.cagr) * 100).toFixed(2)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">Compound Annual Growth Rate</div>
        </div>
      </div>

      {/* Portfolio Value Chart */}
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

            {/* Individual instrument lines */}
            {results.allocations.map((allocation, idx) => (
              <Line
                key={allocation.symbol}
                type="monotone"
                dataKey={allocation.symbol}
                stroke={instrumentColors[idx % instrumentColors.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                opacity={0.7}
              />
            ))}

            {/* Total Portfolio line */}
            <Line
              type="monotone"
              dataKey="Total Portfolio"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6 }}
            />

            {/* Benchmark line */}
            {benchmark && (
              <Line
                type="monotone"
                dataKey="Benchmark"
                stroke="#6b7280"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 5 }}
              />
            )}

            {/* Total Invested line (Lump Sum only) */}
            {results.strategy === 'lump_sum' && (
              <Line
                type="monotone"
                dataKey="Total Invested"
                stroke="#d1d5db"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Risk Metrics */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Risk Metrics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">Risk Level</div>
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${getRiskColor(results.risk_metrics.risk_level)}`}>
              {results.risk_metrics.risk_level}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Volatility (Annual)</div>
            <div className="text-lg font-semibold text-gray-900">
              {(Number(results.risk_metrics.volatility_annual) * 100).toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Sharpe Ratio</div>
            <div className="text-lg font-semibold text-gray-900">
              {Number(results.risk_metrics.sharpe_ratio).toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Max Drawdown</div>
            <div className="text-lg font-semibold text-red-600">
              {(Number(results.risk_metrics.max_drawdown) * 100).toFixed(2)}%
            </div>
            {results.risk_metrics.max_drawdown_date && (
              <div className="text-xs text-gray-500 mt-0.5">
                on {new Date(results.risk_metrics.max_drawdown_date).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
            <TrendingUp className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-green-900">Best Day</div>
              <div className="text-lg font-bold text-green-600">
                +{(Number(results.risk_metrics.best_day_return) * 100).toFixed(2)}%
              </div>
              {results.risk_metrics.best_day_date && (
                <div className="text-xs text-green-700">
                  {new Date(results.risk_metrics.best_day_date).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-red-50 rounded-lg">
            <TrendingDown className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-red-900">Worst Day</div>
              <div className="text-lg font-bold text-red-600">
                {(Number(results.risk_metrics.worst_day_return) * 100).toFixed(2)}%
              </div>
              {results.risk_metrics.worst_day_date && (
                <div className="text-xs text-red-700">
                  {new Date(results.risk_metrics.worst_day_date).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Allocation Breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asset
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Allocation
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Shares
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Final Value
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contribution
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.allocations.map((allocation) => (
                <tr key={allocation.instrument_id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{allocation.symbol}</div>
                    <div className="text-sm text-gray-500">{allocation.name}</div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {Number(allocation.percentage).toFixed(1)}%
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {Number(allocation.shares_owned).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-900">
                    ${Number(allocation.final_value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                    {Number(allocation.contribution_to_portfolio).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
