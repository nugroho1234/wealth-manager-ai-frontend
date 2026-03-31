'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export interface CategoryOption {
  id: string;
  name: string;
  description: string;
  examples: string;
}

interface CategorySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  categoryOptions: CategoryOption[];
  onSelectCategory: (categoryId: string) => void;
  message?: string;
}

export default function CategorySelector({
  isOpen,
  onClose,
  categoryOptions,
  onSelectCategory,
  message = 'What type of insurance are you looking for?'
}: CategorySelectorProps) {
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const handleContinue = () => {
    if (selectedCategory) {
      onSelectCategory(selectedCategory);
    }
  };

  const handleClose = () => {
    setSelectedCategory(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          />

          {/* Modal */}
          <div className="flex min-h-full items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">
                    {message}
                  </h2>
                  <button
                    onClick={handleClose}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <p className="mt-2 text-indigo-100 text-sm">
                  Select a category to help us find the right products for you
                </p>
              </div>

              {/* Category Options */}
              <div className="p-6 max-h-[600px] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categoryOptions.map((option) => (
                    <motion.button
                      key={option.id}
                      onClick={() => handleCategoryClick(option.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`
                        relative p-5 rounded-lg border-2 text-left transition-all
                        ${
                          selectedCategory === option.id
                            ? 'border-indigo-600 bg-indigo-50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm'
                        }
                      `}
                    >
                      {/* Selection indicator */}
                      {selectedCategory === option.id && (
                        <div className="absolute top-4 right-4">
                          <CheckCircleIcon className="h-6 w-6 text-indigo-600" />
                        </div>
                      )}

                      {/* Content */}
                      <div className="pr-8">
                        <h3 className={`text-lg font-semibold mb-2 ${
                          selectedCategory === option.id ? 'text-indigo-900' : 'text-gray-900'
                        }`}>
                          {option.name}
                        </h3>

                        <p className={`text-sm mb-3 ${
                          selectedCategory === option.id ? 'text-indigo-700' : 'text-gray-600'
                        }`}>
                          {option.description}
                        </p>

                        <div className={`text-xs ${
                          selectedCategory === option.id ? 'text-indigo-600' : 'text-gray-500'
                        }`}>
                          <span className="font-medium">Examples:</span> {option.examples}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleContinue}
                  disabled={!selectedCategory}
                  className={`
                    px-6 py-2 text-sm font-medium text-white rounded-lg transition-all
                    ${
                      selectedCategory
                        ? 'bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow-md'
                        : 'bg-gray-300 cursor-not-allowed'
                    }
                  `}
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
