"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { AttemptFinishResult } from "@/types";
import { formatTime } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Award,
  Clock,
  ArrowRight,
  Loader2,
  GraduationCap,
  Sparkles,
} from "lucide-react";

export default function ResultClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const attemptId = searchParams?.get("attemptId") ? Number(searchParams.get("attemptId")) : null;
  const router = useRouter();

  const [result, setResult] = useState<AttemptFinishResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!attemptId) {
      setLoading(false);
      return;
    }
    loadResult();
  }, [attemptId]);

  const loadResult = async () => {
    try {
      const data = await api.finishAttempt(attemptId!);
      setResult(data);
    } catch {
      router.push("/student");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-slate-500">Результат не найден</p>
          <Link href="/student" className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold">
            Вернуться в кабинет студента
          </Link>
        </div>
      </div>
    );
  }

  const incorrectCount = result.total_questions - result.correct_count;
  const isPassed = result.percentage >= 60;

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-200/80 text-center space-y-6">
        {/* Top Badge & Icon */}
        <div
          className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto shadow-md ${
            isPassed ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
          }`}
        >
          {isPassed ? <Award className="w-9 h-9" /> : <CheckCircle2 className="w-9 h-9" />}
        </div>

        <div>
          <span className="text-xs font-semibold px-3 py-1 bg-slate-100 rounded-full text-slate-600 uppercase tracking-wider">
            {result.status === "TIMED_OUT" ? "Время вышло" : "Тест завершён"}
          </span>
          <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight mt-3">
            {result.score} / {result.total_points}
          </h1>
          <div className="text-sm font-semibold text-indigo-600 mt-1">
            {result.percentage}% правильных ответов
          </div>
        </div>

        {/* Breakdown Card */}
        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-left">
            <div className="text-xs text-emerald-700 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Правильных</span>
            </div>
            <div className="text-xl font-bold text-emerald-950 mt-1">
              {result.correct_count}
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-100 text-left">
            <div className="text-xs text-rose-700 font-medium flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" />
              <span>Неправильных</span>
            </div>
            <div className="text-xl font-bold text-rose-950 mt-1">
              {incorrectCount}
            </div>
          </div>
        </div>

        {/* Time spent */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <Clock className="w-4 h-4" />
          <span>Затраченное время: {formatTime(result.duration_seconds)}</span>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 font-medium">
          Результат сохранён в базе данных института.
        </div>

        <Link
          href="/student"
          className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2"
        >
          <span>Вернуться на главную</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
