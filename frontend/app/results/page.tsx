"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Test } from "@/types";
import { TeacherSidebar } from "@/components/TeacherSidebar";
import { useToast } from "@/components/Toast";
import { BarChart3, FileQuestion, Users, ArrowRight, Loader2 } from "lucide-react";

export default function ResultsHubPage() {
  const router = useRouter();
  const { error } = useToast();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    try {
      const data = await api.getTests();
      setTests(data);
    } catch (err: any) {
      error("Не удалось загрузить список тестов");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex">
      <TeacherSidebar />
      <main className="flex-1 p-6 sm:p-8 max-w-5xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
            Результаты тестирования
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Выберите проверочный тест для просмотра оценок и подробного разбора вопросов
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : tests.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center space-y-3">
            <FileQuestion className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="font-semibold text-slate-800">Тесты пока не созданы</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              После создания и проведения первого теста здесь появится статистика.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tests.map((test) => (
              <div
                key={test.id}
                className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                    {test.subject?.name || "Общий предмет"}
                  </span>
                  <h3 className="font-bold text-slate-900 text-base mt-1 leading-snug">
                    {test.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-2">
                    <span>{test.question_count} вопросов</span>
                    <span>•</span>
                    <span>{test.time_limit_minutes} мин.</span>
                    {test.room_code && (
                      <>
                        <span>•</span>
                        <span className="font-mono font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                          {test.room_code}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <Link
                  href={`/tests/${test.id}/results`}
                  className="w-full py-2.5 px-4 bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-medium text-xs rounded-xl transition-colors border border-slate-200 hover:border-indigo-200 flex items-center justify-between"
                >
                  <span className="flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-indigo-600" />
                    <span>Смотреть результаты</span>
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
