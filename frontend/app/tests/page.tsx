"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Test, Subject } from "@/types";
import { TeacherSidebar } from "@/components/TeacherSidebar";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useToast } from "@/components/Toast";
import {
  PlusCircle,
  FileQuestion,
  Clock,
  Copy,
  Edit,
  BarChart2,
  Trash2,
  Share2,
  Loader2,
  CheckCircle2,
} from "lucide-react";

export default function TeacherTestsPage() {
  const router = useRouter();
  const { success, error } = useToast();

  const [tests, setTests] = useState<Test[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<number | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Confirm delete modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [testToDelete, setTestToDelete] = useState<Test | null>(null);

  // Published code modal
  const [publishModalCode, setPublishModalCode] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedSubject, selectedStatus]);

  const loadData = async () => {
    try {
      const [testsData, subjectsData] = await Promise.all([
        api.getTests(selectedSubject, selectedStatus || undefined),
        api.getSubjects(),
      ]);
      setTests(testsData);
      setSubjects(subjectsData);
    } catch (err: any) {
      error(err.message || "Ошибка загрузки списка тестов");
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (testId: number) => {
    try {
      await api.duplicateTest(testId);
      success("Тест успешно продублирован");
      loadData();
    } catch (err: any) {
      error(err.message || "Не удалось скопировать тест");
    }
  };

  const handlePublish = async (testId: number) => {
    try {
      const published = await api.publishTest(testId);
      setPublishModalCode(published.room_code || null);
      success("Тест опубликован! Студенты могут подключаться.");
      loadData();
    } catch (err: any) {
      error(err.message || "Не удалось опубликовать тест");
    }
  };

  const handleDelete = async () => {
    if (!testToDelete) return;
    try {
      await api.deleteTest(testToDelete.id);
      success(`Тест "${testToDelete.title}" удален`);
      setDeleteModalOpen(false);
      setTestToDelete(null);
      loadData();
    } catch (err: any) {
      error(err.message || "Не удалось удалить тест");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    success(`Код ${text} скопирован в буфер обмена`);
  };

  return (
    <div className="flex-1 flex">
      <TeacherSidebar />
      <main className="flex-1 p-6 sm:p-8 max-w-6xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
              Мои тесты
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Все созданные тесты, их публикация и управление заданиями
            </p>
          </div>
          <Link
            href="/tests/create"
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Создать тест</span>
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 uppercase">Предмет:</label>
            <select
              value={selectedSubject || ""}
              onChange={(e) => setSelectedSubject(e.target.value ? Number(e.target.value) : undefined)}
              className="text-sm px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Все предметы</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500 uppercase">Статус:</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-sm px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Все статусы</option>
              <option value="DRAFT">Черновик</option>
              <option value="PUBLISHED">Опубликован</option>
              <option value="CLOSED">Закрыт</option>
            </select>
          </div>
        </div>

        {/* Test List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : tests.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-200 text-center space-y-3">
            <FileQuestion className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="font-semibold text-slate-800">Тесты не найдены</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              По выбранным фильтрам тесты отсутствуют. Создайте новый или сбросьте фильтры.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tests.map((test) => (
              <div
                key={test.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">
                      {test.subject?.name || "Без предмета"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-md border ${
                          test.status === "PUBLISHED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : test.status === "CLOSED"
                            ? "bg-slate-100 text-slate-600 border-slate-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {test.status === "PUBLISHED"
                          ? "Опубликован"
                          : test.status === "CLOSED"
                          ? "Закрыт"
                          : "Черновик"}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-bold text-slate-900 text-base leading-snug">{test.title}</h3>
                  {test.description && (
                    <p className="text-xs text-slate-500 line-clamp-2">{test.description}</p>
                  )}

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
                        onClick={() => copyToClipboard(test.room_code!)}
                        title="Скопировать код"
                        className="text-slate-400 hover:text-slate-700 p-1"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePublish(test.id)}
                      className="text-xs font-medium px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Опубликовать</span>
                    </button>
                  )}

                  <div className="flex items-center gap-1">
                    <Link
                      href={`/tests/${test.id}/edit`}
                      title="Редактировать тест и вопросы"
                      className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDuplicate(test.id)}
                      title="Копировать тест"
                      className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <Link
                      href={`/tests/${test.id}/results`}
                      title="Результаты студентов"
                      className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    >
                      <BarChart2 className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => {
                        setTestToDelete(test);
                        setDeleteModalOpen(true);
                      }}
                      title="Удалить тест"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={deleteModalOpen}
          title="Удалить тест?"
          message={`Вы действительно хотите удалить тест "${testToDelete?.title}"? Все вопросы и результаты студентов будут удалены.`}
          confirmText="Удалить"
          onConfirm={handleDelete}
          onCancel={() => {
            setDeleteModalOpen(false);
            setTestToDelete(null);
          }}
        />

        {/* Publish Big Success Banner Modal */}
        {publishModalCode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-100 text-center space-y-5">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900">Тест опубликован</h3>
                <p className="text-sm text-slate-500 mt-1">Студенты могут войти по этому коду:</p>
              </div>

              <div className="py-4 px-6 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-center gap-3">
                <span className="font-mono text-3xl font-extrabold tracking-widest text-indigo-600">
                  {publishModalCode}
                </span>
                <button
                  onClick={() => copyToClipboard(publishModalCode)}
                  className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-xl shadow-xs transition-colors"
                  title="Скопировать код"
                >
                  <Copy className="w-5 h-5" />
                </button>
              </div>

              <button
                onClick={() => setPublishModalCode(null)}
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
