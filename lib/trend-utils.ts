
export type TrendPeriod = '7' | '30' | '90' | 'YTD';

export function getTrendPeriodLabel(period: TrendPeriod): string {
    if (period === 'YTD') return 'YTD';
    return `${period}d`;
}

export function formatTrendValue(diff: number, improved: boolean | null): { text: string; color: string } {
    if (diff === 0) return { text: '—', color: 'text-gray-400' };

    const sign = diff > 0 ? '+' : '';
    const text = `${sign}${diff.toFixed(1)}`;

    if (improved === null) return { text, color: 'text-gray-600 dark:text-gray-300' };

    return {
        text,
        color: improved ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
    };
}

export function getComparisonEntry<T>(
    entries: T[],
    period: TrendPeriod,
    dateAccessor: (entry: T) => string | Date
): T | null {
    if (entries.length < 2) return null;

    const now = new Date();
    const latestEntry = entries[0]; // Assuming sorted desc
    let cutoffDate: Date;

    if (period === 'YTD') {
        cutoffDate = new Date(now.getFullYear(), 0, 1);
    } else {
        const days = parseInt(period);
        cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }

    // Find entry closest to (but not after) cutoff
    for (let i = 1; i < entries.length; i++) {
        const d = new Date(dateAccessor(entries[i]));
        if (d <= cutoffDate) {
            return entries[i];
        }
    }

    // Fallback to oldest if none within period but not the latest
    return entries[entries.length - 1] !== latestEntry ? entries[entries.length - 1] : null;
}
