'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, Info, Plus, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import InstrumentSearch from '@/components/wealthlens/InstrumentSearch';
import PortfolioBuilder from '@/components/wealthlens/PortfolioBuilder';
import PortfolioStrategyConfiguration from '@/components/wealthlens/PortfolioStrategyConfiguration';
import BacktestConfiguration from '@/components/wealthlens/BacktestConfiguration';
import BacktestResults from '@/components/wealthlens/BacktestResults';
import BenchmarkSelector from '@/components/wealthlens/BenchmarkSelector';
import BenchmarkComparisonResults from '@/components/wealthlens/BenchmarkComparisonResults';
import PortfolioComparison from '@/components/wealthlens/PortfolioComparison';
import {
  runBacktest,
  compareWithBenchmark,
  compareMultiplePortfolios,
  getCoverageOverlap,
  InstrumentSearchResult,
  BacktestResults as BacktestResultsType,
  BenchmarkComparison,
  CoverageOverlap,
  MultiPortfolioComparisonResponse,
} from '@/lib/api/wealthlens';

// Portfolio interface for Phase 6
interface Portfolio {
  id: string;
  name: string;
  instruments: InstrumentSearchResult[];
  allocations: Record<string, number>;
  strategy: 'lump_sum' | 'dca';
  initial_amount?: number;
  dca_frequency?: 'monthly' | 'weekly' | 'biweekly' | 'quarterly';
  dca_amount?: number;
}

// Default backtest dates config
const defaultDatesConfig = {
  start_date: '2020-01-01',
  end_date: '2024-01-01',
};

