// src/App.tsx
import React, { useState } from "react";
import FormBuilder from "./components/FormBuilder";
import FileUploader from "./components/FileUploader";
import ResultViewer from "./components/ResultViewer";
import DocViewer from "./components/DocViewer";
import HistoryViewer from "./components/HistoryViewer";
import TemplateManager from "./components/TemplateManager";
import LanguageSelector from "./components/LanguageSelector";
import Tooltip from "./components/Tooltip";
import { apiUrl } from "./utils/api";
import SmartTooltip from "./components/SmartTooltip";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function App() {
  const [fields, setFields] = useState<string[]>([
    "город",
    "дата",
    "время",
    "цена",
    "имя клиента",
  ]);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [language, setLanguage] = useState<string>("auto");
  const [mode, setMode] = useState<"manual" | "auto">("auto");
  const [fieldHints, setFieldHints] = useState<Record<string, string>>({});

  const handleRecognize = async () => {
    if (!filePath) return toast.error("Сначала загрузите файл");
    setIsProcessing(true);
    const toastId = toast.loading("Обработка документа...");
    try {
      const resp = await fetch(apiUrl("api/recognize"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          filePath, 
          fields: mode === "manual" ? fields : [], 
          language, 
          mode, 
          useCache: true 
        }),
      });
      const body = await resp.json();
      if (body.error) {
        toast.update(toastId, { render: body.error.ru || body.error.en, type: "error", isLoading: false, autoClose: 5000 });
        return;
      }
      setResult(body);
      if (body.meta?.fieldsUsed) {
        setFields(body.meta.fieldsUsed);
      }
      if (body.meta?.detectedLanguage && language === "auto") {
        setLanguage("auto");
      }
      // если пришла валюта — гарантируем наличие поля
      if (body.meta?.currencyCandidates?.length) {
        const hasCurrency = body.meta.fieldsUsed?.some((f: string) => f.toLowerCase().includes("валют"));
        if (!hasCurrency) {
          setFields((prev) => [...prev, "валюта"]);
        }
      }
      const cacheInfo = body.meta?.fromCache ? " (из кэша)" : "";
      const pageInfo = body.meta?.pageCount > 1 ? ` (${body.meta.pageCount} стр.)` : "";
      toast.update(toastId, { 
        render: `Распознавание завершено${cacheInfo}${pageInfo}`, 
        type: "success", 
        isLoading: false, 
        autoClose: 5000 
      });
    } catch (err: any) {
      toast.update(toastId, { render: err.message || "Ошибка при распознавании", type: "error", isLoading: false, autoClose: 5000 });
    } finally {
      setIsProcessing(false);
    }
  };

  // New: unified assign that DocViewer will call
  const handleAssignFromDoc = (block: any, field: string, value?: string) => {
    setResult((r: any) => {
      const next = r ? JSON.parse(JSON.stringify(r)) : {};
      next.fields = next.fields || {};
      // keep confidence from block if available
      const conf = typeof block.confidence === "number" ? block.confidence : (next.fields[field]?.confidence || 0.5);
      next.fields[field] = { value: value ?? block.text ?? "", confidence: conf, inferred: false, meta: { bbox: block.bbox } };
      // also mark block inside ocr blocks for UI feedback (this is local)
      if (next.ocr && Array.isArray(next.ocr.blocks)) {
        for (const b of next.ocr.blocks) {
          // compare bbox arrays
          if (JSON.stringify(b.bbox) === JSON.stringify(block.bbox)) {
            b._assigned = true;
            b.assignedField = field;
            break;
          }
        }
      }
      return next;
    });
  };

  // Загрузка записи из истории
  const handleLoadFromHistory = async (entry: any) => {
    try {
      // Устанавливаем поля из истории
      if (entry.fields && Array.isArray(entry.fields)) {
        setFields(entry.fields);
      }

      // Устанавливаем путь к файлу
      const fileName = entry.fileName || entry.filePath?.split(/[/\\]/).pop() || "";
      if (fileName) {
        setFilePath(fileName);
      }

      // Восстанавливаем результат из истории
      if (entry.llmResult) {
        // Показываем результат из истории
        // Пользователь может запустить распознавание заново для получения полных OCR блоков
        setResult({
          fields: entry.llmResult,
          ocr: {
            text: entry.ocrTextSnippet || "",
            blocks: [],
            avgConfidence: 0.8,
          },
          meta: {
            filePath: fileName,
            timestamp: entry.timestamp,
            fromHistory: true,
          },
        });
        toast.info("Результат загружен из истории. Запустите распознавание для получения полных OCR блоков.");
      } else {
        // Если нет результата LLM, просто устанавливаем файл
        setResult(null);
      }
    } catch (err: any) {
      toast.error("Ошибка при загрузке записи: " + (err.message || String(err)));
    }
  };

  const describeField = async (field: string) => {
    if (fieldHints[field]) return fieldHints[field];
    try {
      const resp = await fetch(apiUrl("api/assist/describe-field"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, context: result?.ocr?.text || "" }),
      });
      const data = await resp.json();
      if (data.description) {
        setFieldHints((m) => ({ ...m, [field]: data.description }));
        return data.description;
      }
    } catch (e) {
      // ignore
    }
    return "";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 text-gray-800 flex flex-col lg:flex-row gap-6 p-4 lg:p-6">
      <div className="w-full lg:w-[500px] xl:w-[560px] bg-white rounded-2xl shadow-xl border border-gray-100 p-5 lg:p-6 space-y-5 lg:space-y-6 overflow-y-auto max-h-screen lg:sticky lg:top-6">
        <div className="flex items-center gap-2 pb-4 border-b border-gray-200">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-800">Конструктор формы</h2>
            <p className="text-xs text-gray-500 mt-0.5">Настройте поля для извлечения</p>
          </div>
          <SmartTooltip title="Конструктор формы" context="Поясни, как работает конструктор полей, зачем он нужен, что делать в авто/ручном режиме.">
            <button className="text-gray-400 hover:text-blue-600 cursor-help transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </SmartTooltip>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4 space-y-3">
          <div className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Режим работы
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-transparent hover:border-blue-200 cursor-pointer transition-all">
              <input 
                type="radio" 
                checked={mode === "auto"} 
                onChange={() => setMode("auto")}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-800">Автоматический</div>
                <div className="text-xs text-gray-500">ИИ определит язык и поля</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-transparent hover:border-blue-200 cursor-pointer transition-all">
              <input 
                type="radio" 
                checked={mode === "manual"} 
                onChange={() => setMode("manual")}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-800">Ручной</div>
                <div className="text-xs text-gray-500">Вы выбираете поля и язык</div>
              </div>
            </label>
          </div>
        </div>

        <TemplateManager currentFields={fields} onLoadTemplate={setFields} />

        <FormBuilder 
          fields={fields} 
          setFields={setFields} 
          disabled={mode === "auto"} 
          describeField={describeField}
          hints={fieldHints}
        />

        <FileUploader
          onUploaded={(fp) => setFilePath(fp)}
          onError={(e) => toast.error(e)}
        />

        <LanguageSelector language={language} onChange={setLanguage} />

        <button
          onClick={handleRecognize}
          disabled={isProcessing}
          className={`w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 ${isProcessing ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Обработка...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Запустить распознавание</span>
            </>
          )}
        </button>

        <ResultViewer result={result} setResult={setResult} fields={fields} />

        <HistoryViewer onLoadEntry={handleLoadFromHistory} />
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-xl border border-gray-100 p-5 lg:p-6 overflow-auto">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Документ</h2>
            <p className="text-xs text-gray-500 mt-0.5">Просмотр и редактирование</p>
          </div>
        </div>

        {filePath ? (
          <DocViewer
            filePath={filePath}
            ocrBlocks={result?.ocr?.blocks || []}
            fields={fields}
            onAssign={handleAssignFromDoc}
            recognizedText={result?.ocr?.text || ""}
            pageCount={result?.meta?.pageCount || 1}
            isPDF={result?.meta?.isPDF || false}
            originalFileName={result?.meta?.originalFileName || filePath}
          />
        ) : (
          <div className="flex items-center justify-center text-gray-500 text-sm h-full">
            Загрузите файл для просмотра
          </div>
        )}
      </div>

      <ToastContainer position="top-right" theme="colored" />
    </div>
  );
}
