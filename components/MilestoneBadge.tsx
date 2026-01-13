import React from 'react';
import Tooltip from './Tooltip';
import { formatTimeAgo } from '@/lib/milestones';

interface MilestoneBadgeProps {
    type: 'pr' | '1st' | '2nd' | '3rd';
    date: string;
    details?: React.ReactNode;
}

export function MilestoneBadge({ type, date, details }: MilestoneBadgeProps) {
    let label = '';
    let bgColor = '';
    let textColor = '';

    switch (type) {
        case 'pr':
            label = 'PR';
            bgColor = 'bg-amber-100 dark:bg-amber-900/30';
            textColor = 'text-amber-700 dark:text-amber-400';
            break;
        case '1st':
            label = '🥇';
            bgColor = 'bg-yellow-100 dark:bg-yellow-900/30';
            textColor = 'text-yellow-700 dark:text-yellow-400';
            break;
        case '2nd':
            label = '🥈';
            bgColor = 'bg-gray-100 dark:bg-gray-800';
            textColor = 'text-gray-600 dark:text-gray-400';
            break;
        case '3rd':
            label = '🥉';
            bgColor = 'bg-orange-100 dark:bg-orange-900/30';
            textColor = 'text-orange-700 dark:text-orange-400';
            break;
    }

    return (
        <Tooltip
            content={
                <div className="flex flex-col gap-1 text-xs">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">
                        Achieved {formatTimeAgo(date)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                        {new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                    {details && (
                        <div className="mt-1 pt-1 border-t border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300">
                            {details}
                        </div>
                    )}
                </div>
            }
        >
            <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium cursor-help ${bgColor} ${textColor}`}
            >
                {label}
            </span>
        </Tooltip>
    );
}
