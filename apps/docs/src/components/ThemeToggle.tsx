import { useSyncExternalStore } from "react";
import { MoonIcon, SunIcon } from "./icons";

/**
 * Light/dark toggle for the docs shell: one sun/moon button. The icon
 * shows the theme in effect; the accessible name states it and the
 * theme a press switches to.
 *
 * System preference is implicit, not a choice in the UI:
 *
 *   - with nothing persisted, no `data-theme` attribute is set, so the
 *     package's `prefers-color-scheme` fallback scope governs and the page
 *     follows live system changes; the button tracks the same media query;
 *   - a press pins the opposite of the theme in effect as an explicit
 *     `[data-theme="light"|"dark"]` on `<html>` and persists it.
 *
 * Honors the `@augurproject/design-system` theme contract exactly
 * (`packages/design-system/src/styles/theme.css`); this control only ever
 * writes to `<html>`.
 *
 * The override persists in localStorage under "augur-theme". A tiny inline
 * script in `BaseLayout.astro` re-applies it before first paint. The
 * effective theme is read through `useSyncExternalStore`, so the server
 * render and first client render agree (no hydration mismatch) and the
 * button syncs from storage and the media query after hydration without
 * an effect-driven render pass.
 */

type Theme = "light" | "dark";

const STORAGE_KEY = "augur-theme";
const CHANGE_EVENT = "augur-theme-change";
const DARK_QUERY = "(prefers-color-scheme: dark)";

const LABELS: Record<Theme, string> = { light: "Light", dark: "Dark" };

function subscribe(onStoreChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY);
  // Cross-tab synchronization: another tab writing the override applies it here.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    const stored = event.key === null ? null : event.newValue;
    if (stored === "light" || stored === "dark") {
      document.documentElement.dataset.theme = stored;
    } else {
      delete document.documentElement.dataset.theme;
    }
    onStoreChange();
  };
  window.addEventListener(CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStorage);
  // Implicit mode: a system theme change re-syncs the button.
  media.addEventListener("change", onStoreChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStorage);
    media.removeEventListener("change", onStoreChange);
  };
}

/** The applied override on `<html>` (set pre-paint from storage), else the system theme. */
function readTheme(): Theme {
  const applied = document.documentElement.dataset.theme;
  if (applied === "light" || applied === "dark") return applied;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

function getServerTheme(): Theme {
  return "light";
}

export function ThemeToggle({ showName = false }: { showName?: boolean }) {
  const theme = useSyncExternalStore(subscribe, readTheme, getServerTheme);
  const next: Theme = theme === "dark" ? "light" : "dark";
  const label = `Theme: ${LABELS[theme]}. Switch to ${LABELS[next]}`;
  const Icon = theme === "dark" ? MoonIcon : SunIcon;

  const toggle = () => {
    document.documentElement.dataset.theme = next;
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable (e.g. restrictive settings): the override still
      // applies for this page view; persistence is best-effort.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return (
    <button
      type="button"
      className="theme-toggle"
      data-theme-choice={theme}
      aria-label={label}
      title={label}
      onClick={toggle}
    >
      <Icon size={18} />
      {showName && (
        // The docs mobile sheet (issue #2) spells the theme out beside the
        // icon; the accessible name already states it, so this is visual only.
        <span className="theme-toggle-name" aria-hidden="true">
          {LABELS[theme]}
        </span>
      )}
    </button>
  );
}

/** Astro islands consume the default export. */
export default ThemeToggle;
