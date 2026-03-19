export default function ThemeScript() {
  const code = `
    (function () {
      try {
        var STORAGE_KEY = "bcs-theme";
        var stored = localStorage.getItem(STORAGE_KEY);

        var prefersDark =
          typeof window.matchMedia === "function" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches;

        var theme =
          stored === "dark" || stored === "light"
            ? stored
            : (prefersDark ? "dark" : "light");

        var root = document.documentElement;

        root.classList.toggle("dark", theme === "dark");
        root.setAttribute("data-theme", theme);
      } catch (e) {}
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
