import { useState, useEffect } from 'react';

/**
 * Reusable hook for managing collapse/expand state with localStorage persistence
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
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(storageKey);
      return saved !== null ? saved === 'true' : defaultValue;
    }
    return defaultValue;
  });

  // Persist state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, String(isCollapsed));
    }
  }, [isCollapsed, storageKey]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev);
  };

  return [isCollapsed, toggleCollapse, setIsCollapsed];
}
