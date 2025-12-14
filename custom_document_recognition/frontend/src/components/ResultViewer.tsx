import React, { useState } from 'react';

type Props = {
  result: any;
  setResult?: (r: any) => void;
  fields?: string[]; 
};

const styles: Record<string, React.CSSProperties> = {
  container: { marginTop: 12, fontFamily: 'Inter, system-ui, sans-serif' },
  header: { marginBottom: 8, color: '#111', fontSize: 18 },
  grid: { display: 'grid', gap: 12 },
  card: { padding: 12, borderRadius: 8, background: '#fff', boxShadow: '0 1px 3px rgba(16,24,40,0.06)' },
  itemHeader: { margin: 0, marginBottom: 8, fontSize: 14, color: '#0f172a' },
  formRow: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 6 },
  label: { fontSize: 12, color: '#475569', fontWeight: 600 },
  input: { padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', color: '#0f172a' },
  small: { fontSize: 12, color: '#94a3b8' },
  empty: { color: '#64748b' },
};

function isPrimitive(v: any) {
  return v === null || v === undefined || ['string', 'number', 'boolean'].includes(typeof v);
}

function flattenEntries(obj: any, prefix = ''): Array<{ key: string; value: string }> {
  const res: Array<{ key: string; value: string }> = [];

  if (isPrimitive(obj)) {
    res.push({ key: prefix || 'value', value: obj == null ? '' : String(obj) });
    return res;
  }

  if (Array.isArray(obj)) {
    obj.forEach((el, i) => {
      const p = `${prefix || 'root'}[${i}]`;
      if (isPrimitive(el)) {
        res.push({ key: p, value: el == null ? '' : String(el) });
      } else {
        res.push(...flattenEntries(el, p));
      }
    });
    return res;
  }

  Object.entries(obj).forEach(([k, v]) => {
    const p = prefix ? `${prefix}.${k}` : k;
    if (isPrimitive(v)) {
      res.push({ key: p, value: v == null ? '' : String(v) });
    } else {
      res.push(...flattenEntries(v, p));
    }
  });

  return res;
}

