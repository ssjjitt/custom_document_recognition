import React, { useEffect, useRef, useState } from "react";

interface Props {
  filePath: string;
  ocrBlocks: any[];
  fields: string[]; 
  onAssign: (block: any, field: string, selectedText?: string) => void;
  recognizedText?: string;
  pageCount?: number;
  isPDF?: boolean;
  originalFileName?: string;
}

export default function DocViewer({ filePath, ocrBlocks, fields, onAssign, recognizedText = "", pageCount = 1, isPDF = false, originalFileName }: Props) {
  const filename = filePath ? filePath.replace(/.*[\\/]/, "") : "";
  const [currentPage, setCurrentPage] = useState(1);
  
  // Определяем источник изображения в зависимости от типа файла и страницы
  const getImageSrc = () => {
    if (isPDF) {
      // Для PDF (многостраничных или одностраничных) используем endpoint для получения страницы
      const fileToUse = originalFileName || filename;
      const encodedPath = encodeURIComponent(fileToUse);
      return `http://localhost:4000/api/pages/${encodedPath}/${currentPage}`;
    }
    // Для изображений используем обычный путь
    return `http://localhost:4000/api/uploads/${encodeURIComponent(filename)}`;
  };
  
  const src = getImageSrc();

  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0, naturalW: 0, naturalH: 0 });
  const [canvasSize, setCanvasSize] = useState({ w: 900, h: 1200 });
  const [activeBlock, setActiveBlock] = useState<any | null>(null);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedField, setSelectedField] = useState<string>("");
  const [selectedText, setSelectedText] = useState<string>("");
  const [showLabels, setShowLabels] = useState(true);
  const [showBoxes, setShowBoxes] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  
  // Фильтруем блоки по текущей странице и корректируем координаты
  const currentPageBlocks = ocrBlocks
    .filter((block: any) => {
      if (!block.page) return currentPage === 1; // Если страница не указана, показываем на первой странице
      return block.page === currentPage;
    })
    .map((block: any) => {
      // Для многостраничных документов убираем смещение по Y
      if (block.page && pageCount > 1) {
        const pageOffsetY = (block.page - 1) * 2000; // То же смещение, что используется в backend
        const [x, y, w, h] = block.bbox || [0, 0, 0, 0];
        return {
          ...block,
          bbox: [x, y - pageOffsetY, w, h] // Убираем смещение для отображения на отдельной странице
        };
      }
      return block;
    });

  useEffect(() => {
    // Подбираем размеры виртуального полотна по боксам текущей страницы
    if (!currentPageBlocks || currentPageBlocks.length === 0) {
      // Если блоков нет, устанавливаем стандартные размеры
      setCanvasSize({ w: 1200, h: 1600 });
      setImgSize({ w: 1200, h: 1600, naturalW: 1200, naturalH: 1600 });
      return;
    }
    let maxX = 0, maxY = 1600;
    const containerMaxWidth = 1000; // Максимальная ширина контейнера для предотвращения горизонтальной прокрутки
    
    currentPageBlocks.forEach((b: any) => {
      const [x, y, w, h] = b.bbox || [0, 0, 0, 0];
      const textLength = (b.text || "").length;
      // Учитываем увеличенные размеры полигонов при расчете размеров canvas
      const charWidth = 9;
      const paddingX = 12;
      const paddingY = 6;
      const lineHeight = 20;
      const textWidth = textLength * charWidth;
      const estimatedWidth = Math.max(w, textWidth + paddingX * 2);
      const estimatedHeight = Math.max(h, lineHeight + paddingY * 2);
      
      // Ограничиваем ширину полигонов максимальной шириной контейнера
      const constrainedWidth = Math.min(estimatedWidth, containerMaxWidth - x - 20);
      maxX = Math.max(maxX, x + constrainedWidth + 20);
      maxY = Math.max(maxY, y + estimatedHeight + 40);
    });
    
    // Устанавливаем минимальную ширину
    maxX = Math.max(maxX, 1200);
    setCanvasSize({ w: Math.ceil(maxX), h: Math.ceil(maxY) });
    setImgSize({ w: maxX, h: maxY, naturalW: maxX, naturalH: maxY });
  }, [ocrBlocks, currentPage, pageCount]);
  
  // Сбрасываем активный блок при смене страницы
  useEffect(() => {
    setActiveBlock(null);
    setPopupPos(null);
  }, [currentPage]);
  
  // Сбрасываем страницу при изменении файла
  useEffect(() => {
    setCurrentPage(1);
  }, [filePath]);

  const scaleBBox = (bbox: number[]) => {
    const { w, h, naturalW, naturalH } = imgSize;
    const sx = w / naturalW;
    const sy = h / naturalH;
    return {
      left: bbox[0] * sx,
      top: bbox[1] * sy,
      width: bbox[2] * sx,
      height: bbox[3] * sy,
    };
  };

  const isAssigned = (block: any) => {
    return !!block._assigned || !!block.assignedField || !!block._assignedField;
  };

  const onBlockClick = (e: React.MouseEvent, block: any) => {
    e.stopPropagation();
    const containerRect = containerRef.current?.getBoundingClientRect();
    const clickX = e.clientX - (containerRect?.left || 0);
    const clickY = e.clientY - (containerRect?.top || 0);
    setActiveBlock(block);
    setPopupPos({ x: clickX, y: clickY });
    setSelectedField("");
    setSelectedText(block.text || "");
  };

  const handleAssign = () => {
    if (!activeBlock) return;
    const value = selectedText?.trim() || activeBlock.text || "";
    if (!selectedField) {
      alert("Выберите поле, в которое нужно поместить текст");
      return;
    }
    onAssign(activeBlock, selectedField, value);
    activeBlock._assigned = true;
    activeBlock.assignedField = selectedField;
    setActiveBlock(null);
    setPopupPos(null);
  };

  return (
    <div className="space-y-6">
      {/* Превью файла - теперь первым */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md relative overflow-hidden">
              <span className="relative z-10">{filename.split('.').pop()?.toUpperCase() || 'FILE'}</span>
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
              <span className="absolute -top-1 -right-1 text-[10px] bg-white text-blue-600 rounded-full px-1.5 py-0.5 font-semibold shadow-sm">⇱</span>
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-800 truncate max-w-[240px]">{filename}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {pageCount > 1 ? `Страница ${currentPage} из ${pageCount}` : 'Нажмите, чтобы открыть превью'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Пагинация для многостраничных документов */}
            {pageCount > 1 && (
              <div className="flex items-center gap-2 bg-white rounded-lg border border-blue-200 px-2 py-1">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-md hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Предыдущая страница"
                >
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="text-xs font-semibold text-gray-700 px-2 min-w-[60px] text-center">
                  {currentPage} / {pageCount}
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(pageCount, currentPage + 1))}
                  disabled={currentPage === pageCount}
                  className="p-1.5 rounded-md hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  title="Следующая страница"
                >
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
            <button
              className="px-4 py-2 bg-white border border-blue-200 rounded-lg text-sm text-blue-700 hover:bg-blue-50 hover:border-blue-300 transition-all font-medium shadow-sm hover:shadow"
              onClick={() => setPreviewOpen(true)}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                </svg>
                Открыть
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Виртуальный лист с текстом и полигонами */}
      <div className="relative w-full bg-gradient-to-br from-white to-gray-50 rounded-2xl border-2 border-gray-200 overflow-hidden shadow-xl">
        {/* Заголовок с управлением */}
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-4 border-b-2 border-gray-200">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-800">Распознанные блоки текста</h3>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <p className="text-xs text-gray-500">Кликните на блок, чтобы назначить его в поле</p>
                  {pageCount > 1 && (
                    <span className="text-xs text-gray-600 font-medium">
                      Всего страниц: {pageCount} • Блоков на странице {currentPage}: {currentPageBlocks.length}
                    </span>
                  )}
                  {currentPageBlocks.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold">
                        {currentPageBlocks.length} блоков{pageCount > 1 ? ` (стр. ${currentPage})` : ''}
                      </span>
                      {currentPageBlocks.filter((b: any) => b._assigned || b.assignedField).length > 0 && (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-semibold">
                          {currentPageBlocks.filter((b: any) => b._assigned || b.assignedField).length} назначено
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Пагинация для блока с полигонами */}
              {pageCount > 1 && (
                <div className="flex items-center gap-2 bg-white rounded-lg border border-blue-200 px-3 py-2 shadow-sm">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-md hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Предыдущая страница"
                  >
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-xs font-semibold text-gray-700 px-2 min-w-[70px] text-center">
                    Страница {currentPage} / {pageCount}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(pageCount, currentPage + 1))}
                    disabled={currentPage === pageCount}
                    className="p-1.5 rounded-md hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Следующая страница"
                  >
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
              <div className="flex items-center gap-4 bg-white/80 backdrop-blur-sm px-4 py-2.5 rounded-xl shadow-md border border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      checked={showBoxes} 
                      onChange={(e) => setShowBoxes(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded border-2 transition-all ${
                      showBoxes 
                        ? 'bg-blue-600 border-blue-600' 
                        : 'bg-white border-gray-300 group-hover:border-blue-400'
                    }`}>
                      {showBoxes && (
                        <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">Рамки</span>
                </label>
                <div className="w-px h-6 bg-gray-300"></div>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      checked={showLabels} 
                      onChange={(e) => setShowLabels(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded border-2 transition-all ${
                      showLabels 
                        ? 'bg-blue-600 border-blue-600' 
                        : 'bg-white border-gray-300 group-hover:border-blue-400'
                    }`}>
                      {showLabels && (
                        <svg className="w-full h-full text-white p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-gray-700 group-hover:text-blue-600 transition-colors">Текст</span>
                </label>
              </div>
              {/* Легенда */}
              <div className="flex items-center gap-3 text-xs bg-white/80 backdrop-blur-sm px-3 py-2 rounded-lg shadow-sm border border-gray-200">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded border-2 border-blue-500 bg-blue-100"></div>
                  <span className="text-gray-600 font-medium">Не назначено</span>
                </div>
                <div className="w-px h-4 bg-gray-300"></div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded border-2 border-green-500 bg-green-100"></div>
                  <span className="text-gray-600 font-medium">Назначено</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Контейнер с полигонами */}
        <div className="relative bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20 p-6">
          <div
            ref={containerRef}
            className="relative mx-auto overflow-y-auto overflow-x-hidden rounded-xl shadow-inner"
            style={{ 
              width: "100%",
              maxWidth: "100%",
              height: Math.min(canvasSize.h + 100, 800),
              maxHeight: '75vh',
              background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)", 
              border: "2px solid #e2e8f0", 
              boxShadow: "inset 0 4px 8px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.05)",
            }}
            onClick={() => {
              setActiveBlock(null);
              setPopupPos(null);
            }}
          >
        {currentPageBlocks.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm font-medium">
                {pageCount > 1 ? `На странице ${currentPage} нет распознанных блоков` : 'Нет распознанных блоков'}
              </p>
              {pageCount > 1 && (
                <p className="text-xs text-gray-400 mt-1">Попробуйте переключиться на другую страницу</p>
              )}
            </div>
          </div>
        ) : (
          imgSize.w > 0 &&
          currentPageBlocks.map((b, i) => {
            const { left, top, width, height } = scaleBBox(b.bbox || [0, 0, 0, 0]);
            const assigned = !!b._assigned || !!b.assignedField;
            const confidence = Math.round((b.confidence || 0) * 100);
            const textLength = (b.text || "").length;
            const wordText = (b.text || "").trim();

            // Улучшенный расчет размеров для удобного размещения слов
            // Увеличенные размеры для полного размещения текста
            const charWidth = 9; // Ширина одного символа в пикселях
            const lineHeight = 20; // Высота строки
            const paddingX = 12; // Горизонтальный padding
            const paddingY = 6; // Вертикальный padding
            
            // Рассчитываем ширину на основе длины текста с учетом padding
            const textWidth = textLength * charWidth;
            const minWordWidth = Math.max(width, textWidth + paddingX * 2);
            
            // Рассчитываем высоту с учетом padding
            const minWordHeight = Math.max(height, lineHeight + paddingY * 2);
            
            // Используем оригинальные размеры, но не меньше рассчитанных минимальных
            const finalWidth = Math.max(width, minWordWidth);
            const finalHeight = Math.max(height, minWordHeight);
            
            // Улучшенный расчет размера шрифта для лучшей читаемости
            const minFontSize = 13; // Увеличен минимальный размер
            const maxFontSize = 17; // Увеличен максимальный размер
            // Рассчитываем размер шрифта на основе размера блока и длины текста
            const widthBasedSize = (finalWidth - paddingX * 2) / Math.max(textLength, 1) * 1.4;
            const heightBasedSize = (finalHeight - paddingY * 2) * 0.75;
            const calculatedFontSize = Math.max(
              minFontSize, 
              Math.min(maxFontSize, Math.min(widthBasedSize, heightBasedSize))
            );
            
            // Определяем, является ли блок маленьким (для упрощенного отображения)
            const isSmallBlock = finalWidth < 80 || finalHeight < 28;

            return (
              <div
                key={i}
                onClick={(e) => onBlockClick(e, b)}
                className="group"
                title={`${b.text}\nУверенность: ${confidence}%${assigned ? `\nНазначено в: ${b.assignedField}` : ''}`}
                style={{
                  position: "absolute",
                  left,
                  top,
                  width: finalWidth,
                  height: finalHeight,
                  cursor: "pointer",
                  boxSizing: "border-box",
                  transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.zIndex = '20';
                  e.currentTarget.style.transition = 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.zIndex = '1';
                  e.currentTarget.style.transition = 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)';
                }}
              >
                {showBoxes && (
                  <div
                    className="absolute inset-0 rounded transition-all"
                    style={{
                      border: assigned
                        ? "2px solid #10b981"  
                        : "2px solid #3b82f6", // Увеличена толщина границы для лучшей видимости
                      background: assigned
                        ? "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.08))"
                        : "linear-gradient(135deg, rgba(59,130,246,0.1), rgba(59,130,246,0.05))", // Увеличена непрозрачность
                      boxShadow: assigned
                        ? "0 2px 8px rgba(16,185,129,0.3), inset 0 1px 0 rgba(255,255,255,0.7)"
                        : "0 2px 6px rgba(59,130,246,0.2), inset 0 1px 0 rgba(255,255,255,0.6)",
                      borderRadius: "4px", // Немного уменьшен радиус для более четкого вида
                    }}
                  />
                )}
                {showLabels && !isSmallBlock && (
                  <div
                    className="absolute z-5 transition-all"
                    style={{
                      left: 4,
                      top: 4,
                      right: 4,
                      bottom: assigned ? "30px" : "4px",
                      fontSize: `${calculatedFontSize}px`,
                      color: assigned ? "#065f46" : "#1e293b",
                      padding: "6px 12px",
                      lineHeight: 1.5,
                      fontWeight: assigned ? 700 : 600,
                      letterSpacing: "0.02em",
                      overflow: "visible",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "flex-start",
                      wordBreak: "break-word",
                      whiteSpace: "normal",
                      textShadow: assigned
                        ? "0 1px 3px rgba(255,255,255,0.95), 0 0 6px rgba(255,255,255,0.9), 0 2px 4px rgba(0,0,0,0.1)"
                        : "0 1px 3px rgba(255,255,255,0.95), 0 0 6px rgba(255,255,255,0.9), 0 2px 4px rgba(0,0,0,0.1)",
                    }}
                  >
                    <div 
                      style={{
                        width: "100%",
                        fontWeight: assigned ? 700 : 600,
                        wordBreak: "break-word",
                        overflowWrap: "break-word",
                      }}
                      title={wordText}
                    >
                      {wordText}
                    </div>
                    {confidence < 70 && finalHeight > 32 && (
                      <div 
                        className="font-bold leading-tight mt-0.5"
                        style={{
                          fontSize: `${Math.max(9, calculatedFontSize - 1.5)}px`,
                          color: "#dc2626",
                        }}
                      >
                        {confidence}%
                      </div>
                    )}
                  </div>
                )}
                {showLabels && isSmallBlock && (
                  <div
                    className="absolute inset-0 z-5 flex items-center justify-center"
                    style={{
                      fontSize: `${Math.max(12, Math.min(15, Math.min((finalWidth - 12) / Math.max(textLength, 1) * 1.3, (finalHeight - 8) * 0.7)))}px`,
                      color: assigned ? "#065f46" : "#1e293b",
                      fontWeight: assigned ? 700 : 600,
                      overflow: "visible",
                      wordBreak: "break-word",
                      overflowWrap: "break-word",
                      padding: "5px 8px",
                      lineHeight: 1.4,
                      letterSpacing: "0.02em",
                      textAlign: "center",
                      textShadow: assigned
                        ? "0 1px 3px rgba(255,255,255,0.95), 0 0 6px rgba(255,255,255,0.9), 0 2px 4px rgba(0,0,0,0.1)"
                        : "0 1px 3px rgba(255,255,255,0.95), 0 0 6px rgba(255,255,255,0.9), 0 2px 4px rgba(0,0,0,0.1)",
                    }}
                    title={wordText}
                  >
                    {wordText}
                  </div>
                )}
                {assigned && !isSmallBlock && (
                  <div
                    className="absolute z-6 rounded flex items-center gap-1.5 shadow-lg"
                    style={{
                      left: 4,
                      bottom: 4,
                      fontSize: `${Math.max(9, Math.min(11, calculatedFontSize - 0.5))}px`,
                      color: "#ffffff",
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      padding: "5px 10px",
                      overflow: "hidden",
                      maxWidth: "calc(100% - 8px)",
                      border: "1px solid rgba(16,185,129,0.4)",
                      boxShadow: "0 2px 6px rgba(16,185,129,0.4)",
                      fontWeight: 600,
                    }}
                  >
                    <svg className="flex-shrink-0" style={{ width: '11px', height: '11px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    <span 
                      className="font-bold truncate"
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "100%",
                      }}
                      title={b.assignedField || "assigned"}
                    >
                      {b.assignedField || "assigned"}
                    </span>
                  </div>
                )}
                {assigned && isSmallBlock && (
                  <div
                    className="absolute inset-0 z-6 flex items-center justify-center rounded"
                    style={{
                      background: "linear-gradient(135deg, rgba(16,185,129,0.25), rgba(16,185,129,0.15))",
                      border: "2px solid #10b981",
                      boxShadow: "0 2px 4px rgba(16,185,129,0.3)",
                    }}
                  >
                    <svg style={{ width: '13px', height: '13px' }} fill="none" stroke="#10b981" viewBox="0 0 24 24" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })
        )}

        {activeBlock && popupPos && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute z-50 animate-scaleIn"
            style={{
              left: Math.min(popupPos.x + 8, (containerRef.current?.clientWidth || 1000) - 320),
              top: Math.min(popupPos.y + 8, (containerRef.current?.clientHeight || 700) - 300),
              minWidth: 300,
              maxWidth: 420,
            }}
          >
            <div className="bg-white border-2 border-blue-300 shadow-2xl rounded-2xl p-5 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 -m-5 mb-4 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">Назначить текст в поле</div>
                    <div className="text-blue-100 text-xs mt-0.5">
                      Уверенность: {Math.round((activeBlock.confidence || 0) * 100)}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Выберите поле для назначения
                </label>
                <select 
                  value={selectedField} 
                  onChange={(e) => setSelectedField(e.target.value)} 
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white font-medium text-gray-800 shadow-sm hover:shadow"
                >
                  <option value="">— Выберите поле —</option>
                  {fields.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              <div className="mb-2">
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Текст блока (можно редактировать)
                </label>
                <textarea
                  value={selectedText}
                  onChange={(e) => setSelectedText(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none bg-gray-50 font-mono text-sm leading-relaxed"
                  style={{ minHeight: 120 }}
                  placeholder="Выделите нужный фрагмент..."
                />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button 
                  className="px-4 py-2 border-2 border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium" 
                  onClick={() => { setActiveBlock(null); setPopupPos(null); }}
                >
                  Отменить
                </button>
                <button 
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg font-medium" 
                  onClick={handleAssign}
                >
                  Назначить
                </button>
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>

      {/* Распознанный текст - после превью */}
      {recognizedText && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-5 py-3 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-base font-semibold text-gray-800">Распознанный текст</h3>
            </div>
          </div>
          <div className="p-5">
            <div className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-64 overflow-auto leading-relaxed whitespace-pre-wrap font-mono text-xs">
              {recognizedText}
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно превью */}
      {previewOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn" 
          onClick={() => setPreviewOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full mx-4 overflow-hidden animate-scaleIn" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="text-white font-semibold">Превью файла</div>
                  <div className="text-blue-100 text-sm">{filename}</div>
                </div>
              </div>
              <button 
                className="text-white hover:bg-white/20 rounded-lg p-2 transition-colors" 
                onClick={() => setPreviewOpen(false)}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[80vh] overflow-auto flex flex-col items-center bg-gray-50 p-6">
              {/* Пагинация в модальном окне */}
              {pageCount > 1 && (
                <div className="mb-4 flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-4 py-2 shadow-sm">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-md hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Предыдущая страница"
                  >
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-sm font-semibold text-gray-700 px-3 min-w-[80px] text-center">
                    Страница {currentPage} из {pageCount}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(pageCount, currentPage + 1))}
                    disabled={currentPage === pageCount}
                    className="p-2 rounded-md hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Следующая страница"
                  >
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
              <img src={getImageSrc()} alt={filename} className="max-h-[75vh] object-contain rounded-lg shadow-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

