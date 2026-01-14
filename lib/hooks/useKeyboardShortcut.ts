'use client';

import { useEffect } from 'react';

type KeyCombination = {
    key: string;
    meta?: boolean;
    shift?: boolean;
    alt?: boolean;
    ctrl?: boolean;
};

export function useKeyboardShortcut(combination: KeyCombination, callback: () => void) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const { key, metaKey, shiftKey, altKey, ctrlKey } = event;

            // Normalize key for comparison (handles caps lock by using value if it's a letter)
            // KeyboardEvent.key is usually the character, so 'l' or 'L'.
            // For 'cmd+shift+l', we should check for 'l' or 'L'.
            const targetKey = combination.key.toLowerCase();
            const pressedKey = key.toLowerCase();

            const match =
                pressedKey === targetKey &&
                !!combination.meta === metaKey &&
                !!combination.shift === shiftKey &&
                !!combination.alt === altKey &&
                !!combination.ctrl === ctrlKey;

            if (match) {
                event.preventDefault();
                callback();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [combination, callback]);
}
