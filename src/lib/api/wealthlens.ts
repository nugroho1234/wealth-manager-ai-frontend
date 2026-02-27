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
  initial_amount: number;
  strategy: 'lump_sum' | 'dca';
  dca_frequency?: 'monthly' | 'weekly' | 'biweekly' | 'quarterly';
  dca_amount?: number;
  allocations: AllocationInput[];
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
 * Run a portfolio backtest
 */
export const runBacktest = async (request: BacktestCreateRequest): Promise<BacktestResults> => {
  const response = await apiClient.post('/api/v1/wealthlens/backtests', request);
  return response.data;
};

/**
 * Health check for WealthLens service
 */
export const healthCheck = async (): Promise<any> => {
  const response = await apiClient.get('/api/v1/wealthlens/health');
  return response.data;
};

export default {
  searchInstruments,
  getInstrument,
  getInstrumentCoverage,
  runBacktest,
  healthCheck,
};
