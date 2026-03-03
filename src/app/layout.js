import "./globals.css";

import ToastStack from "../components/ToastStack";

export const metadata = {
  title: "BCS Staff",
  description: "Business Control System - Staff Dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}

        {/* ✅ Global toasts (urgent alerts use this) */}
        <ToastStack />
      </body>
    </html>
  );
}
