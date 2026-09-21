"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileQuestion,
  PlusCircle,
  BarChart3,
  BookOpen,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Мои тесты", href: "/tests", icon: FileQuestion },
  { label: "Создать тест", href: "/tests/create", icon: PlusCircle },
  { label: "Результаты", href: "/results", icon: BarChart3 },
  { label: "Предметы", href: "/subjects", icon: BookOpen },
  { label: "Профиль", href: "/profile", icon: UserCheck },
];

export function TeacherSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 hidden md:block min-h-[calc(100vh-4rem)] p-4">
      <div className="space-y-1">
        <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
          Навигация
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-indigo-50 text-indigo-700 font-semibold shadow-sm"
                  : "text-gray-600 hover:text-gray-950 hover:bg-gray-50"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-indigo-600" : "text-gray-400 group-hover:text-gray-600"
                )}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100/60">
        <h4 className="text-xs font-bold text-indigo-900 mb-1">QuizForge AI</h4>
        <p className="text-xs text-indigo-700/80 leading-relaxed">
          Создавайте тесты за секунды с помощью локальной LLM через Ollama.
        </p>
      </div>
    </aside>
  );
}
