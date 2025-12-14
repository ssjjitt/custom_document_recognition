import React from "react";

export const SUPPORTED_LANGUAGES = {
  'auto': 'Авто (определить автоматически)',
  'rus+eng': 'Русский + Английский',
  'rus': 'Русский',
  'eng': 'Английский',
  'deu': 'Немецкий',
  'fra': 'Французский',
  'spa': 'Испанский',
} as const;

interface Props {
  language: string;
  onChange: (language: string) => void;
}

export default function LanguageSelector({ language, onChange }: Props) {
  return (
    <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-200 p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
          </svg>
        </div>
        <label className="block text-sm font-semibold text-gray-800">
          Язык распознавания OCR
        </label>
      </div>
      <select
        value={language}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border-2 border-cyan-200 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 bg-white font-medium text-gray-800 shadow-sm hover:shadow transition-all"
      >
        {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
          <option key={code} value={code}>
            {name}
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-600 mt-2 font-medium">
        Выберите язык(и) для оптимизации распознавания текста
      </p>
    </div>
  );
}

