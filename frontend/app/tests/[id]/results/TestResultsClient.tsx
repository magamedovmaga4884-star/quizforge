"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { TeacherTestResults, TestStatistics } from "@/types";
import { TeacherSidebar } from "@/components/TeacherSidebar";
import { useToast } from "@/components/Toast";
import { formatTime, formatDate } from "@/lib/utils";
import {
  Users,
  Award,
  BarChart3,
  CheckCircle2,
  XCircle,
  Loader2,
  ArrowLeft,
  Calendar,
  Clock,
} from "lucide-react";

export default function TestResultsClient() {
  const params = useParams();
  const testId = params?.id && !isNaN(Number(params.id)) ? Number(params.id) : null;
  const { error } = useToast();

  const [results, setResults] = useState<TeacherTestResults | null>(null);
  const [stats, setStats] = useState<TestStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"students" | "questions">("students");

  useEffect(() => {
    if (testId) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [testId]);

  const loadData = async () => {
    if (!testId) return;
    try {
      const [resData, statData] = await Promise.all([
        api.getTestResults(testId!),
        api.getTestStatistics(testId!),
      ]);
      setResults(resData);
      setStats(statData);
    } catch (err: any) {
      error(err.message || "Не удалось загрузить результаты теста");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex">
      <TeacherSidebar />
      <main className="flex-1 p-6 sm:p-8 max-w-5xl mx-auto w-full space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/tests"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Назад ко всем тестам</span>
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : !results ? (
          <div className="text-center py-20">Результаты не найдены</div>
        ) : (
          <>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
                Результаты: {results.test_title}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Статистика прохождения теста студентами и точность ответов на вопросы
              </p>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{results.total_attempts}</div>
                  <div className="text-xs font-medium text-slate-500">Количество попыток</div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{results.average_percentage}%</div>
                  <div className="text-xs font-medium text-slate-500">Средний результат</div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center space-x-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-slate-900">{results.highest_score} баллов</div>
                  <div className="text-xs font-medium text-slate-500">Лучший результат</div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 space-x-6">
              <button
                onClick={() => setActiveTab("students")}
                className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === "students"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Студенты ({results.attempts.length})</span>
              </button>

              <button
                onClick={() => setActiveTab("questions")}
                className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === "questions"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Статистика вопросов ({stats?.questions.length || 0})</span>
              </button>
            </div>

            {/* TAB 1: Students Attempts Table */}
            {activeTab === "students" && (
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
                {results.attempts.length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    Пока никто из студентов не завершил этот тест.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          <th className="py-3.5 px-6">Студент</th>
                          <th className="py-3.5 px-6">Результат</th>
                          <th className="py-3.5 px-6">Процент</th>
                          <th className="py-3.5 px-6">Время</th>
                          <th className="py-3.5 px-6">Дата сдачи</th>
                          <th className="py-3.5 px-6">Статус</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {results.attempts.map((att) => (
                          <tr key={att.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-4 px-6">
                              <div className="font-semibold text-slate-900">{att.student_name}</div>
                              <div className="text-xs text-slate-400">{att.student_email}</div>
                            </td>
                            <td className="py-4 px-6 font-mono font-medium text-slate-900">
                              {att.score} / {att.total_points}
                            </td>
                            <td className="py-4 px-6">
                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                  att.percentage >= 70
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : att.percentage >= 40
                                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                                    : "bg-rose-50 text-rose-700 border border-rose-200"
                                }`}
                              >
                                {att.percentage}%
                              </span>
                            </td>
                            <td className="py-4 px-6 font-mono text-slate-600 text-xs">
                              {att.duration_seconds !== null && att.duration_seconds !== undefined
                                ? formatTime(att.duration_seconds)
                                : "—"}
                            </td>
                            <td className="py-4 px-6 text-xs text-slate-500">
                              {att.finished_at ? formatDate(att.finished_at) : formatDate(att.started_at)}
                            </td>
                            <td className="py-4 px-6">
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  att.status === "COMPLETED"
                                    ? "bg-slate-100 text-slate-700"
                                    : "bg-rose-50 text-rose-700"
                                }`}
                              >
                                {att.status === "COMPLETED" ? "Сдан" : "Истекло время"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: Question Statistics Breakdown */}
            {activeTab === "questions" && (
              <div className="space-y-4">
                {(!stats?.questions || stats.questions.length === 0) ? (
                  <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-500">
                    Нет данных для статистики.
                  </div>
                ) : (
                  stats.questions.map((q, idx) => (
                    <div
                      key={q.question_id}
                      className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start space-x-3">
                          <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div>
                            <h3 className="text-sm font-semibold text-slate-900 leading-snug">
                              {q.question_text}
                            </h3>
                            <div className="text-xs text-slate-400 mt-1">
                              Всего ответов: {q.total_answers}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-semibold">
                          <span className="text-emerald-700 flex items-center gap-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            {q.correct_percentage}% ({q.correct_count})
                          </span>
                          <span className="text-rose-700 flex items-center gap-1">
                            <XCircle className="w-4 h-4 text-rose-600" />
                            {q.incorrect_percentage}% ({q.incorrect_count})
                          </span>
                        </div>
                      </div>

                      {/* Visual Accuracy Bar */}
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
                        <div
                          style={{ width: `${q.correct_percentage}%` }}
                          className="bg-emerald-500 h-full transition-all duration-500"
                        />
                        <div
                          style={{ width: `${q.incorrect_percentage}%` }}
                          className="bg-rose-400 h-full transition-all duration-500"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
