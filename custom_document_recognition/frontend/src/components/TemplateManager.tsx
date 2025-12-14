import React, { useState, useEffect } from "react";
import SmartTooltip from "./SmartTooltip";
import { toast } from "react-toastify";

interface Template {
  id: string;
  name: string;
  description?: string;
  fields: string[];
  createdAt?: string;
  updatedAt?: string;
}

interface Props {
  currentFields: string[];
  onLoadTemplate: (fields: string[]) => void;
}

export default function TemplateManager({ currentFields, onLoadTemplate }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:4000/api/templates");
      const data = await res.json();
      if (data.templates) {
        setTemplates(data.templates);
      }
    } catch (err: any) {
      toast.error("Ошибка при загрузке шаблонов: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showManager) {
      loadTemplates();
    }
  }, [showManager]);

  const handleLoadTemplate = (template: Template) => {
    onLoadTemplate(template.fields);
    setShowManager(false);
    toast.success(`Шаблон "${template.name}" загружен`);
  };

  const handleSaveCurrentAsTemplate = () => {
    if (currentFields.length === 0) {
      toast.error("Нет полей для сохранения");
      return;
    }
    setEditingTemplate(null);
    setTemplateName("");
    setTemplateDescription("");
    setShowCreateModal(true);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast.error("Введите название шаблона");
      return;
    }

    // Всегда используем текущие поля из конструктора формы
    // Это позволяет пользователю редактировать поля перед сохранением
    const fieldsToSave = currentFields;
    if (fieldsToSave.length === 0) {
      toast.error("Добавьте хотя бы одно поле");
      return;
    }

    try {
      const url = editingTemplate
        ? `http://localhost:4000/api/templates/${editingTemplate.id}`
        : "http://localhost:4000/api/templates";
      const method = editingTemplate ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName.trim(),
          description: templateDescription.trim(),
          fields: fieldsToSave,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error?.ru || error.error?.en || "Ошибка сохранения");
      }

      toast.success(editingTemplate ? "Шаблон обновлен" : "Шаблон сохранен");
      setShowCreateModal(false);
      setEditingTemplate(null);
      setTemplateName("");
      setTemplateDescription("");
      loadTemplates();
    } catch (err: any) {
      toast.error("Ошибка при сохранении: " + (err.message || String(err)));
    }
  };

  const handleDeleteTemplate = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Удалить шаблон "${name}"?`)) return;

    try {
      const res = await fetch(`http://localhost:4000/api/templates/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Не удалось удалить шаблон");
      }

      toast.success("Шаблон удален");
      loadTemplates();
    } catch (err: any) {
      toast.error("Ошибка при удалении: " + (err.message || String(err)));
    }
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplateDescription(template.description || "");
    // Загружаем поля шаблона в конструктор формы
    onLoadTemplate(template.fields);
    setShowCreateModal(true);
  };

  if (!showManager) {
    return (
      <button
        onClick={() => setShowManager(true)}
        className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-xl text-sm font-semibold text-gray-800 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg border border-purple-200"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
          <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </div>
        <span>Шаблоны полей</span>
        <SmartTooltip title="Шаблоны полей" context="Объясни, что такое шаблоны полей, как их сохранять и использовать для повторяющихся документов.">
          <button className="text-gray-400 hover:text-purple-600 cursor-help transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </SmartTooltip>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-5">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow-md">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">Шаблоны полей</h3>
            <p className="text-xs text-gray-500 mt-0.5">Сохраненные наборы полей</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSaveCurrentAsTemplate}
            className="p-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg transition-all shadow-sm hover:shadow"
            title="Сохранить текущие поля как шаблон"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          </button>
          <button
            onClick={loadTemplates}
            disabled={loading}
            className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all shadow-sm hover:shadow disabled:opacity-50"
            title="Обновить"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setShowManager(false)}
            className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all shadow-sm hover:shadow"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {loading && templates.length === 0 ? (
        <div className="text-center py-12">
          <svg className="animate-spin h-8 w-8 text-purple-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div className="text-gray-500 text-sm">Загрузка...</div>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div className="text-gray-500 text-sm font-medium">Нет сохраненных шаблонов</div>
          <div className="text-gray-400 text-xs mt-1">Сохраните текущие поля как шаблон</div>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {templates.map((template) => (
            <div
              key={template.id}
              className="border-2 border-gray-200 rounded-xl p-4 bg-gradient-to-r from-white to-purple-50/30 hover:from-purple-50 hover:to-pink-50 hover:border-purple-300 transition-all shadow-sm hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-800 truncate">{template.name}</div>
                      {template.description && (
                        <div className="text-xs text-gray-500 mt-0.5 truncate">{template.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {template.fields.slice(0, 4).map((field, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 text-xs rounded-full font-medium border border-purple-200"
                      >
                        {field}
                      </span>
                    ))}
                    {template.fields.length > 4 && (
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium border border-gray-200">
                        +{template.fields.length - 4}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleLoadTemplate(template)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all shadow-sm hover:shadow"
                    title="Загрузить шаблон"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleEditTemplate(template)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all shadow-sm hover:shadow"
                    title="Редактировать"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => handleDeleteTemplate(template.id, template.name, e)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all shadow-sm hover:shadow"
                    title="Удалить"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модальное окно создания/редактирования шаблона */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={() => {
          setShowCreateModal(false);
          setEditingTemplate(null);
          setTemplateName("");
          setTemplateDescription("");
        }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {editingTemplate ? "Редактировать шаблон" : "Создать шаблон"}
                  </h3>
                  <p className="text-xs text-purple-100 mt-0.5">Сохраните набор полей для повторного использования</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Название шаблона *
                </label>
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  placeholder="Например: Чек, Договор, Накладная"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Описание (необязательно)
                </label>
                <input
                  type="text"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  placeholder="Краткое описание шаблона"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Поля ({currentFields.length})
                </label>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4 max-h-32 overflow-y-auto">
                  <div className="flex flex-wrap gap-2">
                    {currentFields.length > 0 ? (
                      currentFields.map((field, i) => (
                        <span
                          key={i}
                          className="px-3 py-1.5 bg-gradient-to-r from-purple-100 to-pink-100 text-purple-700 text-xs rounded-full font-semibold border border-purple-200"
                        >
                          {field}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500 text-sm">Нет полей</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {editingTemplate
                    ? "Поля загружены в конструктор формы. Измените их там, затем обновите шаблон"
                    : "Текущие поля из конструктора формы"}
                </p>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingTemplate(null);
                  setTemplateName("");
                  setTemplateDescription("");
                }}
                className="px-5 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-all font-medium"
              >
                Отменить
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl font-semibold"
              >
                {editingTemplate ? "Обновить" : "Создать"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