export default function WealthLensPage() {
  // Phase 6: Multi-portfolio state
  const [portfolios, setPortfolios] = useState<Portfolio[]>([
    {
      id: '1',
      name: 'Portfolio 1',
      instruments: [],
      allocations: {},
      strategy: 'lump_sum',
      initial_amount: 10000,
    },
  ]);
  const [activePortfolioId, setActivePortfolioId] = useState<string>('1');
  const [selectedBenchmark, setSelectedBenchmark] = useState<InstrumentSearchResult | null>(null);

  // Backtest configuration (dates only)
  const [backtestDates, setBacktestDates] = useState(defaultDatesConfig);

  // Results state
  const [backtestResults, setBacktestResults] = useState<BacktestResultsType | null>(null);
  const [benchmarkComparison, setBenchmarkComparison] = useState<BenchmarkComparison | null>(null);
  const [comparisonResults, setComparisonResults] = useState<MultiPortfolioComparisonResponse | null>(null);
  const [coverageOverlap, setCoverageOverlap] = useState<CoverageOverlap | null>(null);
  const [loading, setLoading] = useState(false);

  // Get active portfolio
  const activePortfolio = portfolios.find((p) => p.id === activePortfolioId) || portfolios[0];
  const selectedInstruments = activePortfolio.instruments;
  const allocations = activePortfolio.allocations;

  // Fetch coverage overlap whenever instruments or benchmark change
  useEffect(() => {
    const fetchCoverageOverlap = async () => {
      if (selectedInstruments.length === 0) {
        setCoverageOverlap(null);
        return;
      }

      try {
        // Include benchmark in overlap calculation if selected
        const instrumentIds = selectedInstruments.map((inst) => inst.instrument_id);
        if (selectedBenchmark) {
          instrumentIds.push(selectedBenchmark.instrument_id);
        }

        const overlap = await getCoverageOverlap(instrumentIds);
        setCoverageOverlap(overlap);
      } catch (error: any) {
        console.error('Error fetching coverage overlap:', error);
        toast.error('Failed to fetch date coverage for selected instruments');
        setCoverageOverlap(null);
      }
    };

    fetchCoverageOverlap();
  }, [selectedInstruments, selectedBenchmark]);

  // Phase 6: Portfolio management functions
  const addPortfolio = () => {
    if (portfolios.length >= 3) {
      toast.error('Maximum 3 portfolios allowed for comparison');
      return;
    }

    const newId = String(portfolios.length + 1);
    const newPortfolio: Portfolio = {
      id: newId,
      name: `Portfolio ${newId}`,
      instruments: [],
      allocations: {},
      strategy: 'lump_sum',
      initial_amount: 10000,
    };

    setPortfolios([...portfolios, newPortfolio]);
    setActivePortfolioId(newId);
    toast.success(`Portfolio ${newId} created`);
  };

  const removePortfolio = (portfolioId: string) => {
    if (portfolios.length === 1) {
      toast.error('Cannot remove the last portfolio');
      return;
    }

    const updatedPortfolios = portfolios.filter((p) => p.id !== portfolioId);
    setPortfolios(updatedPortfolios);

    // Switch to first portfolio if active was removed
    if (activePortfolioId === portfolioId) {
      setActivePortfolioId(updatedPortfolios[0].id);
    }

    toast.success('Portfolio removed');
  };

  const updateActivePortfolio = (updates: Partial<Portfolio>) => {
    setPortfolios(
      portfolios.map((p) => (p.id === activePortfolioId ? { ...p, ...updates } : p))
    );
  };

  const handleAddInstrument = (instrument: InstrumentSearchResult) => {
    const updatedInstruments = [...selectedInstruments, instrument];

    // Automatically set equal allocation when adding first few instruments
    const newCount = updatedInstruments.length;
    const equalWeight = 100 / newCount;

    const newAllocations: Record<string, number> = {};
    updatedInstruments.forEach((inst) => {
      newAllocations[inst.instrument_id] = equalWeight;
    });

    updateActivePortfolio({ instruments: updatedInstruments, allocations: newAllocations });
  };

  const handleRemoveInstrument = (instrumentId: string) => {
    const updatedInstruments = selectedInstruments.filter((inst) => inst.instrument_id !== instrumentId);

    // Redistribute allocations equally if any remain
    if (updatedInstruments.length > 0) {
      const equalWeight = 100 / updatedInstruments.length;
      const newAllocations: Record<string, number> = {};
      updatedInstruments.forEach((inst) => {
        newAllocations[inst.instrument_id] = equalWeight;
      });
      updateActivePortfolio({ instruments: updatedInstruments, allocations: newAllocations });
    } else {
      updateActivePortfolio({ instruments: [], allocations: {} });
    }
  };

  const handleUpdateAllocation = (instrumentId: string, percentage: number) => {
    const newAllocations = {
      ...allocations,
      [instrumentId]: percentage,
    };
    updateActivePortfolio({ allocations: newAllocations });
  };

  const handleRunBacktest = async (dates: { start_date: string; end_date: string }) => {
    setLoading(true);
    setBacktestResults(null);
    setBenchmarkComparison(null);
    setComparisonResults(null);

    // Update backtest dates
    setBacktestDates(dates);

    try {
      // Phase 6: Multi-portfolio comparison mode (2+ portfolios with valid allocations)
      const validPortfolios = portfolios.filter((p) => {
        const totalAlloc = Object.values(p.allocations).reduce((sum, val) => sum + val, 0);
        return p.instruments.length > 0 && Math.abs(totalAlloc - 100) < 0.01;
      });

      if (validPortfolios.length >= 2) {
        // Multi-portfolio comparison
        const portfolioRequests = validPortfolios.map((portfolio) => ({
          name: portfolio.name,
          description: '',
          start_date: dates.start_date,
          end_date: dates.end_date,
          initial_amount: portfolio.initial_amount,
          strategy: portfolio.strategy,
          dca_frequency: portfolio.dca_frequency,
          dca_amount: portfolio.dca_amount,
          allocations: portfolio.instruments.map((inst) => ({
            instrument_id: inst.instrument_id,
            symbol: inst.symbol,
            percentage: portfolio.allocations[inst.instrument_id] || 0,
          })),
        }));

        const comparisonRequest = {
          portfolios: portfolioRequests,
          shared_benchmarks: selectedBenchmark ? [selectedBenchmark.instrument_id] : undefined,
        };

        const comparison = await compareMultiplePortfolios(comparisonRequest);
        setComparisonResults(comparison);
        toast.success(`${validPortfolios.length} portfolios compared successfully!`);
      } else {
        // Single portfolio mode
        const portfolio = validPortfolios[0] || activePortfolio;
        const request = {
          name: portfolio.name,
          description: '',
          start_date: dates.start_date,
          end_date: dates.end_date,
          initial_amount: portfolio.initial_amount,
          strategy: portfolio.strategy,
          dca_frequency: portfolio.dca_frequency,
          dca_amount: portfolio.dca_amount,
          allocations: portfolio.instruments.map((inst) => ({
            instrument_id: inst.instrument_id,
            symbol: inst.symbol,
            percentage: portfolio.allocations[inst.instrument_id] || 0,
          })),
        };

        // Run backtest with or without benchmark comparison
        if (selectedBenchmark) {
          const comparison = await compareWithBenchmark(request, selectedBenchmark.instrument_id);
          setBenchmarkComparison(comparison);
          setBacktestResults(comparison.portfolio); // Extract portfolio results
          toast.success('Backtest with benchmark comparison completed!');
        } else {
          const results = await runBacktest(request);
          setBacktestResults(results);
          toast.success('Backtest completed successfully!');
        }
      }

      // Scroll to results
      setTimeout(() => {
        document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error: any) {
      console.error('Backtest error:', error);
      toast.error(error.detail || 'Failed to run backtest. Please check your inputs and try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalAllocation = Object.values(allocations).reduce((sum, val) => sum + val, 0);
  const isValidAllocation = Math.abs(totalAllocation - 100) < 0.01;
  const canRunBacktest = selectedInstruments.length > 0 && isValidAllocation;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-600 rounded-lg">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">WealthLens</h1>
              <p className="text-gray-600">Portfolio Backtesting & Analysis</p>
            </div>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Build and test your investment portfolio strategies</p>
              <p className="text-blue-700">
                Search for ETFs, stocks, and mutual funds, configure your allocation, and backtest different investment strategies
                (Lump Sum vs Dollar-Cost Averaging). See detailed performance metrics, risk analysis, and visualizations.
              </p>
            </div>
          </div>
        </div>

        {/* Phase 6: Portfolio Tabs */}
        {portfolios.length > 1 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 flex-wrap">
              {portfolios.map((portfolio) => (
                <div key={portfolio.id} className="relative">
                  <button
                    onClick={() => setActivePortfolioId(portfolio.id)}
                    className={`px-4 py-2 rounded-t-lg font-medium transition-all ${
                      activePortfolioId === portfolio.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {portfolio.name}
                  </button>
                  {portfolios.length > 1 && (
                    <button
                      onClick={() => removePortfolio(portfolio.id)}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      title="Remove portfolio"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
              {portfolios.length < 3 && (
                <button
                  onClick={addPortfolio}
                  className="px-4 py-2 rounded-t-lg bg-green-600 text-white font-medium hover:bg-green-700 transition-colors flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Add Portfolio
                </button>
              )}
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Add up to 3 portfolios to compare different strategies side-by-side
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Portfolio Builder */}
          <div className="lg:col-span-1 space-y-6">
            {/* Step 1: Search */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Search Instruments</h2>
              </div>
              <InstrumentSearch
                onAddInstrument={handleAddInstrument}
                selectedInstruments={selectedInstruments}
              />
            </div>

            {/* Step 2: Build Portfolio */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Build Portfolio</h2>
              </div>
              <PortfolioBuilder
                instruments={selectedInstruments}
                allocations={allocations}
                onUpdateAllocation={handleUpdateAllocation}
                onRemoveInstrument={handleRemoveInstrument}
                coverageOverlap={coverageOverlap}
                hasBenchmark={!!selectedBenchmark}
              />
            </div>

            {/* Step 3: Investment Strategy */}
            <PortfolioStrategyConfiguration
              portfolio={activePortfolio}
              onUpdate={updateActivePortfolio}
            />

            {/* Single Portfolio Mode: Add Portfolio Button */}
            {portfolios.length === 1 && (
              <button
                onClick={addPortfolio}
                className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <Plus className="h-5 w-5" />
                Add Another Portfolio to Compare
              </button>
            )}
          </div>

          {/* Right Column: Configuration & Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 4: Select Benchmark (Optional) */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  4
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Select Benchmark <span className="text-sm font-normal text-gray-500">(Optional)</span>
                </h2>
              </div>
              <BenchmarkSelector
                selectedBenchmark={selectedBenchmark}
                onSelectBenchmark={setSelectedBenchmark}
              />
            </div>

            {/* Step 5: Configure & Run Backtest */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  5
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Configure & Run Backtest</h2>
              </div>
              <BacktestConfiguration
                onRunBacktest={handleRunBacktest}
                loading={loading}
                disabled={!canRunBacktest}
                coverageOverlap={coverageOverlap}
                initialDates={backtestDates}
              />
            </div>

            {/* Step 5: Results */}
            {/* Phase 6: Multi-Portfolio Comparison Results */}
            {comparisonResults && (
              <div id="results-section">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Multi-Portfolio Comparison Results</h2>
                </div>
                <PortfolioComparison comparison={comparisonResults} />
              </div>
            )}

            {/* Single Portfolio Results */}
            {backtestResults && !comparisonResults && (
              <div id="results-section">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Results</h2>
                </div>
                <BacktestResults
                  results={backtestResults}
                  benchmark={benchmarkComparison?.benchmark || null}
                />

                {/* Benchmark Comparison Results */}
                {benchmarkComparison && (
                  <div className="mt-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Benchmark Comparison</h3>
                    <BenchmarkComparisonResults
                      benchmark={benchmarkComparison.benchmark}
                      comparison={benchmarkComparison.comparison}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Empty State for Results */}
            {!backtestResults && !comparisonResults && !loading && (
              <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
                <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No results yet</h3>
                <p className="text-gray-600">
                  Configure your portfolio and run a backtest to see detailed performance metrics and charts
                </p>
                {portfolios.length === 1 && (
                  <p className="text-gray-500 text-sm mt-2">
                    Tip: Add another portfolio to compare different strategies side-by-side
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
