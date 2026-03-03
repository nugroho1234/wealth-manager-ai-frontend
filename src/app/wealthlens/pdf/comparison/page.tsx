'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import * as jwt from 'jsonwebtoken';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Calendar, Trophy, Star, BarChart3, Zap, AlertCircle } from 'lucide-react';

// Types matching backend
interface PortfolioPerformance {
  name: string;
  description?: string;
  final_value: number;
  total_return: number;
  total_return_pct: number;
  annualized_return: number;
  total_invested: number;
  volatility: number;
  max_drawdown: number;
  sharpe_ratio: number;
  sortino_ratio?: number;
  portfolio_value: Array<{
    date: string;
    value: number;
  }>;
}

interface ComparisonInsights {
  best_performer: string;
  highest_return: number;
  highest_return_pct: number;
  most_consistent: string;
  lowest_volatility: number;
  best_risk_adjusted: string;
  best_sharpe: number;
  worst_drawdown: string;
  max_drawdown: number;
}

interface MultiPortfolioComparisonResponse {
  portfolios: PortfolioPerformance[];
  insights: ComparisonInsights;
  shared_benchmarks?: Array<{
    name: string;
    symbol: string;
    final_value: number;
    total_return_pct: number;
    annualized_return: number;
    volatility: number;
    sharpe_ratio: number;
  }>;
}

interface TokenPayload {
  data: {
    comparison: MultiPortfolioComparisonResponse;
    company_id?: string;
  };
  exp: number;
  iat: number;
}

