"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  ThemeMode,
  getStoredTheme,
  setStoredTheme,
  resolveIsDark,
  applyTheme,
} from "@/lib/storage";

function subscribeTheme(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const handleVoltixTheme = () => callback();
  const handleStorage = (e: StorageEvent) => {
    if (e.key === "hs_theme") {
      applyTheme(getStoredTheme());
      callback();
    }
  };
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleMedia = () => {
    if (getStoredTheme() === "system") {
      applyTheme("system");
      callback();
    }
  };

  window.addEventListener("voltix-theme-change", handleVoltixTheme);
  window.addEventListener("storage", handleStorage);
  mediaQuery.addEventListener("change", handleMedia);

  return () => {
    window.removeEventListener("voltix-theme-change", handleVoltixTheme);
    window.removeEventListener("storage", handleStorage);
    mediaQuery.removeEventListener("change", handleMedia);
  };
}

export function useTheme() {
  const theme = useSyncExternalStore(
    subscribeTheme,
    () => getStoredTheme(),
    () => "system" as ThemeMode
  );

  const isDark = useSyncExternalStore(
    subscribeTheme,
    () => resolveIsDark(),
    () => false
  );

  const changeTheme = useCallback((newTheme: ThemeMode) => {
    setStoredTheme(newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    const currentIsDark = resolveIsDark();
    const next: ThemeMode = currentIsDark ? "light" : "dark";
    setStoredTheme(next);
    return next;
  }, []);

  return {
    theme,
    isDark,
    setTheme: changeTheme,
    toggleTheme,
    mounted: true,
  };
}
