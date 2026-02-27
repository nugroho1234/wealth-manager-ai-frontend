'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, TrendingUp } from 'lucide-react';
import { searchInstruments, InstrumentSearchResult } from '@/lib/api/wealthlens';
import { toast } from 'react-hot-toast';

interface InstrumentSearchProps {
  onAddInstrument: (instrument: InstrumentSearchResult) => void;
  selectedInstruments: InstrumentSearchResult[];
}

export default function InstrumentSearch({ onAddInstrument, selectedInstruments }: InstrumentSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<InstrumentSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Debounced search
  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const instruments = await searchInstruments(query, 10);
        setResults(instruments);
        setShowResults(true);
      } catch (error: any) {
        console.error('Search error:', error);
        toast.error('Failed to search instruments');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleAddInstrument = (instrument: InstrumentSearchResult) => {
    const alreadyAdded = selectedInstruments.some(
      (item) => item.instrument_id === instrument.instrument_id
    );

    if (alreadyAdded) {
      toast.error(`${instrument.symbol} is already in your portfolio`);
      return;
    }

    onAddInstrument(instrument);
    toast.success(`Added ${instrument.symbol} to portfolio`);
    setQuery('');
    setShowResults(false);
  };

  return (
    <div className="relative">
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search instruments (e.g., SPY, AAPL, BND)..."
          className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent sm:text-sm"
        />
        {loading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && results.length > 0 && (
        <div className="absolute z-10 mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
          {results.map((instrument) => (
            <button
              key={instrument.instrument_id}
              onClick={() => handleAddInstrument(instrument)}
              className="w-full px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 text-left transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{instrument.symbol}</span>
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                      {instrument.instrument_type.toUpperCase()}
                    </span>
                    {instrument.asset_class && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                        {instrument.asset_class}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{instrument.name}</p>
                  {instrument.earliest_date && instrument.latest_date && (
                    <p className="text-xs text-gray-500 mt-1">
                      Data: {instrument.earliest_date} to {instrument.latest_date}
                      {instrument.total_days && ` (${instrument.total_days.toLocaleString()} days)`}
                    </p>
                  )}
                </div>
                <Plus className="h-5 w-5 text-blue-500 flex-shrink-0 ml-2" />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No Results Message */}
      {showResults && results.length === 0 && !loading && query.trim().length > 0 && (
        <div className="absolute z-10 mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-6 text-center">
          <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-600">No instruments found for "{query}"</p>
          <p className="text-sm text-gray-500 mt-1">Try searching for popular tickers like SPY, AAPL, or BND</p>
        </div>
      )}
    </div>
  );
}
