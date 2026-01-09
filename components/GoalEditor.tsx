'use client';

import { useState, useRef, useEffect } from 'react';

interface GoalEditorProps {
  metricKey: string;
  metricLabel: string;
  currentValue: number | null;
  onSave: (metricKey: string, value: number) => void;
  onDelete: (metricKey: string) => void;
  onClose: () => void;
}

export default function GoalEditor({
  metricLabel,
  currentValue,
  onSave,
  onDelete,
  onClose,
  metricKey,
}: GoalEditorProps) {
  const [value, setValue] = useState(currentValue?.toString() || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSave = () => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      onSave(metricKey, numValue);
      onClose();
    }
  };

  const handleDelete = () => {
    onDelete(metricKey);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 min-w-[280px]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
          Set Goal: {metricLabel}
        </h3>
        <input
          ref={inputRef}
          type="number"
          step="0.1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Target value"
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleSave}
            disabled={!value || isNaN(parseFloat(value))}
            className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
          {currentValue && (
            <button
              onClick={handleDelete}
              className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
            >
              Remove
            </button>
          )}
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
