import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";
const KEY = "markazly-theme";

/**
 * Runs before first paint (see __root.tsx) so a saved or system dark preference never flashes
 * light. With no saved choice, the operating-system preference decides.
 */
export const themeBootScript = `(function(){try{var t=localStorage.getItem("${KEY}");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d)}catch(e){}})();`;

const Ctx = createContext<{ theme: Theme; setTheme: (t: Theme) => void; toggle: () => void }>({
  theme: "light",
  setTheme: () => {},
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  // Hydrate from the class the boot script already applied, after mount, to avoid SSR mismatch.
  useEffect(() => {
    setThemeState(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);
  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    try { localStorage.setItem(KEY, next); } catch { /* Storage may be unavailable; the toggle still works for this tab. */ }
  }, []);
  const toggle = useCallback(() => setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark"), [setTheme]);
  return <Ctx.Provider value={{ theme, setTheme, toggle }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
