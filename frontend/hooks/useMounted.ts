"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * React 18/19 safe hook to detect client-side mounting without triggering
 * hydration mismatches or eslint react-hooks/set-state-in-effect errors.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
