'use client';

import { useKeyboardShortcut } from '@/lib/hooks/useKeyboardShortcut';
import { toggleTheme } from '@/components/ThemeToggle';
import { useMemo } from 'react';

export default function KeyboardShortcuts() {
    // Use useMemo for the combination object to keep it stable
    const themeShortcut = useMemo(() => ({ key: 'l', meta: true, shift: true }), []);

    useKeyboardShortcut(themeShortcut, () => {
        toggleTheme();
    });

    return null;
}
