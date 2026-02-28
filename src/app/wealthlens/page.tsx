'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, BarChart3, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import InstrumentSearch from '@/components/wealthlens/InstrumentSearch';
import PortfolioBuilder from '@/components/wealthlens/PortfolioBuilder';
import BacktestConfiguration, { BacktestConfig } from '@/components/wealthlens/BacktestConfiguration';
import BacktestResults from '@/components/wealthlens/BacktestResults';
import BenchmarkSelector from '@/components/wealthlens/BenchmarkSelector';
import BenchmarkComparisonResults from '@/components/wealthlens/BenchmarkComparisonResults';
import {
  runBacktest,
  compareWithBenchmark,
  getCoverageOverlap,
  InstrumentSearchResult,
  BacktestResults as BacktestResultsType,
  BenchmarkComparison,
  CoverageOverlap,
} from '@/lib/api/wealthlens';

export default function WealthLensPage() {
  const [selectedInstruments, setSelectedInstruments] = useState<InstrumentSearchResult[]>([]);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [selectedBenchmark, setSelectedBenchmark] = useState<InstrumentSearchResult | null>(null);
  const [backtestResults, setBacktestResults] = useState<BacktestResultsType | null>(null);
  const [benchmarkComparison, setBenchmarkComparison] = useState<BenchmarkComparison | null>(null);
  const [coverageOverlap, setCoverageOverlap] = useState<CoverageOverlap | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleAddInstrument = (instrument: InstrumentSearchResult) => {
    setSelectedInstruments([...selectedInstruments, instrument]);

    // Automatically set equal allocation when adding first few instruments
    const newCount = selectedInstruments.length + 1;
    const equalWeight = 100 / newCount;

    const newAllocations: Record<string, number> = {};
    selectedInstruments.forEach((inst) => {
      newAllocations[inst.instrument_id] = equalWeight;
    });
    newAllocations[instrument.instrument_id] = equalWeight;

    setAllocations(newAllocations);
  };

  const handleRemoveInstrument = (instrumentId: string) => {
    const updatedInstruments = selectedInstruments.filter((inst) => inst.instrument_id !== instrumentId);
    setSelectedInstruments(updatedInstruments);

    const { [instrumentId]: removed, ...remainingAllocations } = allocations;

    // Redistribute allocations equally if any remain
    if (updatedInstruments.length > 0) {
      const equalWeight = 100 / updatedInstruments.length;
      const newAllocations: Record<string, number> = {};
      updatedInstruments.forEach((inst) => {
        newAllocations[inst.instrument_id] = equalWeight;
      });
      setAllocations(newAllocations);
    } else {
      setAllocations({});
    }
  };

  const handleUpdateAllocation = (instrumentId: string, percentage: number) => {
    setAllocations({
      ...allocations,
      [instrumentId]: percentage,
    });
  };

  const handleRunBacktest = async (config: BacktestConfig) => {
    setLoading(true);
    setBacktestResults(null);
    setBenchmarkComparison(null);

    try {
      const request = {
        name: config.name,
        description: config.description,
        start_date: config.start_date,
        end_date: config.end_date,
        initial_amount: config.initial_amount,
        strategy: config.strategy,
        dca_frequency: config.dca_frequency,
        dca_amount: config.dca_amount,
        allocations: selectedInstruments.map((inst) => ({
          instrument_id: inst.instrument_id,
          symbol: inst.symbol,
          percentage: allocations[inst.instrument_id] || 0,
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
          </div>

          {/* Right Column: Configuration & Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 3: Select Benchmark (Optional) */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  3
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

            {/* Step 4: Configure Backtest */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  4
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Configure & Run Backtest</h2>
              </div>
              <BacktestConfiguration
                onRunBacktest={handleRunBacktest}
                loading={loading}
                disabled={!canRunBacktest}
                coverageOverlap={coverageOverlap}
              />
            </div>

            {/* Step 5: Results */}
            {backtestResults && (
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
            {!backtestResults && !loading && (
              <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
                <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No results yet</h3>
                <p className="text-gray-600">
                  Configure your portfolio and run a backtest to see detailed performance metrics and charts
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
