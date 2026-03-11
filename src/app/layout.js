import "./globals.css";

import ThemeScript from "../components/ThemeScript";
import ToastStack from "../components/ToastStack";

export const metadata = {
  title: "BCS Staff",
  description: "Business Control System - Staff Workspace",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen antialiased">
        <div className="min-h-screen bg-[var(--app-bg)] text-[var(--app-fg)] transition-colors duration-200">
          {children}
          <ToastStack />
        </div>
      </body>
    </html>
  );
}
