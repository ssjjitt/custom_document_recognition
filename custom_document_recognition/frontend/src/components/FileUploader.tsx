import React, { useRef, useState } from "react";
import { apiUrl } from "../utils/api";

interface Props {
  onUploaded: (path: string) => void;
  onError: (msg: string) => void;
}

export default function FileUploader({ onUploaded, onError }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [localName, setLocalName] = useState<string | null>(null);
  const [serverPath, setServerPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  const upload = async (file: File) => {
    setLocalName(file.name);
    setUploading(true);
    setServerPath(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(apiUrl("api/upload"), {
        method: "POST",
        body: formData,
      });
      const body = await res.json();
      if (body.filePath) {
        setServerPath(body.filePath);
        onUploaded(body.filePath);
      } else {
        throw new Error("Ошибка загрузки файла");
      }
    } catch (err: any) {
      setLocalName(null);
      setServerPath(null);
      onError(err.message || String(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-dashed border-blue-300 rounded-xl p-6 text-center hover:border-blue-500 hover:shadow-lg transition-all shadow-md">
      <input
        type="file"
        ref={fileRef}
        hidden
        accept="application/pdf,image/png,image/jpeg,image/jpg"
        onChange={(e) => {
          if (e.target.files?.[0]) upload(e.target.files[0]);
        }}
      />

      <div className="flex flex-col items-center gap-4">
        {!localName ? (
          <>
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <button
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Выбрать файл
                </span>
              </button>
            </div>
            <p className="text-xs text-gray-600 font-medium">Поддерживаются PDF, JPG, PNG</p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-4 w-full">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0 ${
                serverPath 
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                  : 'bg-gradient-to-br from-gray-400 to-gray-500'
              }`}>
                {serverPath ? (
                  <svg className="h-7 w-7 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8.25 8.25a1 1 0 01-1.414 0l-4.25-4.25a1 1 0 011.414-1.414L8 12.086l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="h-7 w-7 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-semibold text-gray-800 truncate">{localName}</div>
                {serverPath ? (
                  <div className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Файл успешно загружен
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    {uploading && (
                      <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                      </svg>
                    )}
                    Загрузка...
                  </div>
                )}
                {serverPath && <div className="text-xs text-gray-500 mt-0.5">Сохранён как {serverPath}</div>}
              </div>
              <button
                className="px-4 py-2 bg-white border-2 border-blue-200 text-blue-700 rounded-lg font-medium hover:bg-blue-50 hover:border-blue-300 transition-all shadow-sm hover:shadow"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                Изменить
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
