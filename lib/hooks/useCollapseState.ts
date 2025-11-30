import { useState, useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Reusable hook for managing collapse/expand state with localStorage persistence
 *
 * Fixes hydration mismatch by reading localStorage only after mount.
 * This ensures server and client render the same initial HTML.
 *
 * Prevents visual flash during hot reload by using useLayoutEffect
 * to read localStorage synchronously before browser paint.
 *
 * @param storageKey - Unique key for localStorage
 * @param defaultValue - Default collapsed state (default: false)
 * @returns [isCollapsed, toggleCollapse, setIsCollapsed] - State and controls
 *
 * @example
 * const [isCollapsed, toggleCollapse] = useCollapseState('sidebar-collapsed');
 */
export function useCollapseState(
  storageKey: string,
  defaultValue: boolean = false
): [boolean, () => void, (value: boolean) => void] {
  // Always start with defaultValue to match server render (prevents hydration mismatch)
  const [isCollapsed, setIsCollapsed] = useState(defaultValue);
  const hasHydrated = useRef(false);

  // Read from localStorage synchronously before paint (prevents flash during hot reload)
  // useLayoutEffect runs synchronously after all DOM mutations but before browser paint
  // This ensures the state is set before the user sees the initial render
  useLayoutEffect(() => {
    if (typeof window !== 'undefined' && !hasHydrated.current) {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) {
        // Set state synchronously before paint to prevent visual flash
        setIsCollapsed(saved === 'true');
      }
      hasHydrated.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  // Persist state to localStorage (only after hydration to avoid unnecessary writes)
  useEffect(() => {
    if (hasHydrated.current && typeof window !== 'undefined') {
      localStorage.setItem(storageKey, String(isCollapsed));
    }
  }, [isCollapsed, storageKey]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  return [isCollapsed, toggleCollapse, setIsCollapsed];
}
