export default function ThemeScript() {
  const code = `
    (function () {
      try {
        var stored = localStorage.getItem("bcs-theme");
        var theme = stored === "dark" || stored === "light"
          ? stored
          : "light";

        var root = document.documentElement;

        if (theme === "dark") {
          root.classList.add("dark");
        } else {
          root.classList.remove("dark");
        }

        root.setAttribute("data-theme", theme);
      } catch (e) {}
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
