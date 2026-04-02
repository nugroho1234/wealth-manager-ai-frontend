'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, CheckIcon, ChevronDownIcon, ChevronUpIcon, PencilIcon } from '@heroicons/react/24/outline';
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
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [showPreFilled, setShowPreFilled] = useState(false);
  const [editingPreFilled, setEditingPreFilled] = useState<Set<string>>(new Set());

  // Sync answers with preFilledAnswers when modal opens or preFilledAnswers changes
  useEffect(() => {
    if (isOpen) {
      setAnswers(preFilledAnswers || {});
    }
  }, [isOpen, preFilledAnswers]);

  // Separate questions into pre-filled and unanswered
  const preFilledQuestions = useMemo(() =>
    questions.filter(q => preFilledAnswers && preFilledAnswers[q.id] !== undefined),
    [questions, preFilledAnswers]
  );

  const unansweredQuestions = useMemo(() =>
    questions.filter(q => !preFilledAnswers || preFilledAnswers[q.id] === undefined),
    [questions, preFilledAnswers]
  );

  // Compute if all required UNANSWERED questions are answered
  const allRequiredAnswered = useMemo(() => {
    const requiredUnanswered = unansweredQuestions.filter(q => q.required);
    return requiredUnanswered.every(q => answers[q.id]);
  }, [unansweredQuestions, answers]);

  const handleAnswer = (questionId: string, value: string | string[]) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleComplete = () => {
    const parameters: GuidedParameters = {
      category: categoryId,
      ...answers
    };
    onComplete(parameters);
  };

  const handleClose = () => {
    setAnswers({});
    setShowPreFilled(false);
    setEditingPreFilled(new Set());
    onClose();
  };

  const togglePreFilledSection = () => {
    setShowPreFilled(prev => !prev);
  };

  const handleEditPreFilled = (questionId: string) => {
    setEditingPreFilled(prev => {
      const newSet = new Set(prev);
      newSet.add(questionId);
      return newSet;
    });
  };

  const handleSavePreFilled = (questionId: string) => {
    setEditingPreFilled(prev => {
      const newSet = new Set(prev);
      newSet.delete(questionId);
      return newSet;
    });
  };

  if (!isOpen || !questions || questions.length === 0) return null;

  // Helper function to render a question card
  const renderQuestionCard = (question: Question, isPreFilled: boolean = false, isEditing: boolean = false) => {
    const isReadOnly = isPreFilled && !isEditing;

    return (
      <div key={question.id} className={`border rounded-lg p-5 ${isReadOnly ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-200'}`}>
        {/* Question Text */}
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900 flex-1">
            {question.question}
            {!question.required && (
              <span className="ml-2 text-sm font-normal text-gray-500">(Optional)</span>
            )}
          </h3>

          {/* Edit button for pre-filled questions */}
          {isPreFilled && !isEditing && (
            <button
              onClick={() => handleEditPreFilled(question.id)}
              className="ml-3 p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors"
              title="Edit this answer"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          )}

          {/* Save button for editing pre-filled questions */}
          {isEditing && (
            <button
              onClick={() => handleSavePreFilled(question.id)}
              className="ml-3 px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
            >
              Save
            </button>
          )}
        </div>

        {/* Pre-fill badge */}
        {isPreFilled && !isEditing && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-3 bg-green-50 text-green-700 text-sm rounded-full border border-green-200">
            <CheckIcon className="h-4 w-4" />
            <span>Detected from your query</span>
          </div>
        )}

        {question.helpText && (
          <p className="text-sm text-gray-600 mb-4">
            💡 {question.helpText}
          </p>
        )}

        {/* Render options for single choice */}
        {question.type === 'single' && question.options && (
          <div className="space-y-2">
            {question.options.map((option) => (
              <button
                key={option.value}
                onClick={() => !isReadOnly && handleAnswer(question.id, option.value)}
                disabled={isReadOnly}
                className={`
                  w-full p-4 rounded-lg border-2 text-left transition-all
                  ${answers[question.id] === option.value
                    ? 'border-indigo-600 bg-indigo-50'
                    : isReadOnly
                    ? 'border-gray-200 bg-gray-100 cursor-default'
                    : 'border-gray-200 hover:border-indigo-300 bg-white'
                  }
                `}
              >
                <div className="flex items-start">
                  <div className={`
                    flex-shrink-0 w-5 h-5 rounded-full border-2 mr-3 mt-0.5
                    flex items-center justify-center
                    ${answers[question.id] === option.value
                      ? 'border-indigo-600 bg-indigo-600'
                      : 'border-gray-300'
                    }
                  `}>
                    {answers[question.id] === option.value && (
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

        {/* Render options for multiple choice */}
        {question.type === 'multiple' && question.options && (
          <div className="space-y-2">
            {question.options.map((option) => {
              const selectedValues = Array.isArray(answers[question.id])
                ? answers[question.id] as string[]
                : answers[question.id] ? [answers[question.id] as string] : [];
              const isSelected = selectedValues.includes(option.value);
              const hasOtherInput = option.value === 'other';

              return (
                <div key={option.value}>
                  <button
                    onClick={() => {
                      if (isReadOnly) return;

                      const currentValues = Array.isArray(answers[question.id])
                        ? answers[question.id] as string[]
                        : [];

                      let newValues: string[];
                      if (isSelected) {
                        newValues = currentValues.filter(v => v !== option.value);
                      } else {
                        newValues = [...currentValues, option.value];
                      }

                      handleAnswer(question.id, newValues);
                    }}
                    disabled={isReadOnly}
                    className={`
                      w-full p-4 rounded-lg border-2 text-left transition-all
                      ${isSelected
                        ? 'border-indigo-600 bg-indigo-50'
                        : isReadOnly
                        ? 'border-gray-200 bg-gray-100 cursor-default'
                        : 'border-gray-200 hover:border-indigo-300 bg-white'
                      }
                    `}
                  >
                    <div className="flex items-start">
                      <div className={`
                        flex-shrink-0 w-5 h-5 rounded border-2 mr-3 mt-0.5
                        flex items-center justify-center
                        ${isSelected
                          ? 'border-indigo-600 bg-indigo-600'
                          : 'border-gray-300'
                        }
                      `}>
                        {isSelected && (
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

                  {/* Show input field when "other" is selected */}
                  {hasOtherInput && isSelected && (
                    <div className="mt-2 ml-8">
                      <input
                        type="text"
                        value={(answers[`${question.id}_other_details`] as string) || ''}
                        onChange={(e) => !isReadOnly && handleAnswer(`${question.id}_other_details`, e.target.value)}
                        placeholder="Please specify your needs..."
                        disabled={isReadOnly}
                        className={`w-full px-4 py-3 border-2 rounded-lg transition-colors ${
                          isReadOnly
                            ? 'border-gray-200 bg-gray-100 cursor-default'
                            : 'border-gray-200 focus:border-indigo-600 focus:ring-0'
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Render input fields */}
        {question.type === 'input' && (
          <input
            type="text"
            value={(answers[question.id] as string) || ''}
            onChange={(e) => !isReadOnly && handleAnswer(question.id, e.target.value)}
            placeholder={question.placeholder}
            disabled={isReadOnly}
            className={`w-full px-4 py-3 border-2 rounded-lg transition-colors ${
              isReadOnly
                ? 'border-gray-200 bg-gray-100 cursor-default'
                : 'border-gray-200 focus:border-indigo-600 focus:ring-0'
            }`}
          />
        )}
      </div>
    );
  };

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
                <div className="flex items-center justify-between">
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
                <p className="mt-2 text-indigo-100 text-sm">
                  {preFilledQuestions.length > 0 ? (
                    <>
                      {preFilledQuestions.length} question{preFilledQuestions.length > 1 ? 's' : ''} pre-filled from your query.
                      {unansweredQuestions.length > 0 && (
                        <> Please answer {unansweredQuestions.length} more question{unansweredQuestions.length > 1 ? 's' : ''}.</>
                      )}
                    </>
                  ) : (
                    <>
                      Please answer {questions.length} question{questions.length > 1 ? 's' : ''} to help us find the right products for you.
                    </>
                  )}
                </p>
              </div>

              {/* Question Content - Collapsible pre-filled + unanswered questions */}
              <div className="p-6 max-h-[600px] overflow-y-auto">
                <div className="space-y-6">
                  {/* Collapsible Pre-filled Section */}
                  {preFilledQuestions.length > 0 && (
                    <div className="border-2 border-green-200 rounded-lg bg-green-50">
                      {/* Collapsible Header */}
                      <button
                        onClick={togglePreFilledSection}
                        className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-green-100 transition-colors rounded-t-lg"
                      >
                        <div className="flex items-center gap-3">
                          <CheckIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
                          <div>
                            <h3 className="text-base font-semibold text-green-900">
                              Pre-filled from your query ({preFilledQuestions.length})
                            </h3>
                            <p className="text-sm text-green-700 mt-0.5">
                              We detected these answers. Click to review or edit.
                            </p>
                          </div>
                        </div>
                        {showPreFilled ? (
                          <ChevronUpIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
                        ) : (
                          <ChevronDownIcon className="h-5 w-5 text-green-600 flex-shrink-0" />
                        )}
                      </button>

                      {/* Collapsible Content */}
                      <AnimatePresence>
                        {showPreFilled && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-4 space-y-4 border-t border-green-200">
                              {preFilledQuestions.map((question) =>
                                renderQuestionCard(
                                  question,
                                  true,
                                  editingPreFilled.has(question.id)
                                )
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Unanswered Questions Section */}
                  {unansweredQuestions.length > 0 && (
                    <>
                      {preFilledQuestions.length > 0 && (
                        <div className="flex items-center gap-3 pt-2">
                          <div className="h-px bg-gray-300 flex-1"></div>
                          <span className="text-sm font-medium text-gray-500">
                            Please answer these questions
                          </span>
                          <div className="h-px bg-gray-300 flex-1"></div>
                        </div>
                      )}

                      {unansweredQuestions.map((question) =>
                        renderQuestionCard(question, false, false)
                      )}
                    </>
                  )}

                  {/* Edge case: All questions pre-filled */}
                  {preFilledQuestions.length > 0 && unansweredQuestions.length === 0 && (
                    <div className="text-center py-4 text-gray-600">
                      <p className="text-sm">
                        All questions have been pre-filled! Review the answers above and click Submit when ready.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer - Submit button only */}
              <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 border-t border-gray-200">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleComplete}
                  disabled={!allRequiredAnswered}
                  className={`
                    px-6 py-2 text-sm font-medium text-white rounded-lg transition-all
                    ${allRequiredAnswered
                      ? 'bg-indigo-600 hover:bg-indigo-700 shadow-sm hover:shadow-md'
                      : 'bg-gray-300 cursor-not-allowed'
                    }
                  `}
                >
                  Submit Answers
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
