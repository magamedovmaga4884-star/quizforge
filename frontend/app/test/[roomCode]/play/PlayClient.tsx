"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { StudentAttemptPlay, StudentQuestion } from "@/types";
import { useToast } from "@/components/Toast";
import { formatTime } from "@/lib/utils";
import {
  Clock,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  GraduationCap,
} from "lucide-react";

export default function PlayClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomCode = ((params?.roomCode as string) || "").toUpperCase();
  const attemptId = searchParams?.get("attemptId") ? Number(searchParams.get("attemptId")) : null;
  const router = useRouter();
  const { error, info } = useToast();

  const [attempt, setAttempt] = useState<StudentAttemptPlay | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number[]>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!attemptId) {
      if (roomCode && roomCode !== "DEFAULT") {
        router.push(`/test/${roomCode}/lobby`);
      } else {
        setLoading(false);
      }
      return;
    }
    loadAttempt();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [attemptId]);

  const loadAttempt = async () => {
    try {
      const data = await api.getAttempt(attemptId!);
      if (data.status !== "IN_PROGRESS") {
        router.push(`/test/${roomCode}/result?attemptId=${data.id}`);
        return;
      }

      setAttempt(data);
      setSelectedAnswers(data.answers || {});
      setSecondsRemaining(data.remaining_seconds);

      // Start client timer tick
      startTimer(data.remaining_seconds);
    } catch (err: any) {
      error(err.message || "Не удалось загрузить тест");
      router.push("/student");
    } finally {
      setLoading(false);
    }
  };

  const startTimer = (initialSeconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current);

    let sec = initialSeconds;
    timerRef.current = setInterval(() => {
      sec -= 1;
      if (sec <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setSecondsRemaining(0);
        handleAutoSubmitOnTimeout();
      } else {
        setSecondsRemaining(sec);
      }
    }, 1000);
  };

  const handleAutoSubmitOnTimeout = async () => {
    info("Время вышло! Тест автоматически завершается...");
    try {
      await api.finishAttempt(attemptId!);
    } catch {
      // Backend automatically grades timed-out attempt
    }
    router.push(`/test/${roomCode}/result?attemptId=${attemptId}`);
  };

  const currentQuestion: StudentQuestion | undefined = attempt?.questions[currentIndex];

  const handleSelectAnswer = async (answerId: number) => {
    if (!currentQuestion) return;

    let newChosen: number[];
    if (
      currentQuestion.question_type === "SINGLE_CHOICE" ||
      currentQuestion.question_type === "TRUE_FALSE"
    ) {
      newChosen = [answerId];
    } else {
      // Multiple choice
      const current = selectedAnswers[currentQuestion.id] || [];
      if (current.includes(answerId)) {
        newChosen = current.filter((id) => id !== answerId);
      } else {
        newChosen = [...current, answerId];
      }
    }

    // Optimistically update local state
    const updatedMap = {
      ...selectedAnswers,
      [currentQuestion.id]: newChosen,
    };
    setSelectedAnswers(updatedMap);

    // Save to server asynchronously
    try {
      await api.saveAttemptAnswer(attemptId!, currentQuestion.id, newChosen);
    } catch (err: any) {
      if (err.message?.includes("Время") || err.message?.includes("завершен")) {
        router.push(`/test/${roomCode}/result?attemptId=${attemptId}`);
      }
    }
  };

  const handleFinish = async () => {
    setSubmitting(true);
    try {
      await api.finishAttempt(attemptId!);
      router.push(`/test/${roomCode}/result?attemptId=${attemptId}`);
    } catch (err: any) {
      error(err.message || "Ошибка при завершении теста");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!attempt || !currentQuestion) {
    return null;
  }

  const isLastQuestion = currentIndex === attempt.questions.length - 1;
  const currentChosenIds = selectedAnswers[currentQuestion.id] || [];

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header with Title, Stepper, and Timer */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
            {attempt.subject_name}
          </span>
          <h2 className="text-lg font-bold text-slate-900 leading-tight">
            {attempt.test_title}
          </h2>
          <div className="text-xs text-slate-400">
            Вопрос {currentIndex + 1} из {attempt.questions.length}
          </div>
        </div>

        {/* Server-Synchronized Timer Pill */}
        <div
          className={`px-4 py-2.5 rounded-2xl flex items-center space-x-2 font-mono font-bold text-base transition-colors self-start sm:self-auto border ${
            secondsRemaining < 120
              ? "bg-rose-50 text-rose-700 border-rose-200 animate-pulse"
              : secondsRemaining < 300
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-indigo-50 text-indigo-700 border-indigo-100"
          }`}
        >
          <Clock className="w-5 h-5 flex-shrink-0" />
          <span>{formatTime(secondsRemaining)}</span>
        </div>
      </div>

      {/* Question Progress Dots */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 px-1">
        {attempt.questions.map((q, idx) => {
          const isAnswered = (selectedAnswers[q.id]?.length || 0) > 0;
          const isCurrent = idx === currentIndex;

          return (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2.5 rounded-full transition-all flex-shrink-0 ${
                isCurrent
                  ? "w-8 bg-indigo-600"
                  : isAnswered
                  ? "w-4 bg-emerald-500"
                  : "w-2.5 bg-slate-200"
              }`}
              title={`Вопрос ${idx + 1}`}
            />
          );
        })}
      </div>

      {/* Active Question Box */}
      <div className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/80 shadow-md space-y-6 flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
            <span>ВОПРОС {currentIndex + 1}</span>
            <span>{currentQuestion.points} балл(а)</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-bold text-slate-900 leading-snug">
            {currentQuestion.text}
          </h3>

          <div className="text-xs text-slate-400">
            {currentQuestion.question_type === "MULTIPLE_CHOICE"
              ? "Выберите все подходящие варианты ответа"
              : "Выберите один правильный вариант"}
          </div>

          {/* Answers Options */}
          <div className="space-y-3 pt-2">
            {currentQuestion.answers.map((ans) => {
              const isSelected = currentChosenIds.includes(ans.id);

              return (
                <button
                  key={ans.id}
                  onClick={() => handleSelectAnswer(ans.id)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all flex items-center space-x-3.5 ${
                    isSelected
                      ? "border-indigo-600 bg-indigo-50/70 text-indigo-950 font-semibold shadow-xs"
                      : "border-slate-200/80 hover:border-slate-300 hover:bg-slate-50 text-slate-800"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center border transition-colors ${
                      isSelected
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                  <span className="text-base leading-relaxed flex-1">{ans.text}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Navigation Buttons */}
        <div className="flex items-center justify-between pt-8 border-t border-slate-100">
          <button
            type="button"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-30 rounded-xl transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Назад</span>
          </button>

          {isLastQuestion ? (
            <button
              type="button"
              onClick={() => setConfirmModalOpen(true)}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md transition-colors flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Завершить тест</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                setCurrentIndex((prev) => Math.min(attempt.questions.length - 1, prev + 1))
              }
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-sm transition-colors flex items-center gap-2"
            >
              <span>Далее</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Confirm Finish Modal */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-100 text-center space-y-5">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900">Завершить тестирование?</h3>
              <p className="text-sm text-slate-500 mt-1">
                Вы ответили на {Object.keys(selectedAnswers).length} из {attempt.questions.length} вопросов. После отправки изменить ответы будет нельзя.
              </p>
            </div>

            <div className="flex items-center justify-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200"
              >
                Вернуться к тесту
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmModalOpen(false);
                  handleFinish();
                }}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md"
              >
                {submitting ? "Проверка..." : "Подтвердить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
