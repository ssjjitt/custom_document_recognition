import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";

interface HistoryEntry {
  id: string;
  timestamp: string;
  filePath: string;
  fileName: string;
  fields: string[];
  ocrTextSnippet?: string;
  llmResult?: any;
}

interface Props {
  onLoadEntry: (entry: HistoryEntry) => void;
}

export default function HistoryViewer({ onLoadEntry }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:4000/api/history?limit=20");
      const data = await res.json();
      if (data.logs) {
        setHistory(data.logs);
      }
    } catch (err: any) {
      toast.error("Ошибка при загрузке истории: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showHistory) {
      loadHistory();
    }
  }, [showHistory]);

  const handleLoadEntry = (entry: HistoryEntry) => {
    onLoadEntry(entry);
    setShowHistory(false);
    toast.success("Запись загружена из истории");
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Удалить эту запись из истории?")) return;

    try {
      const res = await fetch(`http://localhost:4000/api/history/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setHistory(history.filter((h) => h.id !== id));
        toast.success("Запись удалена");
      } else {
        throw new Error("Не удалось удалить запись");
      }
    } catch (err: any) {
      toast.error("Ошибка при удалении: " + (err.message || String(err)));
    }
  };

  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return timestamp;
    }
  };

  if (!showHistory) {
    return (
      <button
        onClick={() => setShowHistory(true)}
        className="w-full px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-xl text-sm font-semibold text-gray-800 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg border border-purple-200"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
          <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3h18v18H3z" />
            <path d="M7 3v18" />
            <path d="M3 7h18" />
            <path d="M3 11h18" />
            <path d="M3 15h18" />
          </svg>
        </div>
        <span>История обработки</span>
      </button>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-5">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center shadow-md">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3h18v18H3z" />
              <path d="M7 3v18" />
              <path d="M3 7h18" />
              <path d="M3 11h18" />
              <path d="M3 15h18" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">История обработки</h3>
            <p className="text-xs text-gray-500 mt-0.5">Последние результаты распознавания</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadHistory}
            disabled={loading}
            className="p-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-all disabled:opacity-50 shadow-sm hover:shadow"
            title="Обновить"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setShowHistory(false)}
            className="p-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all shadow-sm hover:shadow"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {loading && history.length === 0 ? (
        <div className="text-center py-12">
          <svg className="animate-spin h-8 w-8 text-purple-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div className="text-gray-500 text-sm">Загрузка...</div>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <div className="text-gray-500 text-sm font-medium">История пуста</div>
          <div className="text-gray-400 text-xs mt-1">Обработайте документы, чтобы они появились здесь</div>
        </div>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {history.map((entry) => (
            <div
              key={entry.id}
              className="border-2 border-gray-200 rounded-xl p-4 bg-gradient-to-r from-white to-gray-50 hover:from-blue-50 hover:to-indigo-50 hover:border-blue-300 transition-all cursor-pointer shadow-sm hover:shadow-md"
              onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-gray-800 truncate" title={entry.fileName}>
                        {entry.fileName || "Без имени"}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs text-gray-500">{formatDate(entry.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                  {entry.fields && entry.fields.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {entry.fields.slice(0, 3).map((field, i) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 text-xs rounded-full font-medium border border-blue-200"
                        >
                          {field}
                        </span>
                      ))}
                      {entry.fields.length > 3 && (
                        <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-medium border border-gray-200">
                          +{entry.fields.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLoadEntry(entry);
                    }}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all shadow-sm hover:shadow"
                    title="Загрузить"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => handleDelete(entry.id, e)}
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

              {expandedId === entry.id && (
                <div className="mt-4 pt-4 border-t-2 border-gray-200 space-y-4 animate-fadeIn">
                  {entry.ocrTextSnippet && (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-xs font-semibold text-gray-700">OCR текст</span>
                      </div>
                      <div className="text-xs text-gray-700 font-mono bg-white p-3 rounded border border-gray-200 max-h-32 overflow-y-auto leading-relaxed">
                        {entry.ocrTextSnippet}
                      </div>
                    </div>
                  )}
                  {entry.llmResult && (
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-semibold text-blue-700">Извлеченные данные</span>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(entry.llmResult).map(([key, value]: [string, any]) => (
                          <div key={key} className="flex items-start gap-2 text-xs bg-white p-2 rounded border border-blue-100">
                            <span className="font-semibold text-gray-800 min-w-[80px]">{key}:</span>
                            <span className="text-gray-700 flex-1">{value?.value || "-"}</span>
                            {value?.confidence !== undefined && (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-medium">
                                {Math.round(value.confidence * 100)}%
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

