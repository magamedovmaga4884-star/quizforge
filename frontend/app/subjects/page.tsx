"use client";

import React, { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Subject } from "@/types";
import { TeacherSidebar } from "@/components/TeacherSidebar";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useToast } from "@/components/Toast";
import { BookOpen, Plus, Edit2, Trash2, Loader2, X } from "lucide-react";

export default function SubjectsPage() {
  const { success, error } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal create/edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const data = await api.getSubjects();
      setSubjects(data);
    } catch (err: any) {
      error("Не удалось загрузить список предметов");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingSubject(null);
    setName("");
    setDescription("");
    setModalOpen(true);
  };

  const handleOpenEdit = (s: Subject) => {
    setEditingSubject(s);
    setName(s.name);
    setDescription(s.description || "");
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      error("Укажите название предмета");
      return;
    }

    try {
      if (editingSubject) {
        await api.updateSubject(editingSubject.id, {
          name: name.trim(),
          description: description.trim() || undefined,
        });
        success("Предмет обновлен");
      } else {
        await api.createSubject({
          name: name.trim(),
          description: description.trim() || undefined,
        });
        success("Предмет добавлен");
      }
      setModalOpen(false);
      loadSubjects();
    } catch (err: any) {
      error(err.message || "Ошибка при сохранении предмета");
    }
  };

  const handleDelete = async () => {
    if (!subjectToDelete) return;
    try {
      await api.deleteSubject(subjectToDelete.id);
      success("Предмет удален");
      setDeleteModalOpen(false);
      setSubjectToDelete(null);
      loadSubjects();
    } catch (err: any) {
      error(err.message || "Не удалось удалить предмет");
    }
  };

  return (
    <div className="flex-1 flex">
      <TeacherSidebar />
      <main className="flex-1 p-6 sm:p-8 max-w-5xl mx-auto w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
              Учебные предметы
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Дисциплины кафедры и института, используемые для классификации тестов
            </p>
          </div>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить предмет</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
            {subjects.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                Список предметов пуст. Добавьте первый предмет.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-6">Предмет</th>
                      <th className="py-3.5 px-6">Описание</th>
                      <th className="py-3.5 px-6">Тестов</th>
                      <th className="py-3.5 px-6 text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subjects.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-4 px-6 font-semibold text-slate-900 flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <span>{s.name}</span>
                        </td>
                        <td className="py-4 px-6 text-slate-500 text-xs max-w-xs truncate">
                          {s.description || "—"}
                        </td>
                        <td className="py-4 px-6">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                            {s.test_count || 0}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="inline-flex items-center space-x-2">
                            <button
                              onClick={() => handleOpenEdit(s)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                              title="Редактировать"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSubjectToDelete(s);
                                setDeleteModalOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                              title="Удалить"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Create / Edit Subject Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">
                  {editingSubject ? "Редактировать предмет" : "Добавить предмет"}
                </h3>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Название предмета <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Например: Программирование"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Краткое описание
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Описание дисциплины или курса..."
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm"
                  />
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
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
                  >
                    Сохранить
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirm Modal */}
        <ConfirmModal
          isOpen={deleteModalOpen}
          title="Удалить предмет?"
          message={`Вы действительно хотите удалить предмет "${subjectToDelete?.name}"?`}
          confirmText="Удалить"
          onConfirm={handleDelete}
          onCancel={() => {
            setDeleteModalOpen(false);
            setSubjectToDelete(null);
          }}
        />
      </main>
    </div>
  );
}
