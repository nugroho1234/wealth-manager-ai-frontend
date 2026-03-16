import React from 'react';
import { MessageSquare, TrendingUp, Shield, Scale } from 'lucide-react';

interface QuickActionButtonsProps {
  onQuestionClick: (question: string) => void;
  disabled?: boolean;
}

/**
 * Pre-filled chatbot question buttons for quick insights
 * Integrates with ComparisonChatbot to send common questions
 */
export default function QuickActionButtons({ onQuestionClick, disabled = false }: QuickActionButtonsProps) {
  const quickQuestions = [
    {
      icon: MessageSquare,
      label: 'Explain differences',
      question: 'Can you explain the key differences between these products?',
      color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
    },
    {
      icon: TrendingUp,
      label: 'Best for savings?',
      question: 'Which product is best for someone focused on savings and returns?',
      color: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-200'
    },
    {
      icon: Shield,
      label: 'Best protection?',
      question: 'Which product offers the best protection coverage?',
      color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200'
    },
    {
      icon: Scale,
      label: 'Trade-offs?',
      question: 'What are the main trade-offs between these products?',
      color: 'bg-orange-50 text-orange-700 hover:bg-orange-100 border-orange-200'
    }
  ];

  return (
    <div className="mb-6">
      <p className="text-sm font-medium text-gray-700 mb-3">Quick Questions:</p>
      <div className="flex flex-wrap gap-2">
        {quickQuestions.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={index}
              onClick={() => onQuestionClick(item.question)}
              disabled={disabled}
              className={`
                inline-flex items-center gap-2 px-4 py-2 rounded-lg border
                text-sm font-medium transition-colors
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${item.color}
              `}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
