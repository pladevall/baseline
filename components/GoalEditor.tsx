import { useState, useRef, useEffect } from 'react';

// Helper to format seconds/minutes to time string
const formatTimeInput = (value: number, type: 'duration' | 'pace' | 'time'): string => {
  if (value === null || value === undefined) return '';

  if (type === 'time') {
    // Value is minutes from midnight (potentially > 1440 for next day)
    const normalizedMinutes = value % 1440;
    const h = Math.floor(normalizedMinutes / 60);
    const m = Math.round(normalizedMinutes % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  // Duration/Pace (value is seconds)
  const m = Math.floor(value / 60);
  const s = Math.round(value % 60);

  if (type === 'duration' && m >= 60) {
    const h = Math.floor(m / 60);
    const remM = m % 60;
    return `${h}:${remM.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  return `${m}:${s.toString().padStart(2, '0')}`;
};

// Helper to parse time string to number
// Returns seconds for duration/pace, minutes for time
const parseTimeInput = (value: string, type: 'duration' | 'pace' | 'time'): number | null => {
  if (!value) return null;

  if (type === 'time') {
    // Expect HH:MM from type="time" input
    const [h, m] = value.split(':').map(Number);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  // Duration/Pace parsing
  // allow mm:ss or hh:mm:ss or m:ss
  const parts = value.split(':').map(Number);
  if (parts.some(isNaN)) return null;

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return null;
};

interface GoalEditorProps {
  metricKey: string;
  metricLabel: string;
  currentValue: number | null;
  inputType?: 'number' | 'duration' | 'pace' | 'time';
  onSave: (metricKey: string, value: number) => void;
  onDelete: (metricKey: string) => void;
  onClose: () => void;
}

export default function GoalEditor({
  metricLabel,
  currentValue,
  inputType = 'number',
  onSave,
  onDelete,
  onClose,
  metricKey,
}: GoalEditorProps) {
  const [value, setValue] = useState(() => {
    if (currentValue === null) return '';
    if (inputType === 'number') return currentValue.toString();
    return formatTimeInput(currentValue, inputType);
  });

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    if (inputType !== 'time') {
      inputRef.current?.select();
    }
  }, [inputType]);

  const handleSave = () => {
    let numValue: number | null = null;

    if (inputType === 'number') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) numValue = parsed;
    } else {
      numValue = parseTimeInput(value, inputType);
    }

    // Allow 0 for time (midnight), but enforce positive for others?
    // Actually 0 goal might be valid for some things (e.g. 0 interruptions), but usually strict > 0 check was there.
    // For time, 0 is midnight.
    if (numValue !== null && (inputType === 'time' || numValue >= 0)) {
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

  const placeholder = inputType === 'pace' ? 'm:ss' : inputType === 'duration' ? 'h:mm:ss' : inputType === 'time' ? '--:--' : 'Target value';
  const renderInputType = inputType === 'time' ? 'time' : inputType === 'number' ? 'number' : 'text';

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
          type={renderInputType}
          step={inputType === 'number' ? "0.1" : undefined}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {inputType !== 'number' && inputType !== 'time' && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Format: {placeholder}
          </p>
        )}
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleSave}
            disabled={!value}
            className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save
          </button>
          {currentValue !== null && (
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
