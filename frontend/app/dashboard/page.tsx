"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { DashboardStats } from "@/types";
import { TeacherSidebar } from "@/components/TeacherSidebar";
import {
  FileQuestion,
  Users,
  CheckCircle2,
  Clock,
  PlusCircle,
  Copy,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/components/Toast";

export default function TeacherDashboardPage() {
  const router = useRouter();
  const { success, error } = useToast();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = api.getCurrentUserFromStorage();
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.role !== "TEACHER") {
      router.push("/student");
      return;
    }
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      error(err.message || "Не удалось загрузить статистику");
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    success(`Код комнаты ${code} скопирован в буфер обмена`);
  };

  const getDifficultyBadge = (d: string) => {
    switch (d) {
      case "EASY":
        return <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">Легкий</span>;
      case "HARD":
        return <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-rose-50 text-rose-700 border border-rose-100">Сложный</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-blue-50 text-blue-700 border border-blue-100">Средний</span>;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "PUBLISHED":
        return <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">Опубликован</span>;
      case "CLOSED":
        return <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-slate-100 text-slate-600 border border-slate-200">Закрыт</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-amber-50 text-amber-700 border border-amber-200">Черновик</span>;
    }
  };

  return (
    <div className="flex-1 flex">
      <TeacherSidebar />
      <main className="flex-1 p-6 sm:p-8 max-w-6xl mx-auto w-full space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
              Панель преподавателя
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Управление тестированием, вопросами и успеваемостью студентов
            </p>
          </div>
          <Link
            href="/tests/create"
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Создать новый тест</span>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <>
            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <FileQuestion className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{stats?.total_tests || 0}</div>
                  <div className="text-xs font-medium text-slate-500">Всего тестов</div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{stats?.active_tests || 0}</div>
                  <div className="text-xs font-medium text-slate-500">Активных тестов</div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{stats?.unique_students || 0}</div>
                  <div className="text-xs font-medium text-slate-500">Студентов</div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-violet-50 text-violet-600 rounded-xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{stats?.completed_attempts || 0}</div>
                  <div className="text-xs font-medium text-slate-500">Пройденных тестов</div>
                </div>
              </div>
            </div>

            {/* Recent Tests Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Последние тесты</h2>
                <Link
                  href="/tests"
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                >
                  Все тесты →
                </Link>
              </div>

              {stats?.recent_tests && stats.recent_tests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stats.recent_tests.map((test) => (
                    <div
                      key={test.id}
                      className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                            {test.subject_name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {getDifficultyBadge(test.difficulty)}
                            {getStatusBadge(test.status)}
                          </div>
                        </div>

                        <h3 className="font-bold text-slate-900 text-base leading-snug">
                          {test.title}
                        </h3>

                        <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
                          <span className="flex items-center gap-1">
                            <FileQuestion className="w-3.5 h-3.5" />
                            {test.question_count} вопр.
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {test.time_limit_minutes} мин.
                          </span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                        {test.room_code ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-slate-400">Код:</span>
                            <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-xs">
                              {test.room_code}
                            </span>
                            <button
                              onClick={() => copyCode(test.room_code!)}
                              title="Скопировать код"
                              className="text-slate-400 hover:text-slate-700 p-1"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Не опубликован</span>
                        )}

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/tests/${test.id}/edit`}
                            className="text-xs font-medium px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                          >
                            Редактор
                          </Link>
                          <Link
                            href={`/tests/${test.id}/results`}
                            className="text-xs font-medium px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors"
                          >
                            Результаты
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                    <FileQuestion className="w-6 h-6" />
                  </div>
                  <h3 className="font-semibold text-slate-800">У вас пока нет созданных тестов</h3>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto">
                    Создайте свой первый тест вручную или воспользуйтесь генерацией вопросов по учебным материалам через AI.
                  </p>
                  <Link
                    href="/tests/create"
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors mt-2"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Создать тест</span>
                  </Link>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
