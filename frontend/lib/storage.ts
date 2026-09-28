const THEME_KEY = "hs_theme";
const MODEL_KEY = "hs_active_model";
const PROVIDER_KEY = "hs_active_provider";

export type ThemeMode = "system" | "light" | "dark";

export function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // ignore localstorage errors
  }
  return "system";
}

export function resolveIsDark(theme?: ThemeMode): boolean {
  if (typeof window === "undefined") return false;
  const current = theme || getStoredTheme();
  if (current === "dark") return true;
  if (current === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(theme: ThemeMode): boolean {
  if (typeof window === "undefined") return false;
  const root = document.documentElement;
  const isDark = resolveIsDark(theme);

  if (isDark) {
    root.classList.add("dark");
    root.classList.remove("light");
    root.setAttribute("data-theme", "dark");
    root.style.colorScheme = "dark";
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
    root.setAttribute("data-theme", "light");
    root.style.colorScheme = "light";
  }

  // Notify all listening components in real-time
  try {
    window.dispatchEvent(
      new CustomEvent("voltix-theme-change", {
        detail: { theme, isDark },
      })
    );
  } catch {
    // ignore
  }

  return isDark;
}

export function setStoredTheme(theme: ThemeMode) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore
  }
  applyTheme(theme);
}

export function getStoredModel(): { model?: string; provider?: string } {
  if (typeof window === "undefined") return {};
  try {
    return {
      model: localStorage.getItem(MODEL_KEY) || undefined,
      provider: localStorage.getItem(PROVIDER_KEY) || undefined,
    };
  } catch {
    return {};
  }
}

export function setStoredModel(model: string, provider: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MODEL_KEY, model);
    localStorage.setItem(PROVIDER_KEY, provider);
  } catch {
    // ignore
  }
}
