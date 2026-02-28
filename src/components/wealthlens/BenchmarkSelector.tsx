'use client';

import { useState, useEffect } from 'react';
import { Search, CheckCircle2 } from 'lucide-react';
import { searchInstruments, InstrumentSearchResult } from '@/lib/api/wealthlens';
import { toast } from 'react-hot-toast';

interface BenchmarkSelectorProps {
  selectedBenchmark: InstrumentSearchResult | null;
  onSelectBenchmark: (benchmark: InstrumentSearchResult | null) => void;
}

const POPULAR_BENCHMARKS = [
  { symbol: 'SPY', name: 'S&P 500 ETF', description: 'US Large Cap Stocks' },
  { symbol: 'BND', name: 'Total Bond Market', description: 'US Investment Grade Bonds' },
  { symbol: 'AGG', name: 'Aggregate Bond Index', description: 'Broad Bond Market' },
  { symbol: 'VTI', name: 'Total Stock Market', description: 'US Total Market' },
  { symbol: 'VT', name: 'Total World Stock', description: 'Global Stocks' },
];

export default function BenchmarkSelector({ selectedBenchmark, onSelectBenchmark }: BenchmarkSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<InstrumentSearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);

  // Debounced search
  useEffect(() => {
    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const instruments = await searchInstruments(searchQuery, 10);
        setSearchResults(instruments);
        setShowResults(true);
      } catch (error: any) {
        toast.error('Failed to search benchmarks');
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectBenchmark = (instrument: InstrumentSearchResult) => {
    onSelectBenchmark(instrument);
    setSearchQuery('');
    setShowResults(false);
    setSearchResults([]);
  };

  const handleSelectPopular = async (symbol: string) => {
    try {
      const instruments = await searchInstruments(symbol, 5);
      const exact = instruments.find((i) => i.symbol === symbol);
      if (exact) {
        handleSelectBenchmark(exact);
      } else {
        toast.error(`Benchmark ${symbol} not found`);
      }
    } catch (error) {
      toast.error('Failed to load benchmark');
    }
  };

  return (
    <div className="space-y-4">
      {/* Selected Benchmark */}
      {selectedBenchmark ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-blue-900">{selectedBenchmark.symbol}</span>
                  <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                    {selectedBenchmark.instrument_type.toUpperCase()}
                  </span>
                </div>
                <p className="text-sm text-blue-800 mt-0.5">{selectedBenchmark.name}</p>
              </div>
            </div>
            <button
              onClick={() => onSelectBenchmark(null)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Change
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Search Box */}
          <div className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
                placeholder="Search for a benchmark (e.g., SPY, BND)..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {loading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>

            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
                {searchResults.map((instrument) => (
                  <button
                    key={instrument.instrument_id}
                    onClick={() => handleSelectBenchmark(instrument)}
                    className="w-full px-4 py-3 hover:bg-gray-50 flex items-start gap-3 text-left border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{instrument.symbol}</span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                          {instrument.instrument_type.toUpperCase()}
                        </span>
                        {instrument.asset_class && (
                          <span className="text-xs text-gray-500">{instrument.asset_class}</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-0.5">{instrument.name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Popular Benchmarks */}
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Popular Benchmarks:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {POPULAR_BENCHMARKS.map((benchmark) => (
                <button
                  key={benchmark.symbol}
                  onClick={() => handleSelectPopular(benchmark.symbol)}
                  className="px-4 py-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 text-left transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-gray-900">{benchmark.symbol}</div>
                      <div className="text-sm text-gray-600">{benchmark.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Info */}
          <p className="text-xs text-gray-500">
            Select a benchmark to compare your portfolio's performance. Common benchmarks include SPY (S&P 500), BND
            (Bonds), or VTI (Total Market).
          </p>
        </>
      )}
    </div>
  );
}
