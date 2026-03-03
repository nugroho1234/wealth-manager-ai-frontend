/**
 * WealthLens API Client
 *
 * Client functions for WealthLens Portfolio Backtesting API
 * Connects to FastAPI backend endpoints
 */

import apiClient from '../api';

// Types matching backend models
export interface InstrumentSearchResult {
  instrument_id: string;
  symbol: string;
  name: string;
  instrument_type: string;
  asset_class?: string;
  geography?: string;
  sector?: string;
  description?: string;
  relevance_score: number;
  earliest_date?: string;
  latest_date?: string;
  total_days?: number;
}

export interface DataCoverage {
  instrument_id: string;
  earliest_date: string;
  latest_date: string;
  total_days: number;
  data_source: string;
  dataset_version: string;
  missing_days: number;
  data_quality_score?: number;
}

export interface CoverageOverlap {
  earliest_overlap: string;
  latest_overlap: string;
  total_days: number;
  has_coverage: boolean;
  instrument_coverage: Array<{
    instrument_id: string;
    symbol: string;
    name: string;
    earliest_date: string;
    latest_date: string;
    total_days: number;
  }>;
}

export interface AllocationInput {
  instrument_id: string;
  symbol: string;
  percentage: number;
}

export interface BacktestCreateRequest {
  name: string;
  description?: string;
  start_date: string; // ISO format: YYYY-MM-DD
  end_date: string;
  initial_amount?: number; // Phase 6.5: Optional for DCA (defaults to 0)
  strategy: 'lump_sum' | 'dca';
  dca_frequency?: 'monthly' | 'weekly' | 'biweekly' | 'quarterly';
  dca_amount?: number;
  allocations: AllocationInput[];
}

// ============================================================================
// MULTI-PORTFOLIO COMPARISON TYPES (Phase 6, Phase 6.7)
// ============================================================================

export interface PortfolioComparisonResult {
  name: string;
  results: BacktestResults;
  rank_by_return: number;
  rank_by_sharpe: number;
  rank_by_alpha?: number; // Phase 6.7: Only present if benchmark selected
  is_best_return: boolean;
  is_best_sharpe: boolean;
  is_best_alpha?: boolean; // Phase 6.7: Only present if benchmark selected
  is_worst_return: boolean;
  benchmark_comparisons?: ComparisonMetrics[]; // Phase 6.7: Array of comparison metrics (one per benchmark)
}

export interface MultiPortfolioComparisonResponse {
  portfolios: PortfolioComparisonResult[];
  benchmarks?: BenchmarkResult[]; // Phase 6.7: Benchmark backtest results
  best_return_portfolio: string;
  best_sharpe_portfolio: string;
  best_alpha_portfolio?: string; // Phase 6.7: Only present if benchmark selected
  worst_return_portfolio: string;
  highest_volatility_portfolio: string;
  calculated_at: string;
}

export interface MultiPortfolioRequest {
  portfolios: BacktestCreateRequest[];
  shared_benchmarks?: string[];
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
}

export interface AllocationResult {
  instrument_id: string;
  symbol: string;
  name: string;
  percentage: number;
  shares_owned: number;
  final_value: number;
  contribution_to_portfolio: number;
  time_series: TimeSeriesPoint[];
}

export interface RiskMetrics {
  volatility_annual: number;
  sharpe_ratio: number;
  max_drawdown: number;
  max_drawdown_date?: string;
  best_day_return: number;
  best_day_date?: string;
  worst_day_return: number;
  worst_day_date?: string;
  risk_level: string;
}

export interface BacktestResults {
  backtest_id?: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  initial_amount: number;
  strategy: 'lump_sum' | 'dca';
  dca_frequency?: string;
  dca_amount?: number;
  total_invested: number;
  final_value: number;
  total_return: number;
  cagr: number;
  time_series: TimeSeriesPoint[];
  allocations: AllocationResult[];
  risk_metrics: RiskMetrics;
  status: string;
  created_at?: string;
  calculated_at?: string;
}

