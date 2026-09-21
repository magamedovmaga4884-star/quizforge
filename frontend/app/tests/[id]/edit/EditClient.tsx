"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { Test, Question, QuestionType, Answer, TestDifficulty } from "@/types";
import { TeacherSidebar } from "@/components/TeacherSidebar";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useToast } from "@/components/Toast";
import {
  PlusCircle,
  Trash2,
  Edit2,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Copy,
  Share2,
  Loader2,
  Save,
  Clock,
  Sparkles,
  FileQuestion,
  X,
  Plus,
} from "lucide-react";

export default function EditClient() {
  const params = useParams();
  const testId = params?.id && !isNaN(Number(params.id)) ? Number(params.id) : null;
  const router = useRouter();
  const { success, error, info } = useToast();

  const [test, setTest] = useState<Test | null>(null);
  const [loading, setLoading] = useState(true);

  // Question Form Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<number | null>(null);
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<QuestionType>("SINGLE_CHOICE");
  const [points, setPoints] = useState<number>(1);
  const [answers, setAnswers] = useState<{ id?: number; text: string; is_correct: boolean }[]>([
    { text: "", is_correct: true },
    { text: "", is_correct: false },
    { text: "", is_correct: false },
    { text: "", is_correct: false },
  ]);

  // Delete question modal
  const [deleteQModalOpen, setDeleteQModalOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);

  // Publish Modal Code
  const [publishedCode, setPublishedCode] = useState<string | null>(null);

  useEffect(() => {
    if (testId) {
      loadTest();
    } else {
      setLoading(false);
    }
  }, [testId]);

  const loadTest = async () => {
    if (!testId) return;
    try {
      const data = await api.getTest(testId);
      setTest(data);
    } catch (err: any) {
      error(err.message || "Не удалось загрузить тест");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingQuestionId(null);
    setQuestionText("");
    setQuestionType("SINGLE_CHOICE");
    setPoints(1);
    setAnswers([
      { text: "", is_correct: true },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
      { text: "", is_correct: false },
    ]);
    setModalOpen(true);
  };

  const handleOpenEditModal = (q: Question) => {
    setEditingQuestionId(q.id);
    setQuestionText(q.text);
    setQuestionType(q.question_type);
    setPoints(q.points);
    setAnswers(
      q.answers.map((a) => ({
        id: a.id,
        text: a.text,
        is_correct: a.is_correct,
      }))
    );
    setModalOpen(true);
  };

  const handleAddAnswerOption = () => {
    setAnswers((prev) => [...prev, { text: "", is_correct: false }]);
  };

  const handleRemoveAnswerOption = (idx: number) => {
    if (answers.length <= 2) {
      error("Вопрос должен содержать как минимум 2 варианта ответа");
      return;
    }
    setAnswers((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAnswerTextChange = (idx: number, text: string) => {
    setAnswers((prev) =>
      prev.map((a, i) => (i === idx ? { ...a, text } : a))
    );
  };

  const handleToggleCorrect = (idx: number) => {
    if (questionType === "SINGLE_CHOICE" || questionType === "TRUE_FALSE") {
      // Only one correct allowed
      setAnswers((prev) =>
        prev.map((a, i) => ({
          ...a,
          is_correct: i === idx,
        }))
      );
    } else {
      // Multiple choice
      setAnswers((prev) =>
        prev.map((a, i) => (i === idx ? { ...a, is_correct: !a.is_correct } : a))
      );
    }
  };

  const handleSaveQuestion = async () => {
    if (!questionText.trim()) {
      error("Введите текст вопроса");
      return;
    }

    // Validate answers
    const emptyOption = answers.some((a) => !a.text.trim());
    if (emptyOption) {
      error("Заполните текст всех вариантов ответа");
      return;
    }

    const hasCorrect = answers.some((a) => a.is_correct);
    if (!hasCorrect) {
      error("Отметьте хотя бы один правильный вариант ответа");
      return;
    }

    try {
      if (editingQuestionId) {
        // Update question
        await api.updateQuestion(editingQuestionId, {
          text: questionText.trim(),
          question_type: questionType,
          points,
          answers: answers.map((a) => ({
            id: a.id,
            text: a.text.trim(),
            is_correct: a.is_correct,
          })),
        });
        success("Вопрос обновлен");
      } else {
        // Create question
        await api.addQuestion(testId!, {
          text: questionText.trim(),
          question_type: questionType,
          difficulty: test?.difficulty || "MEDIUM",
          points,
          answers: answers.map((a) => ({
            text: a.text.trim(),
            is_correct: a.is_correct,
          })),
        });
        success("Вопрос добавлен в тест");
      }

      setModalOpen(false);
      loadTest();
    } catch (err: any) {
      error(err.message || "Ошибка сохранения вопроса");
    }
  };

  const handleDeleteQuestion = async () => {
    if (!questionToDelete) return;
    try {
      await api.deleteQuestion(questionToDelete.id);
      success("Вопрос удален");
      setDeleteQModalOpen(false);
      setQuestionToDelete(null);
      loadTest();
    } catch (err: any) {
      error(err.message || "Не удалось удалить вопрос");
    }
  };

  const handleMoveQuestion = async (index: number, direction: "up" | "down") => {
    if (!test || !test.questions || !testId) return;
    const questions = [...test.questions];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= questions.length) return;

    // Swap
    const temp = questions[index];
    questions[index] = questions[targetIndex];
    questions[targetIndex] = temp;

    const ids = questions.map((q) => q.id);
    try {
      await api.reorderQuestions(testId, ids);
      loadTest();
    } catch (err: any) {
      error("Не удалось изменить порядок вопросов");
    }
  };

  const handlePublish = async () => {
    if (!test || (test.questions?.length || 0) === 0 || !testId) {
      error("Добавьте хотя бы один вопрос перед публикацией");
      return;
    }
    try {
      const updated = await api.publishTest(testId);
      setTest(updated);
      setPublishedCode(updated.room_code || null);
      success("Тест успешно опубликован!");
    } catch (err: any) {
      error(err.message || "Не удалось опубликовать тест");
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    success(`Код комнаты ${code} скопирован в буфер обмена`);
  };

  return (
    <div className="flex-1 flex">
      <TeacherSidebar />
      <main className="flex-1 p-6 sm:p-8 max-w-5xl mx-auto w-full space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : !test ? (
          <div className="text-center py-20">Тест не найден</div>
        ) : (
          <>
            {/* Header with Title and Actions */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                      {test.subject?.name || "Без предмета"}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-md border ${
                        test.status === "PUBLISHED"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {test.status === "PUBLISHED" ? "Опубликован" : "Черновик"}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
                    {test.title}
                  </h1>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenAddModal}
                    className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Добавить вопрос</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePublish}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Опубликовать тест</span>
                  </button>
                </div>
              </div>

              {test.description && (
                <p className="text-sm text-slate-600 leading-relaxed pt-1">
                  {test.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
                <span>Вопросов: <b>{test.questions?.length || 0}</b></span>
                <span>•</span>
                <span>Время: <b>{test.time_limit_minutes} мин.</b></span>
                <span>•</span>
                <span>Сложность: <b>{test.difficulty}</b></span>
                {test.room_code && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1.5">
                      Код комнаты:
                      <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        {test.room_code}
                      </span>
                      <button
                        onClick={() => copyCode(test.room_code!)}
                        title="Скопировать код"
                        className="text-slate-400 hover:text-indigo-600"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">
                  Список заданий ({test.questions?.length || 0})
                </h2>
                <button
                  onClick={handleOpenAddModal}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Добавить вопрос</span>
                </button>
              </div>

              {(!test.questions || test.questions.length === 0) ? (
                <div className="bg-white p-12 rounded-3xl border border-dashed border-slate-200 text-center space-y-3">
                  <FileQuestion className="w-10 h-10 text-slate-400 mx-auto" />
                  <h3 className="font-semibold text-slate-800">В этом тесте пока нет вопросов</h3>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto">
                    Нажмите кнопку ниже, чтобы добавить первый вопрос вручную.
                  </p>
                  <button
                    onClick={handleOpenAddModal}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors mt-2"
                  >
                    Добавить вопрос
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {test.questions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start space-x-3">
                          <span className="w-7 h-7 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div>
                            <h3 className="text-base font-semibold text-slate-900 leading-snug">
                              {q.text}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                              <span>
                                {q.question_type === "SINGLE_CHOICE"
                                  ? "Один правильный"
                                  : q.question_type === "MULTIPLE_CHOICE"
                                  ? "Несколько правильных"
                                  : "Да / Нет"}
                              </span>
                              <span>•</span>
                              <span>{q.points} балл(а)</span>
                            </div>
                          </div>
                        </div>

                        {/* Order & Edit buttons */}
                        <div className="flex items-center space-x-1">
                          <button
                            disabled={idx === 0}
                            onClick={() => handleMoveQuestion(idx, "up")}
                            title="Переместить вверх"
                            className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </button>
                          <button
                            disabled={idx === test.questions!.length - 1}
                            onClick={() => handleMoveQuestion(idx, "down")}
                            title="Переместить вниз"
                            className="p-1.5 text-slate-400 hover:text-slate-700 disabled:opacity-30 rounded-lg hover:bg-slate-100"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(q)}
                            title="Редактировать"
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setQuestionToDelete(q);
                              setDeleteQModalOpen(true);
                            }}
                            title="Удалить"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Answers list */}
                      <div className="space-y-2 pl-10">
                        {q.answers.map((ans) => (
                          <div
                            key={ans.id}
                            className={`flex items-center space-x-3 p-2.5 rounded-xl border text-sm ${
                              ans.is_correct
                                ? "bg-emerald-50/70 border-emerald-200 text-emerald-950 font-medium"
                                : "bg-slate-50/50 border-slate-200/70 text-slate-700"
                            }`}
                          >
                            <div
                              className={`w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center ${
                                ans.is_correct ? "bg-emerald-600" : "border-2 border-slate-300"
                              }`}
                            >
                              {ans.is_correct && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                            </div>
                            <span className="flex-1">{ans.text}</span>
                            {ans.is_correct && (
                              <span className="text-xs font-semibold text-emerald-700">
                                Правильный
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Save & Publish Bar */}
            <div className="flex items-center justify-between pt-4">
              <Link
                href="/tests"
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                ← Вернуться ко всем тестам
              </Link>
              <button
                type="button"
                onClick={handlePublish}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span>Опубликовать тест</span>
              </button>
            </div>
          </>
        )}

        {/* Question Add / Edit Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 my-8">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">
                  {editingQuestionId ? "Редактировать вопрос" : "Добавить вопрос"}
                </h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Текст вопроса <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="В каком году произошло событие...?"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Тип вопроса
                  </label>
                  <select
                    value={questionType}
                    onChange={(e) => {
                      const newType = e.target.value as QuestionType;
                      setQuestionType(newType);
                      if (newType === "TRUE_FALSE") {
                        setAnswers([
                          { text: "Верно", is_correct: true },
                          { text: "Неверно", is_correct: false },
                        ]);
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm bg-white"
                  >
                    <option value="SINGLE_CHOICE">Один правильный</option>
                    <option value="MULTIPLE_CHOICE">Несколько правильных</option>
                    <option value="TRUE_FALSE">Да / Нет</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Баллы за вопрос
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={points}
                    onChange={(e) => setPoints(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm"
                  />
                </div>
              </div>

              {/* Answers options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Варианты ответа (отметьте верный):
                  </label>
                  {questionType !== "TRUE_FALSE" && (
                    <button
                      type="button"
                      onClick={handleAddAnswerOption}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Добавить вариант</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {answers.map((ans, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleCorrect(idx)}
                        title={ans.is_correct ? "Правильный ответ" : "Сделать правильным"}
                        className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center border transition-all ${
                          ans.is_correct
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "border-slate-300 text-transparent hover:border-slate-400"
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>

                      <input
                        type="text"
                        value={ans.text}
                        onChange={(e) => handleAnswerTextChange(idx, e.target.value)}
                        placeholder={`Вариант ${idx + 1}`}
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900"
                      />

                      {questionType !== "TRUE_FALSE" && answers.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveAnswerOption(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuestion}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Question Modal */}
        <ConfirmModal
          isOpen={deleteQModalOpen}
          title="Удалить вопрос?"
          message="Вы уверены, что хотите удалить этот вопрос из теста?"
          confirmText="Удалить"
          onConfirm={handleDeleteQuestion}
          onCancel={() => {
            setDeleteQModalOpen(false);
            setQuestionToDelete(null);
          }}
        />

        {/* Big Published Code Block Modal */}
        {publishedCode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-100 text-center space-y-5">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900">Тест опубликован</h3>
                <p className="text-sm text-slate-500 mt-1">Код комнаты для студентов:</p>
              </div>

              <div className="py-4 px-6 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-center gap-3">
                <span className="font-mono text-3xl font-extrabold tracking-widest text-indigo-600">
                  {publishedCode}
                </span>
                <button
                  onClick={() => copyCode(publishedCode)}
                  className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-xl shadow-xs transition-colors"
                  title="Скопировать код"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Студенты могут открыть главную страницу и ввести этот код.
              </p>

              <button
                onClick={() => setPublishedCode(null)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl transition-colors"
              >
                Понятно
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