export default function ResultViewer({ result, setResult, fields = [] }: Props) {
  if (!result) {
    return (
      <div className="bg-white rounded-xl border-2 border-gray-200 shadow-xl p-5">
        <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-gray-200">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">Результат распознавания</h3>
            <p className="text-xs text-gray-500 mt-0.5">Извлеченные данные из документа</p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="text-sm font-medium text-gray-500">Нет данных для отображения</div>
          <div className="text-xs text-gray-400 mt-1">Загрузите файл и запустите распознавание</div>
        </div>
      </div>
    );
  }

  function FieldRow({ field, value, itemIndex, obj }: { field: string; value: string; itemIndex?: number | null; obj: any }) {
    const [editing, setEditing] = useState(false);
    const [tmp, setTmp] = useState(value);

    const save = () => {
      if (!setResult) {
        setEditing(false);
        return;
      }

      setResult((r: any) => {
        const copy = Array.isArray(r) ? [...r] : { ...r };

        const target = itemIndex != null && Array.isArray(copy) ? { ...(copy[itemIndex] || {}) } : { ...(copy as any) };
        target.fields = target.fields || {};
        const prev = target.fields[field] || {};
        target.fields[field] = { ...(prev), value: tmp };

        if (itemIndex != null && Array.isArray(copy)) {
          copy[itemIndex] = target;
          return copy;
        }

        return target;
      });

      setEditing(false);
    };

    const cancel = () => {
      setTmp(value);
      setEditing(false);
    };

    return (
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-800 mb-2">{field}</label>
        <div className="flex items-center gap-3">
          <input
            className={`flex-1 border-2 rounded-lg px-4 py-2.5 transition-all ${
              editing 
                ? 'border-blue-400 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500' 
                : 'border-gray-200 bg-gray-50'
            }`}
            readOnly={!editing}
            value={tmp}
            onChange={(e) => setTmp(e.target.value)}
          />

          {!editing ? (
            setResult ? (
              <button 
                title="Редактировать" 
                onClick={() => setEditing(true)} 
                className="p-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-all shadow-sm hover:shadow"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z" />
                </svg>
              </button>
            ) : null
          ) : (
            <div className="flex gap-2">
              <button 
                title="Сохранить" 
                onClick={save} 
                className="p-2.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg transition-all shadow-sm hover:shadow"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8.25 8.25a1 1 0 01-1.414 0l-4.25-4.25a1 1 0 011.414-1.414L8 12.086l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
              <button 
                title="Отменить" 
                onClick={cancel} 
                className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all shadow-sm hover:shadow"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const renderEntries = (obj: any, itemIndex?: number | null) => {
    if (!fields || fields.length === 0) {
      return (
        <div style={styles.formRow}>
          <div style={styles.empty}>Поля не заданы в конструкторе формы</div>
        </div>
      );
    }
    const entries = fields.map((field) => {
      let value = '';
      try {
        if (obj && obj.fields && obj.fields[field] && obj.fields[field].value != null) {
          value = String(obj.fields[field].value);
        } else if (obj && obj[field] != null && (typeof obj[field] === 'string' || typeof obj[field] === 'number' || typeof obj[field] === 'boolean')) {
          value = String(obj[field]);
        }
      } catch (e) {
        value = '';
      }

      return { key: field, value };
    });

    return entries.map(({ key, value }) => (
      <FieldRow key={key} field={key} value={value} itemIndex={itemIndex} obj={obj} />
    ));
  };

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 shadow-xl p-5">
      <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-gray-200">
        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-800">Результат распознавания</h3>
          <p className="text-xs text-gray-500 mt-0.5">Извлеченные данные из документа</p>
        </div>
      </div>
      <div className="mb-4 space-y-3">
        {result?.meta?.detectedLanguage && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            <span className="text-xs text-gray-700">
              Язык: <span className="font-semibold text-blue-700">{result.meta.detectedLanguage}</span>
              {result.meta.languageConfidence ? ` (${Math.round(result.meta.languageConfidence * 100)}%)` : ""}
            </span>
          </div>
        )}
        {Array.isArray(result?.meta?.currencyCandidates) && result.meta.currencyCandidates.length > 0 && (
          <div className="flex items-center gap-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs text-gray-700 font-semibold">Валюта:</span>
            <select
              className="flex-1 border-2 border-green-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all bg-white"
              value={result.meta.selectedCurrency || result.meta.currencyCandidates[0]?.code || ""}
              onChange={(e) => {
                if (!setResult) return;
                const code = e.target.value;
                setResult((r: any) => {
                  const copy = { ...(r || {}) };
                  copy.meta = { ...(copy.meta || {}), selectedCurrency: code };
                  const currencyFieldKey = (fields || []).find((f) => f.toLowerCase().includes("валют")) || "валюта";
                  copy.fields = { ...(copy.fields || {}) };
                  const prev = copy.fields[currencyFieldKey] || {};
                  copy.fields[currencyFieldKey] = { ...(prev), value: code, confidence: prev.confidence ?? 0.6, inferred: false };
                  return copy;
                });
              }}
            >
              {result.meta.currencyCandidates.map((c: any) => (
                <option key={c.code} value={c.code}>
                  {c.label || c.code}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="space-y-4">
        {Array.isArray(result) ? (
          result.length === 0 ? (
            <div className="bg-gray-50 border-2 border-gray-200 rounded-xl p-6 text-center">
              <div className="text-gray-400 font-medium">Пустой массив</div>
            </div>
          ) : (
            result.map((item: any, idx: number) => (
              <div key={idx} className="bg-gradient-to-r from-gray-50 to-blue-50 border-2 border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all">
                <h4 className="text-base font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">Запись {idx + 1}</h4>
                {renderEntries(item, idx)}
              </div>
            ))
          )
        ) : (
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-2 border-gray-200 rounded-xl p-5 shadow-sm">
            {renderEntries(result)}
          </div>
        )}
      </div>
    </div>
  );
}
