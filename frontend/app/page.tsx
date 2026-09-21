"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, User } from "@/lib/api";
import { GraduationCap, ArrowRight, ShieldCheck, Sparkles, Clock, CheckCircle } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const currentUser = api.getCurrentUserFromStorage();
    setUser(currentUser);
  }, []);

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;
    router.push(`/test/${roomCode.trim().toUpperCase()}/lobby`);
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-4xl w-full text-center space-y-8">
        {/* Badge */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-medium">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>Локальная система тестирования для института</span>
        </div>

        {/* Heading */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-950 tracking-tight leading-tight">
            Тестирование студентов <br />
            <span className="text-indigo-600">просто, быстро и надёжно</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-600">
            QuizForge объединяет простое создание тестов, интеллектуальную генерацию вопросов через локальный Ollama и честное проведение экзаменов.
          </p>
        </div>

        {/* Quick Room Code Input Card */}
        <div className="max-w-md mx-auto bg-white p-6 rounded-2xl shadow-xl border border-slate-200/80">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3 text-left">
            Студенту: вход по коду комнаты
          </h2>
          <form onSubmit={handleJoinByCode} className="flex gap-2">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="Например: A7K9P2"
              maxLength={10}
              className="flex-1 px-4 py-3 text-lg font-mono font-bold tracking-wider uppercase border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-900"
            />
            <button
              type="submit"
              disabled={!roomCode.trim()}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors shadow-sm flex items-center gap-1.5"
            >
              <span>Войти</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap justify-center gap-4 pt-4">
          {user ? (
            <Link
              href={user.role === "TEACHER" ? "/dashboard" : "/student"}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-colors shadow-sm flex items-center gap-2"
            >
              <span>Перейти в кабинет ({user.role === "TEACHER" ? "Преподаватель" : "Студент"})</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors shadow-sm flex items-center gap-2"
              >
                <span>Войти в аккаунт</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/register"
                className="px-6 py-3 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-medium rounded-xl transition-colors shadow-sm"
              >
                Регистрация
              </Link>
            </>
          )}
        </div>

        {/* Feature Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 text-left">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start space-x-3.5">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Локальный AI (Ollama)</h3>
              <p className="text-xs text-slate-500 mt-1">
                Генерация тестовых заданий из методических документов PDF/Word без платных API.
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start space-x-3.5">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Серверный таймер</h3>
              <p className="text-xs text-slate-500 mt-1">
                Точный контроль времени на стороне сервера исключает накрутку через браузер.
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-start space-x-3.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Мгновенные результаты</h3>
              <p className="text-xs text-slate-500 mt-1">
                Автоматическая проверка ответов и детальная аналитика вопросов для преподавателя.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
