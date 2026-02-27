'use client';

import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { InstrumentSearchResult } from '@/lib/api/wealthlens';

interface PortfolioBuilderProps {
  instruments: InstrumentSearchResult[];
  allocations: Record<string, number>;
  onUpdateAllocation: (instrumentId: string, percentage: number) => void;
  onRemoveInstrument: (instrumentId: string) => void;
}

export default function PortfolioBuilder({
  instruments,
  allocations,
  onUpdateAllocation,
  onRemoveInstrument,
}: PortfolioBuilderProps) {
  const totalAllocation = Object.values(allocations).reduce((sum, val) => sum + val, 0);
  const isValid = Math.abs(totalAllocation - 100) < 0.01;

  // Color palette for instruments
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
    'bg-red-500',
  ];

  if (instruments.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
        <div className="text-gray-400 mb-2">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <p className="text-gray-600 font-medium">Your portfolio is empty</p>
        <p className="text-sm text-gray-500 mt-1">Search and add instruments to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Allocation Status */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Portfolio Allocation</h3>
        <div className="flex items-center gap-2">
          {isValid ? (
            <>
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm font-medium text-green-700">Valid (100%)</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <span className="text-sm font-medium text-orange-700">
                {totalAllocation.toFixed(1)}% (must be 100%)
              </span>
            </>
          )}
        </div>
      </div>

      {/* Allocation Bar Visualization */}
      <div className="h-6 bg-gray-200 rounded-full overflow-hidden flex">
        {instruments.map((instrument, index) => {
          const percentage = allocations[instrument.instrument_id] || 0;
          return (
            <div
              key={instrument.instrument_id}
              className={`${colors[index % colors.length]} transition-all duration-300`}
              style={{ width: `${percentage}%` }}
              title={`${instrument.symbol}: ${percentage.toFixed(1)}%`}
            />
          );
        })}
      </div>

      {/* Instrument Cards */}
      <div className="space-y-3">
        {instruments.map((instrument, index) => {
          const percentage = allocations[instrument.instrument_id] || 0;

          return (
            <div
              key={instrument.instrument_id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <div className={`w-3 h-3 ${colors[index % colors.length]} rounded-full mt-1.5`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{instrument.symbol}</span>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                        {instrument.instrument_type.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">{instrument.name}</p>
                  </div>
                </div>
                <button
                  onClick={() => onRemoveInstrument(instrument.instrument_id)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="Remove from portfolio"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Allocation Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Allocation</label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={percentage}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!isNaN(value) && value >= 0 && value <= 100) {
                        onUpdateAllocation(instrument.instrument_id, value);
                      }
                    }}
                    onBlur={(e) => {
                      const value = parseFloat(e.target.value);
                      if (isNaN(value) || value < 0) {
                        onUpdateAllocation(instrument.instrument_id, 0);
                      } else if (value > 100) {
                        onUpdateAllocation(instrument.instrument_id, 100);
                      }
                    }}
                    className="w-full px-4 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
                    placeholder="0.0"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Allocation Buttons */}
      {instruments.length > 1 && (
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => {
              const equalWeight = 100 / instruments.length;
              instruments.forEach((inst) => {
                onUpdateAllocation(inst.instrument_id, equalWeight);
              });
            }}
            className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            Equal Weight
          </button>
          <button
            onClick={() => {
              instruments.forEach((inst) => {
                onUpdateAllocation(inst.instrument_id, 0);
              });
            }}
            className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}
