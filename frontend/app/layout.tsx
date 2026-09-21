import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { ToastProvider } from "@/components/Toast";

export const metadata: Metadata = {
  title: "QuizForge - Образовательная система тестирования",
  description: "Система создания и проведения тестов для института с локальным AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <ToastProvider>
          <Navbar />
          <div className="flex-1 flex flex-col">{children}</div>
        </ToastProvider>
      </body>
    </html>
  );
}