// Color palette for portfolios
const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function ComparisonPDFPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<MultiPortfolioComparisonResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Missing token parameter');
      return;
    }

    try {
      // Decode JWT (without verification since we're on frontend)
      const decoded = jwt.decode(token) as TokenPayload;

      if (!decoded || !decoded.data || !decoded.data.comparison) {
        setError('Invalid token payload');
        return;
      }

      // Check expiration
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        setError('Token has expired');
        return;
      }

      setData(decoded.data.comparison);
    } catch (err) {
      console.error('Error decoding token:', err);
      setError('Failed to decode token');
    }
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
          <p className="text-gray-600">Loading comparison report...</p>
        </div>
      </div>
    );
  }

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Prepare chart data (merge all portfolio values by date)
  const chartData = data.portfolios[0].portfolio_value.map((point, index) => {
    const dataPoint: any = {
      date: formatDate(point.date),
    };

    data.portfolios.forEach((portfolio, pIndex) => {
      dataPoint[portfolio.name] = portfolio.portfolio_value[index]?.value || 0;
    });

    return dataPoint;
  });

  return (
    <div className="min-h-screen bg-white p-8 print:p-0">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 pb-6 border-b-2 border-gray-200">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Multi-Portfolio Comparison Report</h1>
              <p className="text-gray-600 mb-4">
                Comparing {data.portfolios.length} portfolio {data.portfolios.length > 1 ? 'strategies' : 'strategy'}
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {data.portfolios[0]?.portfolio_value[0]?.date &&
                      formatDate(data.portfolios[0].portfolio_value[0].date)} -{' '}
                    {data.portfolios[0]?.portfolio_value[data.portfolios[0].portfolio_value.length - 1]?.date &&
                      formatDate(data.portfolios[0].portfolio_value[data.portfolios[0].portfolio_value.length - 1].date)}
                  </span>
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

        {/* Quick Insights */}
        <div className="mb-8 break-inside-avoid">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Insights</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-5 w-5 text-yellow-600" />
                <p className="text-sm font-medium text-yellow-900">Best Performer</p>
              </div>
              <p className="text-lg font-bold text-yellow-900">{data.insights.best_performer}</p>
              <p className="text-sm text-yellow-700">{formatPercent(data.insights.highest_return_pct)}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-5 w-5 text-blue-600" />
                <p className="text-sm font-medium text-blue-900">Most Consistent</p>
              </div>
              <p className="text-lg font-bold text-blue-900">{data.insights.most_consistent}</p>
              <p className="text-sm text-blue-700">{formatPercent(data.insights.lowest_volatility)} volatility</p>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                <p className="text-sm font-medium text-red-900">Worst Drawdown</p>
              </div>
              <p className="text-lg font-bold text-red-900">{data.insights.worst_drawdown}</p>
              <p className="text-sm text-red-700">{formatPercent(data.insights.max_drawdown)}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-5 w-5 text-purple-600" />
                <p className="text-sm font-medium text-purple-900">Best Risk-Adjusted</p>
              </div>
              <p className="text-lg font-bold text-purple-900">{data.insights.best_risk_adjusted}</p>
              <p className="text-sm text-purple-700">Sharpe: {data.insights.best_sharpe.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Portfolio Values Chart */}
        <div className="mb-8 break-inside-avoid">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Portfolio Performance Comparison</h2>
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickMargin={10}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend />
                {data.portfolios.map((portfolio, index) => (
                  <Line
                    key={portfolio.name}
                    type="monotone"
                    dataKey={portfolio.name}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={3}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="mb-8 break-inside-avoid">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Performance Comparison</h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Portfolio</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Final Value</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Total Return</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Return %</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Ann. Return</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Volatility</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Max DD</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Sharpe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.portfolios.map((portfolio, index) => {
                  const isBestPerformer = portfolio.name === data.insights.best_performer;
                  const isMostConsistent = portfolio.name === data.insights.most_consistent;
                  const isBestRiskAdjusted = portfolio.name === data.insights.best_risk_adjusted;

                  return (
                    <tr key={portfolio.name} className={isBestPerformer ? 'bg-yellow-50' : ''}>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          {portfolio.name}
                          {isBestPerformer && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Trophy className="h-3 w-3 mr-1" />
                              Best
                            </span>
                          )}
                          {isMostConsistent && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              <Star className="h-3 w-3 mr-1" />
                              Stable
                            </span>
                          )}
                          {isBestRiskAdjusted && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                              <Zap className="h-3 w-3 mr-1" />
                              Best Sharpe
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-right text-gray-900 font-medium">
                        {formatCurrency(portfolio.final_value)}
                      </td>
                      <td className="px-4 py-4 text-sm text-right text-gray-900">
                        {formatCurrency(portfolio.total_return)}
                      </td>
                      <td className="px-4 py-4 text-sm text-right font-medium">
                        <span className={portfolio.total_return_pct >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatPercent(portfolio.total_return_pct)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-right text-gray-900">
                        {formatPercent(portfolio.annualized_return)}
                      </td>
                      <td className="px-4 py-4 text-sm text-right text-gray-900">
                        {formatPercent(portfolio.volatility)}
                      </td>
                      <td className="px-4 py-4 text-sm text-right text-red-600">
                        {formatPercent(portfolio.max_drawdown)}
                      </td>
                      <td className="px-4 py-4 text-sm text-right text-gray-900">
                        {portfolio.sharpe_ratio.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Individual Portfolio Details */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900">Individual Portfolio Details</h2>
          {data.portfolios.map((portfolio, index) => (
            <div key={portfolio.name} className="break-inside-avoid">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <h3 className="text-lg font-bold text-gray-900">{portfolio.name}</h3>
                  {portfolio.description && (
                    <span className="text-sm text-gray-600">- {portfolio.description}</span>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Final Value</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(portfolio.final_value)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total Return</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(portfolio.total_return)}
                    </p>
                    <p className="text-xs text-green-600">{formatPercent(portfolio.total_return_pct)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Annualized Return</p>
                    <p className="text-lg font-bold text-gray-900">{formatPercent(portfolio.annualized_return)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total Invested</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(portfolio.total_invested)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Volatility</p>
                    <p className="text-sm text-gray-900">{formatPercent(portfolio.volatility)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Max Drawdown</p>
                    <p className="text-sm text-red-600">{formatPercent(portfolio.max_drawdown)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Sharpe Ratio</p>
                    <p className="text-sm text-gray-900">{portfolio.sharpe_ratio.toFixed(2)}</p>
                  </div>
                  {portfolio.sortino_ratio !== undefined && (
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Sortino Ratio</p>
                      <p className="text-sm text-gray-900">{portfolio.sortino_ratio.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Benchmarks (if any) */}
        {data.shared_benchmarks && data.shared_benchmarks.length > 0 && (
          <div className="mt-8 break-inside-avoid">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Benchmark Performance</h2>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Benchmark</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Final Value</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Return %</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Ann. Return</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Volatility</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-900">Sharpe</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.shared_benchmarks.map((benchmark) => (
                    <tr key={benchmark.symbol}>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">
                        {benchmark.name} ({benchmark.symbol})
                      </td>
                      <td className="px-4 py-4 text-sm text-right text-gray-900">
                        {formatCurrency(benchmark.final_value)}
                      </td>
                      <td className="px-4 py-4 text-sm text-right font-medium">
                        <span className={benchmark.total_return_pct >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatPercent(benchmark.total_return_pct)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-right text-gray-900">
                        {formatPercent(benchmark.annualized_return)}
                      </td>
                      <td className="px-4 py-4 text-sm text-right text-gray-900">
                        {formatPercent(benchmark.volatility)}
                      </td>
                      <td className="px-4 py-4 text-sm text-right text-gray-900">
                        {benchmark.sharpe_ratio.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          <p className="mb-2">
            This report is generated by WealthLens - Portfolio Backtesting & Analysis Tool
          </p>
          <p className="text-xs">
            <strong>Disclaimer:</strong> Past performance does not guarantee future results. This analysis is for
            informational purposes only and should not be considered as investment advice.
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
