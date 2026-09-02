// Keep al-folio's theme switcher to two explicit modes: light and dark.
// Existing visitors who previously selected "system" start from their currently
// computed color scheme, then stay on an explicit mode after the first load.
if (typeof determineThemeSetting === "function" && typeof setThemeSetting === "function") {
  if (determineThemeSetting() === "system") {
    setThemeSetting(determineComputedTheme());
  }

  toggleThemeSetting = () => {
    const nextTheme = determineComputedTheme() === "dark" ? "light" : "dark";
    setThemeSetting(nextTheme);
  };
}
