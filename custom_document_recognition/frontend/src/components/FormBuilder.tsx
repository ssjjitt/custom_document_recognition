import React, { useEffect, useState } from "react";
import SmartTooltip from "./SmartTooltip";

interface Props {
  fields: string[];
  setFields: (fields: string[]) => void;
  disabled?: boolean;
  describeField?: (field: string) => Promise<string>;
  hints?: Record<string, string>;
}

export default function FormBuilder({ fields, setFields, disabled = false, describeField, hints = {} }: Props) {
  const [newField, setNewField] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>("");
  const [loadingHint, setLoadingHint] = useState<string | null>(null);

  const addField = () => {
    if (disabled) return;
    if (newField.trim()) {
      setFields([...fields, newField.trim()]);
      setNewField("");
    }
  };

  const ensureHint = async (field: string) => {
    if (!describeField) return;
    if (hints[field]) return;
    setLoadingHint(field);
    await describeField(field);
    setLoadingHint(null);
  };

  const startEdit = (i: number) => {
    setEditingIndex(i);
    setEditingValue(fields[i]);
  };

  const saveEdit = (i: number) => {
    if (editingValue.trim()) {
      const next = [...fields];
      next[i] = editingValue.trim();
      setFields(next);
    }
    setEditingIndex(null);
    setEditingValue("");
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingValue("");
  };

  const remove = (i: number) => {
    setFields(fields.filter((_, j) => j !== i));
    if (editingIndex === i) cancelEdit();
  };

  return (
    <div className="space-y-3">
      <div className="p-4 bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 rounded-xl text-sm text-gray-800 shadow-sm">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div className="font-semibold text-gray-800 mb-1">Добавьте поля для извлечения</div>
            <div className="text-gray-600">Введите имена полей, которые нужно найти в документе (например: имя, адрес, номер договора).</div>
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border-2 border-gray-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
          placeholder="Добавить новое поле..."
          value={newField}
          onChange={(e) => setNewField(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addField()}
          disabled={disabled}
        />
        <button
          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          onClick={addField}
          disabled={disabled || !newField.trim()}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      <ul className="space-y-2">
        {fields.map((f, i) => (
          <li
            key={i}
            className="flex justify-between items-center bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg px-4 py-3 hover:from-gray-100 hover:to-gray-200 transition-all border border-gray-200 shadow-sm hover:shadow"
          >
            <div className="flex items-center gap-3 w-full">
              {editingIndex === i ? (
                <input
                  className="flex-1 border-2 border-blue-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit(i);
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  autoFocus
                />
              ) : (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="truncate flex-1">{f}</span>
                  <SmartTooltip title={f} context={hints[f] || ""}>
                    <button
                      type="button"
                      className="text-gray-500 hover:text-blue-600 text-xs px-2 py-1 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-all"
                      onMouseEnter={() => ensureHint(f)}
                      disabled={disabled}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </SmartTooltip>
                </div>
              )}

              {editingIndex === i ? (
                <div className="flex items-center gap-2">
                  <button
                    className="p-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-all shadow-sm hover:shadow"
                    onClick={() => saveEdit(i)}
                    title="Сохранить"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8.25 8.25a1 1 0 01-1.414 0l-4.25-4.25a1 1 0 011.414-1.414L8 12.086l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-all shadow-sm hover:shadow"
                    onClick={cancelEdit}
                    title="Отменить"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => startEdit(i)}
                    disabled={disabled}
                    title="Редактировать"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                  </button>
                  <button
                    className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => remove(i)}
                    disabled={disabled}
                    title="Удалить"
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
