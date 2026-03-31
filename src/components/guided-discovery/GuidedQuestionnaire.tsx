'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Question, getQuestionsForCategory } from '@/config/guidedQuestions';

export interface GuidedParameters {
  category: string;
  [key: string]: string | string[] | undefined;
}

interface GuidedQuestionnaireProps {
  isOpen: boolean;
  onClose: () => void;
  categoryId: string;
  categoryName: string;
  onComplete: (parameters: GuidedParameters) => void;
  preFilledAnswers?: Record<string, any>;
}

export default function GuidedQuestionnaire({
  isOpen,
  onClose,
  categoryId,
  categoryName,
  onComplete,
  preFilledAnswers = {}
}: GuidedQuestionnaireProps) {
  const questions = getQuestionsForCategory(categoryId);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  // Sync answers with preFilledAnswers when modal opens or preFilledAnswers changes
  useEffect(() => {
    if (isOpen) {
      setAnswers(preFilledAnswers || {});
      setCurrentQuestionIndex(0);
    }
  }, [isOpen, preFilledAnswers]);

  const currentQuestion = questions && questions.length > 0 ? questions[currentQuestionIndex] : null;
  const isLastQuestion = questions && currentQuestionIndex === questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;
  const progress = questions && questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  const handleAnswer = (questionId: string, value: string | string[]) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleNext = () => {
    // Skip optional questions if not answered
    if (!currentQuestion.required && !answers[currentQuestion.id]) {
      // Move to next question
      if (!isLastQuestion) {
        setCurrentQuestionIndex(prev => prev + 1);
      }
      return;
    }

    // Validate required questions
    if (currentQuestion.required && !answers[currentQuestion.id]) {
      return; // Don't proceed if required question not answered
    }

    if (isLastQuestion) {
      // Submit answers
      handleComplete();
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (!isFirstQuestion) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    const parameters: GuidedParameters = {
      category: categoryId,
      ...answers
    };
    onComplete(parameters);
  };

  const handleClose = () => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    onClose();
  };

  const isQuestionAnswered = (question: Question): boolean => {
    return !!answers[question.id];
  };

  if (!isOpen || !currentQuestion || !questions || questions.length === 0) return null;

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
              className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-2xl font-bold text-white">
                    {categoryName} Questionnaire
                  </h2>
                  <button
                    onClick={handleClose}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-indigo-400 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                    className="bg-white h-2 rounded-full"
                  />
                </div>
                <p className="mt-2 text-indigo-100 text-sm">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </p>
              </div>

              {/* Question Content */}
              <div className="p-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentQuestion.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Question */}
                    <div className="mb-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {currentQuestion.question}
                        {!currentQuestion.required && (
                          <span className="ml-2 text-sm font-normal text-gray-500">(Optional)</span>
                        )}
                      </h3>
                      {preFilledAnswers && currentQuestion && preFilledAnswers[currentQuestion.id] && (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mt-2 bg-green-50 text-green-700 text-sm rounded-full border border-green-200">
                          <CheckIcon className="h-4 w-4" />
                          <span>Detected from your query</span>
                        </div>
                      )}
                      {currentQuestion.helpText && (
                        <p className="text-sm text-gray-600 mt-2">
                          💡 {currentQuestion.helpText}
                        </p>
                      )}
                    </div>

                    {/* Options */}
                    {currentQuestion.type === 'single' && currentQuestion.options && (
                      <div className="space-y-3">
                        {currentQuestion.options.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => handleAnswer(currentQuestion.id, option.value)}
                            className={`
                              w-full p-4 rounded-lg border-2 text-left transition-all
                              ${
                                answers[currentQuestion.id] === option.value
                                  ? 'border-indigo-600 bg-indigo-50'
                                  : 'border-gray-200 hover:border-indigo-300 bg-white'
                              }
                            `}
                          >
                            <div className="flex items-start">
                              <div className={`
                                flex-shrink-0 w-5 h-5 rounded-full border-2 mr-3 mt-0.5
                                flex items-center justify-center
                                ${
                                  answers[currentQuestion.id] === option.value
                                    ? 'border-indigo-600 bg-indigo-600'
                                    : 'border-gray-300'
                                }
                              `}>
                                {answers[currentQuestion.id] === option.value && (
                                  <CheckIcon className="h-3 w-3 text-white" />
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">
                                  {option.label}
                                </div>
                                {option.description && (
                                  <div className="text-sm text-gray-600 mt-1">
                                    {option.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {currentQuestion.type === 'input' && (
                      <input
                        type="text"
                        value={(answers[currentQuestion.id] as string) || ''}
                        onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                        placeholder={currentQuestion.placeholder}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-indigo-600 focus:ring-0 transition-colors"
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-200">
                <button
                  onClick={handleBack}
                  disabled={isFirstQuestion}
                  className={`
                    flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors
                    ${
                      isFirstQuestion
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                  Back
                </button>

                <button
                  onClick={handleNext}
                  disabled={currentQuestion.required && !isQuestionAnswered(currentQuestion)}
                  className={`
                    flex items-center gap-2 px-6 py-2 text-sm font-medium text-white rounded-lg transition-all
                    ${
                      currentQuestion.required && !isQuestionAnswered(currentQuestion)
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow-md'
                    }
                  `}
                >
                  {isLastQuestion ? 'Complete' : 'Next'}
                  {!isLastQuestion && <ChevronRightIcon className="h-5 w-5" />}
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
