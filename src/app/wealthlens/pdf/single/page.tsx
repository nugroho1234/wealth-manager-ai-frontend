'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import * as jwt from 'jsonwebtoken';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, DollarSign, Activity, PieChart, AlertCircle } from 'lucide-react';

// Types matching backend BacktestResults model
interface BacktestResults {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  initial_amount: number;
  strategy: 'lump_sum' | 'dca';
  dca_frequency?: 'monthly' | 'weekly' | 'biweekly' | 'quarterly';
  dca_amount?: number;

  // Summary metrics (root level in backend)
  total_invested: number | string;
  final_value: number | string;
  total_return: number | string;  // Decimal percentage
  cagr: number | string;  // Decimal percentage

  // Time series data
  time_series: Array<{
    date: string;
    value: number | string;  // Backend sends 'value' not 'portfolio_value'
    invested?: number;
    gain_loss?: number;
  }>;

  // Risk metrics (nested in backend)
  risk_metrics: {
    volatility_annual: number | string;
    max_drawdown: number | string;
    sharpe_ratio: number | string;
    sortino_ratio?: number | string;
    risk_level?: string;
    best_day_return?: number | string;
    worst_day_return?: number | string;
  };

  // Allocations
  allocations: Array<{
    instrument_id: string;
    symbol: string;
    percentage: number | string;
    name?: string;
    asset_class?: string;
  }>;
}

interface TokenPayload {
  data: {
    data_id: string;
  };
  exp: number;
  iat: number;
}

