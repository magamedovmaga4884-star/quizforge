"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, api } from "@/lib/api";
import { GraduationCap, LogOut, User as UserIcon, BookOpen } from "lucide-react";

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setUser(api.getCurrentUserFromStorage());
  }, [pathname]);

  const handleLogout = () => {
    api.logout();
  };

  // Do not show full navbar on play screen to minimize distractions
  if (pathname.includes("/play")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link href={user ? (user.role === "TEACHER" ? "/dashboard" : "/student") : "/"} className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-xl tracking-tight text-gray-950">QuizForge</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
                Институт
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-3">
              <div className="flex flex-col text-right hidden sm:flex">
                <span className="text-sm font-semibold text-gray-900 leading-tight">
                  {user.full_name}
                </span>
                <span className="text-xs text-gray-500">
                  {user.role === "TEACHER" ? "Преподаватель" : "Студент"}
                </span>
              </div>
              <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                <UserIcon className="w-4 h-4" />
              </div>
              <button
                onClick={handleLogout}
                title="Выйти из системы"
                className="p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-950 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Вход
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm shadow-indigo-100"
              >
                Регистрация
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
