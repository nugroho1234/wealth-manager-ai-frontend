'use client';

import { useState } from 'react';

interface FloatingActionButtonProps {
  onOpenModal: () => void;
}

/**
 * FloatingActionButton Component
 *
 * A fixed-position + button in the bottom-right corner of the screen.
 * Clicking it opens the QuickCreateModal.
 */
export default function FloatingActionButton({ onOpenModal }: FloatingActionButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onOpenModal}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        fixed bottom-6 right-6 z-40
        w-14 h-14 rounded-full
        bg-primary-600 hover:bg-primary-700
        text-white shadow-lg hover:shadow-xl
        flex items-center justify-center
        transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-4 focus:ring-primary-500/50
        ${isHovered ? 'scale-110' : 'scale-100'}
      `}
      aria-label="Create new meeting or task"
    >
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 4v16m8-8H4"
        />
      </svg>
    </button>
  );
}