export default function SingleBacktestPDFPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<BacktestResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Missing token parameter');
      return;
    }

    async function fetchData() {
      try {
        // Decode JWT token to get data ID
        const decoded = jwt.decode(token) as TokenPayload;

        // Debug logging
        console.log('Token decoded:', decoded);
        console.log('Has data_id?', decoded && decoded.data && 'data_id' in decoded.data);

        if (!decoded || !decoded.data || !decoded.data.data_id) {
          setError(`Invalid token payload. Decoded: ${JSON.stringify(decoded)}`);
          return;
        }

        // Check expiration
        if (decoded.exp && decoded.exp * 1000 < Date.now()) {
          setError('Token has expired');
          return;
        }

        // Fetch data from backend using the data ID
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        const response = await fetch(`${backendUrl}/api/v1/wealthlens/pdf-data/${decoded.data.data_id}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('PDF data not found or expired. Please regenerate the PDF.');
          } else {
            setError('Failed to load PDF data');
          }
          return;
        }

        const pdfData = await response.json();

        if (!pdfData || !pdfData.backtest) {
          setError('Invalid PDF data structure');
          return;
        }

        setData(pdfData.backtest);
      } catch (err) {
        console.error('Error loading PDF data:', err);
        setError('Failed to load PDF data');
      }
    }

    fetchData();
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="flex items-center gap-3 text-red-600 mb-4">
            <AlertCircle className="h-8 w-8" />
            <h1 className="text-2xl font-bold">Error</h1>
          </div>
          <p className="text-gray-700">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  // Format currency (handle both string and number)
  const formatCurrency = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  // Format percentage (handle both string and number)
  // Backend sends decimals (0.07 = 7%), so multiply by 100
  const formatPercent = (value: number | string) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    const percentage = num * 100;
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Chart data - using time_series from backend
  // Backend sends 'value' field (not 'portfolio_value')
  const chartData = data.time_series.map((point) => ({
    date: formatDate(point.date),
    value: typeof point.value === 'string' ? parseFloat(point.value) : point.value,
    invested: point.invested || 0,
  }));

  // Debug: Log chart data
  console.log('Chart data prepared:', {
    dataPoints: chartData.length,
    firstPoint: chartData[0],
    lastPoint: chartData[chartData.length - 1],
    sampleValues: chartData.slice(0, 3).map(d => d.value)
  });

  // Adaptive X-axis label downsampling based on time range
  const calculateXAxisInterval = () => {
    // Calculate date range in days
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    const years = daysDiff / 365.25;

    const dataPointCount = chartData.length;

    // Get first and last dates from actual chart data
    const firstDataDate = chartData.length > 0 ? chartData[0].date : 'N/A';
    const lastDataDate = chartData.length > 0 ? chartData[chartData.length - 1].date : 'N/A';

    // Adaptive interval based on time range
    let interval: number;

    if (years > 5) {
      // Maximum range or > 5 years: Show ~10-12 labels
      interval = Math.floor(dataPointCount / 10);
    } else if (years > 3) {
      // 3-5 years: Show ~15-20 labels
      interval = Math.floor(dataPointCount / 15);
    } else if (years > 1) {
      // 1-3 years: Show ~25-30 labels
      interval = Math.floor(dataPointCount / 25);
    } else {
      // < 1 year: Show ~50+ labels (minimal downsampling)
      interval = Math.floor(dataPointCount / 50);
    }

    // Ensure minimum interval of 0 (show all if very few points)
    interval = Math.max(0, interval);

    const debugInfo = {
      metaStartDate: data.start_date,
      metaEndDate: data.end_date,
      firstDataPoint: firstDataDate,
      lastDataPoint: lastDataDate,
      years: years.toFixed(2),
      dataPoints: dataPointCount,
      interval,
      estimatedLabels: interval > 0 ? Math.ceil(dataPointCount / interval) : dataPointCount
    };

    console.log('📊 X-axis adaptive downsampling:', debugInfo);

    // Also print to page for debugging
    if (typeof window !== 'undefined' && chartData.length > 0) {
      console.log('📅 Date Range Check:');
      console.log('  Expected:', data.start_date, 'to', data.end_date);
      console.log('  Actual Data:', firstDataDate, 'to', lastDataDate);
      console.log('  Total Points:', dataPointCount);
    }

    return interval;
  };

  const xAxisInterval = calculateXAxisInterval();

  return (
    <div className="min-h-screen bg-white p-8 print:p-0">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 pb-6 border-b-2 border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{data.name}</h1>
              {data.description && (
                <p className="text-gray-600 mb-4">{data.description}</p>
              )}
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{formatDate(data.start_date)} - {formatDate(data.end_date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  <span className="capitalize">{data.strategy.replace('_', ' ')} Strategy</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500 mb-1">Generated on</p>
              <p className="text-sm font-medium text-gray-900">
                {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Performance Summary */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Performance Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-blue-600" />
                <p className="text-sm font-medium text-blue-900">Final Value</p>
              </div>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(data.final_value)}</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <p className="text-sm font-medium text-green-900">Total Return</p>
              </div>
              <p className="text-2xl font-bold text-green-900">
                {formatPercent(data.total_return)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="h-5 w-5 text-purple-600" />
                <p className="text-sm font-medium text-purple-900">CAGR</p>
              </div>
              <p className="text-2xl font-bold text-purple-900">{formatPercent(data.cagr)}</p>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-5 w-5 text-orange-600" />
                <p className="text-sm font-medium text-orange-900">Total Invested</p>
              </div>
              <p className="text-2xl font-bold text-orange-900">{formatCurrency(data.total_invested)}</p>
            </div>
          </div>
        </div>

        {/* Portfolio Value Chart */}
        <div className="mb-8 break-inside-avoid">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Portfolio Value Over Time
            <span className="text-xs text-gray-500 ml-2 font-normal">
              ({chartData.length} points, interval: {xAxisInterval})
            </span>
          </h2>
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickMargin={10}
                  interval={xAxisInterval}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => {
                    const num = typeof value === 'string' ? parseFloat(value) : value;
                    return `$${(num / 1000).toFixed(0)}k`;
                  }}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="Portfolio Value"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={false}
                />
                {data.strategy === 'dca' && (
                  <Line
                    type="monotone"
                    dataKey="invested"
                    name="Total Invested"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Metrics */}
        <div className="mb-8 break-inside-avoid">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Risk Analysis</h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Metric</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Value</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Interpretation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">Volatility</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900">{formatPercent(data.risk_metrics.volatility_annual)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">Annual standard deviation of returns</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">Max Drawdown</td>
                  <td className="px-6 py-4 text-sm text-right text-red-600">{formatPercent(data.risk_metrics.max_drawdown)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">Largest peak-to-trough decline</td>
                </tr>
                <tr>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">Sharpe Ratio</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-900">
                    {(typeof data.risk_metrics.sharpe_ratio === 'string'
                      ? parseFloat(data.risk_metrics.sharpe_ratio)
                      : data.risk_metrics.sharpe_ratio).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">Risk-adjusted return (higher is better)</td>
                </tr>
                {data.risk_metrics.sortino_ratio !== undefined && (
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Sortino Ratio</td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">
                      {(typeof data.risk_metrics.sortino_ratio === 'string'
                        ? parseFloat(data.risk_metrics.sortino_ratio)
                        : data.risk_metrics.sortino_ratio).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">Downside risk-adjusted return</td>
                  </tr>
                )}
                {data.risk_metrics.risk_level && (
                  <tr>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">Risk Level</td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900">{data.risk_metrics.risk_level}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">Portfolio risk classification</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Allocation Breakdown */}
        <div className="mb-8 break-inside-avoid">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Portfolio Allocation
          </h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Symbol</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Asset Class</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-gray-900">Allocation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.allocations.map((allocation) => (
                  <tr key={allocation.instrument_id}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{allocation.symbol}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{allocation.name || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {allocation.asset_class ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {allocation.asset_class}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-gray-900 font-medium">
                      {(typeof allocation.percentage === 'string'
                        ? parseFloat(allocation.percentage)
                        : allocation.percentage).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Strategy Details */}
        {data.strategy === 'dca' && (
          <div className="mb-8 break-inside-avoid">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Investment Strategy Details</h2>
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">Strategy Type</p>
                  <p className="text-lg text-blue-900">Dollar-Cost Averaging (DCA)</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">Frequency</p>
                  <p className="text-lg text-blue-900 capitalize">{data.dca_frequency?.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">DCA Amount</p>
                  <p className="text-lg text-blue-900">{formatCurrency(data.dca_amount || 0)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900 mb-1">Initial Investment</p>
                  <p className="text-lg text-blue-900">{formatCurrency(data.initial_amount)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p className="mb-2">
            This report is generated by WealthLens - Portfolio Backtesting & Analysis Tool
          </p>
          <p className="text-xs">
            <strong>Disclaimer:</strong> Past performance does not guarantee future results. This analysis is for informational purposes only and should not be considered as investment advice.
          </p>
        </div>
      </div>

      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .break-inside-avoid {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}
