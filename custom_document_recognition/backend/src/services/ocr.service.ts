import Tesseract from 'tesseract.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import sharp from 'sharp';
import { getCachedOCR, setCachedOCR } from './cache.service.js';

const execFileAsync = promisify(execFile);

// Поддерживаемые языки
export const SUPPORTED_LANGUAGES = {
  'rus': 'rus',
  'eng': 'eng',
  'rus+eng': 'rus+eng',
  'deu': 'deu', // Немецкий
  'fra': 'fra', // Французский
  'spa': 'spa', // Испанский
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES | string;

/**
 * Получает количество страниц в PDF
 */
async function getPDFPageCount(filePath: string): Promise<number> {
  try {
    // Пытаемся использовать pdf-lib для определения количества страниц
    const { PDFDocument } = await import('pdf-lib');
    const pdfBytes = fs.readFileSync(filePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    return pdfDoc.getPageCount();
  } catch (e) {
    // Если pdf-lib не работает, пытаемся через pdfinfo
    try {
      const { stdout } = await execFileAsync('pdfinfo', [filePath]);
      const match = stdout.toString().match(/Pages:\s*(\d+)/);
      if (match) return parseInt(match[1] as string, 10);
    } catch (_) {
      // Если pdfinfo недоступен, пытаемся через pdftoppm с большим диапазоном
      try {
        // Пробуем обработать до 100 страниц и считаем успешные
        let count = 0;
        for (let i = 1; i <= 100; i++) {
          try {
            const outPrefix = path.join(os.tmpdir(), `test-page-${i}`);
            const outPng = outPrefix + '.png';
            await execFileAsync('pdftoppm', [
              filePath,
              outPrefix,
              '-png',
              '-singlefile',
              '-f', i.toString(),
              '-l', i.toString()
            ]);
            if (fs.existsSync(outPng)) {
              count = i;
              fs.unlinkSync(outPng);
            } else {
              break;
            }
          } catch (_) {
            break;
          }
        }
        if (count > 0) return count;
      } catch (_) {}
    }
    // По умолчанию возвращаем 1
    return 1;
  }
}

/**
 * Конвертирует страницу PDF в изображение
 */
export async function convertPDFPage(filePath: string, pageNumber: number): Promise<Buffer> {
  const pageIndex = pageNumber - 1; // PDF страницы начинаются с 1, но sharp использует индекс с 0
  
  try {
    // Пытаемся через sharp (page начинается с 0)
    return await sharp(filePath, { density: 300, page: pageIndex })
      .resize(1500, null, { withoutEnlargement: true })
      .png()
      .toBuffer();
  } catch (e: any) {
    // Fallback на pdftoppm
    const outPrefix = path.join(os.tmpdir(), `ocr-${Date.now()}-${pageNumber}`);
    const outPng = outPrefix + '.png';
    try {
      await execFileAsync('pdftoppm', [
        filePath,
        outPrefix,
        '-png',
        '-singlefile',
        '-f', pageNumber.toString(),
        '-l', pageNumber.toString()
      ]);
      if (!fs.existsSync(outPng)) throw new Error('PDF rasterization failed');
      const buffer = await fs.promises.readFile(outPng);
      try { await fs.promises.unlink(outPng); } catch (_) {}
      return buffer;
    } catch (err) {
      throw new Error(`Failed to convert PDF page ${pageNumber}: ${(err as any)?.message || err}`);
    }
  }
}

/**
 * Обрабатывает одну страницу документа
 */
async function preprocessImage(buffer: Buffer): Promise<Buffer> {
  // Грейскейл + нормализация + легкое повышение резкости для лучшей OCR
  return await sharp(buffer)
    .grayscale()
    .normalize()
    .median()
    .sharpen()
    .png()
    .toBuffer();
}

async function processPage(imageInput: string | Buffer, language: string): Promise<any> {
  const lang = SUPPORTED_LANGUAGES[language as keyof typeof SUPPORTED_LANGUAGES] || language || 'rus+eng';
  let input: string | Buffer = imageInput;
  if (Buffer.isBuffer(imageInput)) {
    input = await preprocessImage(imageInput);
  }
  const { data } = await Tesseract.recognize(input, lang, { 
    logger: () => {}, 
    tessedit_pageseg_mode: 3,
    preserve_interword_spaces: 1
  } as any);
  return data;
}

export async function runOCR(filePath: string, language: string = 'rus+eng', useCache: boolean = true) {
  if (!fs.existsSync(filePath)) throw new Error('File not found: ' + filePath);

  // Проверяем кэш
  if (useCache) {
    const cached = getCachedOCR(filePath, language);
    if (cached) {
      return { 
        text: cached.text, 
        blocks: cached.blocks, 
        avgConfidence: cached.avgConfidence, 
        pageCount: cached.pageCount || 1,
        fromCache: true 
      };
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  let allTexts: string[] = [];
  let allBlocks: any[] = [];
  let totalConfidence = 0;
  let pageCount = 0;

  // Обработка многостраничных PDF
  if (ext === '.pdf') {
    try {
      const totalPages = await getPDFPageCount(filePath);
      pageCount = totalPages;
      console.log(`[OCR] Processing PDF with ${totalPages} pages: ${filePath}`);
      
      // Обрабатываем все страницы
      for (let page = 1; page <= totalPages; page++) {
        console.log(`[OCR] Processing page ${page}/${totalPages}...`);
        const imageInput = await convertPDFPage(filePath, page);
        const ocrData: any = await processPage(imageInput, language);
        
        const imgH = ocrData.image?.height ?? 1000;
        const pageOffsetY = (page - 1) * 2000; // Смещение для многостраничных документов
        
        const pageBlocks = (ocrData.words || []).map((w: any) => {
          const bbox = w.bbox || { x0: w.x0 ?? 0, y0: w.y0 ?? 0, x1: w.x1 ?? 0, y1: w.y1 ?? 0 };
          return {
            text: w.text.trim(),
            confidence: (w.confidence ?? 0) / 100,
            bbox: [bbox.x0, imgH - bbox.y0 + pageOffsetY, bbox.x1 - bbox.x0, bbox.y1 - bbox.y0],
            page: page,
          };
        });
        
        allBlocks.push(...pageBlocks);
        allTexts.push((ocrData.text || '').trim());
        totalConfidence += (ocrData.confidence ?? 0) / 100;
        console.log(`[OCR] Page ${page}/${totalPages} processed: ${pageBlocks.length} blocks, ${(ocrData.text || '').trim().length} chars`);
      }
      console.log(`[OCR] PDF processing complete: ${allBlocks.length} total blocks, ${allTexts.join('\n\n').length} total chars`);
    } catch (e: any) {
      console.error(`[OCR] Error processing PDF pages:`, e);
      // Fallback на первую страницу
      try {
        const imageInput = await convertPDFPage(filePath, 1);
        const ocrData: any = await processPage(imageInput, language);
        const imgH = ocrData.image?.height ?? 1000;
        
        const blocks = (ocrData.words || []).map((w: any) => {
          const bbox = w.bbox || { x0: w.x0 ?? 0, y0: w.y0 ?? 0, x1: w.x1 ?? 0, y1: w.y1 ?? 0 };
          return {
            text: w.text.trim(),
            confidence: (w.confidence ?? 0) / 100,
            bbox: [bbox.x0, imgH - bbox.y0, bbox.x1 - bbox.x0, bbox.y1 - bbox.y0],
          };
        });
        
        allBlocks = blocks;
        allTexts = [(ocrData.text || '').trim()];
        totalConfidence = (ocrData.confidence ?? 0) / 100;
        pageCount = 1;
      } catch (err) {
        throw new Error(`PDF processing failed: ${(err as any)?.message || err}`);
      }
    }
  } else {
    // Обработка изображений
    let imageInput: string | Buffer = filePath;
    
    if (['.png', '.jpg', '.jpeg'].includes(ext)) {
      imageInput = await sharp(filePath)
        .resize(1500, null, { withoutEnlargement: true })
        .png()
        .toBuffer();
    } else {
      imageInput = await sharp(filePath)
        .resize(1500, null, { withoutEnlargement: true })
        .png()
        .toBuffer();
    }

    const ocrData: any = await processPage(imageInput, language);
    const imgH = ocrData.image?.height ?? 1000;

    const blocks = (ocrData.words || []).map((w: any) => {
      const bbox = w.bbox || { x0: w.x0 ?? 0, y0: w.y0 ?? 0, x1: w.x1 ?? 0, y1: w.y1 ?? 0 };
      return {
        text: w.text.trim(),
        confidence: (w.confidence ?? 0) / 100,
        bbox: [bbox.x0, imgH - bbox.y0, bbox.x1 - bbox.x0, bbox.y1 - bbox.y0],
      };
    });

    allBlocks = blocks;
    allTexts = [(ocrData.text || '').trim()];
    totalConfidence = (ocrData.confidence ?? 0) / 100;
    pageCount = 1;
  }

  // Если блоков нет, создаем их из текста
  if (allBlocks.length === 0) {
    const fullText = allTexts.join('\n\n');
    const lines = fullText.split(/\n+/);
    let y = 0;
    for (const line of lines) {
      const words = line.split(/\s+/).filter(Boolean);
      let x = 0;
      for (const word of words) {
        const width = word.length * 15;
        allBlocks.push({
          text: word,
          confidence: 0.5,
          bbox: [x, y, width, 30],
        });
        x += width + 10;
      }
      y += 40;
    }
  }

  const fullText = allTexts.join('\n\n');
  const avgConfidence = pageCount > 0 ? totalConfidence / pageCount : 0.8;

  const result = { text: fullText, blocks: allBlocks, avgConfidence, pageCount, fromCache: false };

  // Сохраняем в кэш
  if (useCache) {
    setCachedOCR(filePath, language, result);
  }

  return result;
}
