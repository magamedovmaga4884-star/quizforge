"use client";

import React, { useEffect, useState } from "react";
import { api, User } from "@/lib/api";
import { TeacherSidebar } from "@/components/TeacherSidebar";
import { formatDate } from "@/lib/utils";
import { UserCheck, Mail, Calendar, Shield } from "lucide-react";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const u = api.getCurrentUserFromStorage();
    setUser(u);
  }, []);

  return (
    <div className="flex-1 flex">
      <TeacherSidebar />
      <main className="flex-1 p-6 sm:p-8 max-w-4xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
            Профиль преподавателя
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Учетные данные преподавателя и кафедры
          </p>
        </div>

        {user && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl font-bold">
                {user.full_name.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{user.full_name}</h2>
                <div className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">
                  Преподаватель института
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div className="p-4 rounded-xl bg-slate-50 flex items-center space-x-3">
                <Mail className="w-5 h-5 text-slate-400" />
                <div>
                  <div className="text-xs text-slate-400">Электронная почта</div>
                  <div className="text-sm font-semibold text-slate-800">{user.email}</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 flex items-center space-x-3">
                <Shield className="w-5 h-5 text-slate-400" />
                <div>
                  <div className="text-xs text-slate-400">Роль в системе</div>
                  <div className="text-sm font-semibold text-slate-800">{user.role}</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-slate-400" />
                <div>
                  <div className="text-xs text-slate-400">Дата регистрации</div>
                  <div className="text-sm font-semibold text-slate-800">
                    {user.created_at ? formatDate(user.created_at) : "Сегодня"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