export interface BenchmarkResult {
  instrument_id: string;
  symbol: string;
  name: string;
  total_invested: number;
  final_value: number;
  total_return: number;
  cagr: number;
  volatility_annual: number;
  sharpe_ratio: number;
  max_drawdown: number;
  time_series: TimeSeriesPoint[];
}

export interface ComparisonMetrics {
  excess_return: number;
  tracking_error: number;
  information_ratio: number;
  alpha: number;
  beta: number;
  correlation: number;
  r_squared: number;
  portfolio_sharpe: number;
  benchmark_sharpe: number;
  sharpe_difference: number;
}

export interface BenchmarkComparison {
  portfolio: BacktestResults;
  benchmark: BenchmarkResult;
  comparison: ComparisonMetrics;
  comparison_period: string;
  calculated_at: string;
}

/**
 * Search for financial instruments
 */
export const searchInstruments = async (
  query: string,
  limit: number = 20,
  instrument_type?: string,
  asset_class?: string
): Promise<InstrumentSearchResult[]> => {
  const params: any = { q: query, limit };
  if (instrument_type) params.instrument_type = instrument_type;
  if (asset_class) params.asset_class = asset_class;

  const response = await apiClient.get('/api/v1/wealthlens/instruments/search', { params });
  return response.data;
};

/**
 * Get instrument details by ID
 */
export const getInstrument = async (instrumentId: string): Promise<any> => {
  const response = await apiClient.get(`/api/v1/wealthlens/instruments/${instrumentId}`);
  return response.data;
};

/**
 * Get data coverage for an instrument
 */
export const getInstrumentCoverage = async (instrumentId: string): Promise<DataCoverage> => {
  const response = await apiClient.get(`/api/v1/wealthlens/instruments/${instrumentId}/coverage`);
  return response.data;
};

/**
 * Get coverage overlap for multiple instruments
 */
export const getCoverageOverlap = async (instrumentIds: string[]): Promise<CoverageOverlap> => {
  const params = new URLSearchParams();
  instrumentIds.forEach(id => params.append('instrument_ids', id));
  const response = await apiClient.post(`/api/v1/wealthlens/instruments/coverage/overlap?${params.toString()}`);
  return response.data;
};

/**
 * Run a portfolio backtest
 */
export const runBacktest = async (request: BacktestCreateRequest): Promise<BacktestResults> => {
  const response = await apiClient.post('/api/v1/wealthlens/backtests', request);
  return response.data;
};

/**
 * Run a portfolio backtest and compare with benchmark
 */
export const compareWithBenchmark = async (
  request: BacktestCreateRequest,
  benchmarkInstrumentId: string
): Promise<BenchmarkComparison> => {
  const response = await apiClient.post(
    `/api/v1/wealthlens/backtests/compare?benchmark_instrument_id=${benchmarkInstrumentId}`,
    request
  );
  return response.data;
};

/**
 * Compare multiple portfolios side-by-side (Phase 6)
 */
export const compareMultiplePortfolios = async (
  request: MultiPortfolioRequest
): Promise<MultiPortfolioComparisonResponse> => {
  const response = await apiClient.post('/api/v1/wealthlens/backtests/compare-multi', request);
  return response.data;
};

/**
 * Health check for WealthLens service
 */
export const healthCheck = async (): Promise<any> => {
  const response = await apiClient.get('/api/v1/wealthlens/health');
  return response.data;
};

/**
 * Generate PDF report for single portfolio backtest (Phase 7)
 */
export const generateBacktestPDF = async (request: BacktestCreateRequest): Promise<Blob> => {
  const response = await apiClient.post('/api/v1/wealthlens/backtests/pdf', request, {
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Generate PDF report for multi-portfolio comparison (Phase 7)
 */
export const generateComparisonPDF = async (request: MultiPortfolioRequest): Promise<Blob> => {
  const response = await apiClient.post('/api/v1/wealthlens/backtests/compare/pdf', request, {
    responseType: 'blob',
  });
  return response.data;
};

export default {
  searchInstruments,
  getInstrument,
  getInstrumentCoverage,
  getCoverageOverlap,
  runBacktest,
  compareWithBenchmark,
  compareMultiplePortfolios,
  healthCheck,
  generateBacktestPDF,
  generateComparisonPDF,
};
