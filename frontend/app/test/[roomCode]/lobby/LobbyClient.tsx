"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { RoomJoinInfo } from "@/types";
import { useToast } from "@/components/Toast";
import {
  BookOpen,
  Clock,
  FileQuestion,
  GraduationCap,
  ArrowRight,
  Loader2,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

export default function LobbyClient() {
  const params = useParams();
  const roomCode = ((params?.roomCode as string) || "").toUpperCase();
  const router = useRouter();
  const { error } = useToast();

  const [testInfo, setTestInfo] = useState<RoomJoinInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    // Check auth
    const user = api.getCurrentUserFromStorage();
    if (!user) {
      router.push("/login");
      return;
    }
    if (roomCode && roomCode !== "DEFAULT") {
      loadTestInfo();
    } else {
      setLoading(false);
    }
  }, [roomCode]);

  const loadTestInfo = async () => {
    try {
      const data = await api.joinRoom(roomCode);
      setTestInfo(data);
    } catch (err: any) {
      error(err.message || "Не удалось найти тест по этому коду");
      router.push("/student");
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!testInfo) return;
    setStarting(true);
    try {
      const attempt = await api.startAttempt(testInfo.test_id);
      router.push(`/test/${roomCode}/play?attemptId=${attempt.id}`);
    } catch (err: any) {
      error(err.message || "Не удалось начать тест");
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!testInfo) {
    return null;
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-lg w-full bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-200/80 space-y-6">
        <div className="text-center space-y-2">
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold uppercase tracking-wider">
            {testInfo.subject_name}
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight leading-tight mt-2">
            {testInfo.title}
          </h1>
          {testInfo.description && (
            <p className="text-sm text-slate-500 max-w-sm mx-auto">{testInfo.description}</p>
          )}
        </div>

        {/* Test Parameters Grid */}
        <div className="grid grid-cols-2 gap-4 py-3">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
              <FileQuestion className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Вопросов</div>
              <div className="text-base font-bold text-slate-800">
                {testInfo.question_count}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-slate-400">Время</div>
              <div className="text-base font-bold text-slate-800">
                {testInfo.time_limit_minutes} мин.
              </div>
            </div>
          </div>
        </div>

        {/* Rules Box */}
        <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-950 space-y-1.5">
          <div className="font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <span>Правила прохождения:</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-indigo-900/80">
            <li>Таймер запускается сразу после нажатия кнопки "Начать".</li>
            <li>При истечении времени тест завершится автоматически.</li>
            <li>Ответы сохраняются при каждом переходе между вопросами.</li>
            <li>Повторная сдача теста запрещена.</li>
          </ul>
        </div>

        <button
          onClick={handleStart}
          disabled={starting}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-base rounded-2xl transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2"
        >
          {starting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Запуск теста...</span>
            </>
          ) : (
            <>
              <span>Начать прохождение</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
