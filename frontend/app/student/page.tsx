"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, User } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { formatDate } from "@/lib/utils";
import {
  GraduationCap,
  ArrowRight,
  Clock,
  Award,
  CheckCircle2,
  FileQuestion,
  Loader2,
} from "lucide-react";

export default function StudentDashboardPage() {
  const router = useRouter();
  const { error, info } = useToast();

  const [user, setUser] = useState<User | null>(null);
  const [roomCode, setRoomCode] = useState("");
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = api.getCurrentUserFromStorage();
    if (!u) {
      router.push("/login");
      return;
    }
    setUser(u);
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await api.getMyAttempts();
      setAttempts(data);
    } catch {
      // Ignored if student has no attempts yet
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = roomCode.trim().toUpperCase();
    if (!cleanCode) {
      error("Пожалуйста, введите код комнаты");
      return;
    }
    router.push(`/test/${cleanCode}/lobby`);
  };

  return (
    <div className="flex-1 max-w-4xl mx-auto w-full p-6 sm:p-8 space-y-8">
      {/* Welcome Header */}
      <div className="text-center space-y-2 py-4">
        <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
          Привет, {user?.full_name || "Студент"}!
        </h1>
        <p className="text-sm text-slate-500">
          Введите код комнаты, предоставленный преподавателем, чтобы начать тестирование
        </p>
      </div>

      {/* Main Room Code Card */}
      <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-xl border border-slate-200/80 max-w-lg mx-auto text-center space-y-6">
        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
          <GraduationCap className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900">Ввести код теста</h2>
          <p className="text-xs text-slate-500 mt-1">
            Код состоит из 6 символов, например: A7K9P2
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <input
              type="text"
              required
              maxLength={10}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="A7K9P2"
              className="w-full text-center text-3xl font-mono font-extrabold tracking-widest uppercase py-4 border-2 border-slate-200 focus:border-indigo-600 rounded-2xl focus:outline-none transition-colors text-slate-900"
            />
          </div>

          <button
            type="submit"
            disabled={!roomCode.trim()}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold text-base rounded-2xl transition-all shadow-md shadow-indigo-100 flex items-center justify-center gap-2"
          >
            <span>Начать тест</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Completed Tests History */}
      <div className="space-y-4 pt-6">
        <h2 className="text-lg font-bold text-slate-900">Мои результаты тестирований</h2>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : attempts.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-200 text-center text-slate-500 text-sm">
            Вы пока не завершили ни одного теста.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {attempts.map((att) => (
              <div
                key={att.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between"
              >
                <div>
                  <div className="text-xs text-slate-400">
                    {att.started_at ? formatDate(att.started_at) : "Тест"}
                  </div>
                  <div className="text-base font-bold text-slate-900 mt-0.5">
                    Тест #{att.test_id}
                  </div>
                  <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <span>Баллы: <b>{att.score}/{att.total_points}</b></span>
                    <span>•</span>
                    <span className="font-semibold text-indigo-600">{att.percentage}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      att.percentage >= 70
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : att.percentage >= 40
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {att.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
