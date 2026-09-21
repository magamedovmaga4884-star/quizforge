"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Subject, TestDifficulty, QuestionType } from "@/types";
import { TeacherSidebar } from "@/components/TeacherSidebar";
import { useToast } from "@/components/Toast";
import {
  FileText,
  UploadCloud,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Clock,
  Loader2,
  Trash2,
  FileQuestion,
  AlertCircle,
  PlusCircle,
} from "lucide-react";

export default function CreateTestPage() {
  const router = useRouter();
  const { success, error, info } = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  // Step 1 Form
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState<number | "">("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");

  // Step 2 Form
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [difficulty, setDifficulty] = useState<TestDifficulty>("MEDIUM");
  const [timeLimit, setTimeLimit] = useState<number>(15);
  const [questionType, setQuestionType] = useState<QuestionType>("SINGLE_CHOICE");

  // Files & AI
  const [files, setFiles] = useState<File[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingManual, setIsSavingManual] = useState(false);
  const [aiStatus, setAiStatus] = useState<{ available: boolean; message: string } | null>(null);

  useEffect(() => {
    loadSubjects();
    checkAi();
  }, []);

  const loadSubjects = async () => {
    try {
      const data = await api.getSubjects();
      setSubjects(data);
      if (data.length > 0) {
        setSubjectId(data[0].id);
      }
    } catch (err: any) {
      error("Не удалось загрузить список предметов");
    } finally {
      setLoadingSubjects(false);
    }
  };

  const checkAi = async () => {
    try {
      const status = await api.checkAiStatus();
      setAiStatus(status);
    } catch {
      setAiStatus({
        available: false,
        message: "Локальный AI сейчас недоступен. Проверьте, запущен ли Ollama.",
      });
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles: File[]) => {
    const validExtensions = [".pdf", ".docx", ".pptx", ".txt"];
    const filtered = newFiles.filter((f) => {
      const ext = f.name.substring(f.name.lastIndexOf(".")).toLowerCase();
      if (!validExtensions.includes(ext)) {
        error(`Файл ${f.name} имеет неподдерживаемый формат.`);
        return false;
      }
      if (f.size > 20 * 1024 * 1024) {
        error(`Файл ${f.name} превышает лимит 20 МБ.`);
        return false;
      }
      return true;
    });

    if (files.length + filtered.length > 5) {
      error("Разрешено загружать не более 5 файлов на тест.");
      return;
    }

    setFiles((prev) => [...prev, ...filtered]);
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const createBaseTest = async () => {
    if (!title.trim()) {
      throw new Error("Укажите название теста");
    }
    if (!subjectId) {
      throw new Error("Выберите предмет");
    }

    const test = await api.createTest({
      title: title.trim(),
      description: description.trim() || undefined,
      subject_id: Number(subjectId),
      difficulty,
      time_limit_minutes: timeLimit,
    });

    // Upload materials if any
    if (files.length > 0) {
      await api.uploadMaterials(test.id, files);
    }

    return test;
  };

  const handleCreateManual = async () => {
    setIsSavingManual(true);
    try {
      const test = await createBaseTest();
      success("Тест создан! Теперь добавьте вопросы вручную.");
      router.push(`/tests/${test.id}/edit`);
    } catch (err: any) {
      error(err.message || "Ошибка при создании теста");
    } finally {
      setIsSavingManual(false);
    }
  };

  const handleGenerateAI = async () => {
    setIsGenerating(true);
    try {
      const test = await createBaseTest();
      info("Генерация вопросов через нейросеть... Пожалуйста, подождите.");

      const aiRes = await api.generateQuestions(test.id, {
        question_count: questionCount,
        difficulty,
        question_type: questionType,
        topic: topic || title,
      });

      success(aiRes.message || "Вопросы успешно сформированы!");
      router.push(`/tests/${test.id}/edit`);
    } catch (err: any) {
      error(
        err.message ||
          "Локальный AI сейчас недоступен. Проверьте, запущен ли Ollama. Вы всё равно можете создать вопросы вручную."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex-1 flex">
      <TeacherSidebar />
      <main className="flex-1 p-6 sm:p-8 max-w-4xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 tracking-tight">
            Создание теста
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Заполните параметры и сгенерируйте вопросы через локальный AI или вручную
          </p>
        </div>

        {/* Stepper Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setStep(1)}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              step === 1
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs">
              1
            </span>
            <span>Основная информация</span>
          </button>

          <button
            onClick={() => {
              if (!title.trim()) {
                error("Сначала укажите название теста");
                return;
              }
              setStep(2);
            }}
            className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              step === 2
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs">
              2
            </span>
            <span>Параметры и материалы</span>
          </button>
        </div>

        {/* STEP 1: Basic Info */}
        {step === 1 && (
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Название теста <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Итоговый зачет по высшей математике"
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Предмет <span className="text-rose-500">*</span>
                </label>
                {loadingSubjects ? (
                  <div className="text-sm text-slate-400 py-2">Загрузка предметов...</div>
                ) : (
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(Number(e.target.value))}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm bg-white"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Тема (для AI)
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Например: Интегралы и дифференциалы"
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Описание / Инструкция для студентов
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Тест содержит задания по разделам 1-4. Время ограничено."
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm"
              />
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => {
                  if (!title.trim()) {
                    error("Укажите название теста");
                    return;
                  }
                  setStep(2);
                }}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition-colors shadow-sm flex items-center gap-2"
              >
                <span>Далее к параметрам</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Settings, Materials & AI Generation */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
              <h3 className="font-bold text-slate-900 text-base">Параметры теста</h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {/* Count */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Количество вопросов
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm"
                  />
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Сложность
                  </label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as TestDifficulty)}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm bg-white"
                  >
                    <option value="EASY">Лёгкая</option>
                    <option value="MEDIUM">Средняя</option>
                    <option value="HARD">Сложная</option>
                  </select>
                </div>

                {/* Time Limit */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Время прохождения (мин)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Тип вопросов
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setQuestionType("SINGLE_CHOICE")}
                    className={`p-3 rounded-xl border text-sm font-medium text-left transition-all ${
                      questionType === "SINGLE_CHOICE"
                        ? "bg-indigo-50 border-indigo-600 text-indigo-900"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-semibold">Один правильный</div>
                    <div className="text-xs text-slate-500 mt-0.5">Классический выбор (4 варианта)</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuestionType("MULTIPLE_CHOICE")}
                    className={`p-3 rounded-xl border text-sm font-medium text-left transition-all ${
                      questionType === "MULTIPLE_CHOICE"
                        ? "bg-indigo-50 border-indigo-600 text-indigo-900"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-semibold">Несколько правильных</div>
                    <div className="text-xs text-slate-500 mt-0.5">Несколько верных вариантов</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setQuestionType("TRUE_FALSE")}
                    className={`p-3 rounded-xl border text-sm font-medium text-left transition-all ${
                      questionType === "TRUE_FALSE"
                        ? "bg-indigo-50 border-indigo-600 text-indigo-900"
                        : "border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="font-semibold">Да / Нет</div>
                    <div className="text-xs text-slate-500 mt-0.5">Правда или ложь</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Document Upload Area */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Загрузка учебных материалов</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    PDF, DOCX, PPTX, TXT (до 20 МБ на файл, до 5 файлов)
                  </p>
                </div>
              </div>

              {/* Drag & Drop Box */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className="border-2 border-dashed border-slate-200 hover:border-indigo-400 bg-slate-50/50 rounded-2xl p-6 text-center transition-colors cursor-pointer"
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                <input
                  id="file-upload"
                  type="file"
                  multiple
                  accept=".pdf,.docx,.pptx,.txt"
                  className="hidden"
                  onChange={handleFileInput}
                />
                <UploadCloud className="w-10 h-10 text-indigo-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-800">
                  Перетащите учебные материалы сюда или <span className="text-indigo-600 underline">выберите файлы</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Поддерживаются: PDF, DOCX, PPTX, TXT
                </p>
              </div>

              {/* Uploaded Files List */}
              {files.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-semibold text-slate-700 uppercase">
                    Выбранные файлы ({files.length}/5):
                  </h4>
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                    {files.map((file, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3">
                        <div className="flex items-center space-x-2.5 truncate">
                          <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                          <span className="text-sm text-slate-800 truncate font-medium">{file.name}</span>
                          <span className="text-xs text-slate-400 flex-shrink-0">
                            ({(file.size / 1024 / 1024).toFixed(1)} МБ)
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(idx);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AI Status Alert */}
            {aiStatus && !aiStatus.available && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-3 text-amber-900">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-semibold">Локальный AI сейчас недоступен</div>
                  <div>{aiStatus.message}</div>
                  <div className="text-amber-700">Вы всё равно можете создать тест и добавить вопросы вручную.</div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full sm:w-auto px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Назад</span>
              </button>

              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={handleCreateManual}
                  disabled={isSavingManual || isGenerating}
                  className="w-full sm:w-auto px-5 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {isSavingManual ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <PlusCircle className="w-4 h-4" />
                  )}
                  <span>Создать вручную</span>
                </button>

                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={isGenerating || isSavingManual}
                  className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl shadow-md shadow-indigo-100 transition-colors flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Генерация через AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Сгенерировать тест через AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
