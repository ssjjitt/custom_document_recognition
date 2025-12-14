import { Router } from 'express';
import { runOCR } from '../services/ocr.service.js';
import { queryLLM, suggestFieldsFromText } from '../services/llm.service.js';
import { logResult } from '../services/log.service.js';
import path from 'path';
import fs from 'fs';
import { UPLOADS_DIR } from '../utils/paths.js';

export const recognizeRouter = Router();

const DEFAULT_FIELDS = ['дата', 'время', 'сумма', 'валюта', 'номер документа', 'организация'];

function detectLanguageFromText(text: string) {
  const cyr = (text.match(/[А-Яа-яЁё]/g) || []).length;
  const lat = (text.match(/[A-Za-z]/g) || []).length;
  const total = cyr + lat;
  if (total === 0) return { language: 'rus+eng', confidence: 0.2 };
  const ratio = cyr / total;
  if (ratio > 0.78) return { language: 'rus', confidence: ratio };
  if (ratio < 0.22) return { language: 'eng', confidence: 1 - ratio };
  return { language: 'rus+eng', confidence: 0.6 };
}

function detectCurrency(text: string) {
  const candidates: Array<{ code: string; label: string; score: number; source: string }> = [];
  const push = (code: string, label: string, score: number, source: string) => {
    if (candidates.find((c) => c.code === code)) return;
    candidates.push({ code, label, score, source });
  };

  const hasRub = /(₽|руб\.?|р(?=\s|\.)|RUB|RUR)/i.test(text);
  const hasUsd = /(\$|USD|доллар)/i.test(text);
  const hasEur = /(€|EUR|евро)/i.test(text);
  const hasKzt = /(KZT|₸|тенге)/i.test(text);
  const hasUah = /(UAH|₴|грн)/i.test(text);

  if (hasRub) push('RUB', '₽ (RUB)', 0.95, 'symbol');
  if (hasUsd) push('USD', '$ (USD)', 0.8, 'symbol');
  if (hasEur) push('EUR', '€ (EUR)', 0.8, 'symbol');
  if (hasKzt) push('KZT', '₸ (KZT)', 0.7, 'symbol');
  if (hasUah) push('UAH', '₴ (UAH)', 0.7, 'symbol');

  // heuristics by locale letters
  if (!candidates.length && /руб/i.test(text)) push('RUB', 'RUB', 0.6, 'word');
  if (!candidates.length && /\$/.test(text)) push('USD', '$ (USD)', 0.55, 'word');

  return candidates.sort((a, b) => b.score - a.score);
}

recognizeRouter.post('/', async (req, res) => {
  try {
    const { fields, filePath, language, useCache, mode } = req.body;

    const autoMode = mode === 'auto';

    if (!filePath) return res.status(400).json({ error: { en: 'filePath required', ru: 'требуется filePath' } });
    if (!autoMode && (!Array.isArray(fields) || fields.length === 0)) {
      return res.status(400).json({ error: { en: 'fields required', ru: 'требуются поля' } });
    }

    let resolvedPath = filePath;
    if (!fs.existsSync(resolvedPath)) {
      const tryPath = path.join(UPLOADS_DIR, filePath);
      if (fs.existsSync(tryPath)) resolvedPath = tryPath;
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(400).json({ error: { en: 'file not found', ru: 'файл не найден' } });
    }

    // Определяем, является ли файл PDF
    const ext = path.extname(resolvedPath).toLowerCase();
    const isPDF = ext === '.pdf';
    const originalFileName = path.basename(resolvedPath);

    const requestedLanguage = language === 'auto' ? null : language;
    let ocrLanguage = requestedLanguage || 'rus+eng';
    const shouldUseCache = useCache !== false; // По умолчанию true

    let { text, blocks, avgConfidence, pageCount, fromCache } = await runOCR(resolvedPath, ocrLanguage, shouldUseCache);

    // Определяем язык по тексту и при необходимости перезапускаем OCR
    const detected = detectLanguageFromText(text || '');
    if (!requestedLanguage && detected.language !== ocrLanguage) {
      try {
        const rerun = await runOCR(resolvedPath, detected.language, shouldUseCache);
        if ((rerun.avgConfidence ?? 0) >= (avgConfidence ?? 0) - 0.05) {
          text = rerun.text;
          blocks = rerun.blocks;
          avgConfidence = rerun.avgConfidence;
          pageCount = rerun.pageCount;
          fromCache = rerun.fromCache;
          ocrLanguage = detected.language;
        }
      } catch (err) {
        console.warn('Language rerun failed, keep original OCR:', (err as any)?.message || err);
      }
    }

    if (!text || text.trim().length === 0) {
      await logResult(filePath, fields, text, {});
      return res.json({
        fields: {},
        ocr: { text, blocks, avgConfidence },
        meta: { filePath, ocr_confidence: avgConfidence, timestamp: new Date().toISOString() }
      });
    }

    let fieldsToUse: string[] = Array.isArray(fields) ? fields : [];
    if (autoMode || fieldsToUse.length === 0) {
      const suggested = await suggestFieldsFromText(text);
      if (Array.isArray(suggested) && suggested.length > 0) {
        fieldsToUse = suggested;
      } else {
        fieldsToUse = DEFAULT_FIELDS;
      }
    }

    // Всегда добавляем валюту, если нашли признаки
    const currencyCandidates = detectCurrency(text || '');
    if (currencyCandidates.length > 0 && !fieldsToUse.some((f) => f.toLowerCase().includes('валют'))) {
      fieldsToUse = [...fieldsToUse, 'валюта'];
    }

    let llmResult: any = {};
    let llmError: string | null = null;
    try {
      llmResult = await queryLLM(fieldsToUse, text);
      if (!llmResult || typeof llmResult !== 'object') llmResult = {};
    } catch (e:any) {
      console.error('LLM error:', e);
      llmResult = {};
      llmError = e?.message || 'LLM failure';
    }

    const textStr = (text || '') as string;
    const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');

    const dateRe = /\b\d{1,2}[.\-/]\d{1,2}[.\-/]\d{2,4}\b/;
    const timeRe = /\b\d{1,2}:\d{2}\b/;
    const priceRe = /(\d[\d\s,.]*)\s?(?:Р|руб|RUB|р)\b/i;

    const finalFields: any = {};

    for (const field of fieldsToUse) {
      const key = field;

      if (llmResult && llmResult[key] && llmResult[key].value) {
        finalFields[key] = { ...llmResult[key], inferred: false };
        continue;
      }

      const low = (field || '').toLowerCase();
      let match: RegExpMatchArray | null = null;
      if (low.includes('дата')) match = textStr.match(dateRe);
      else if (low.includes('время')) match = textStr.match(timeRe);
      else if (low.includes('цена') || low.includes('сумма')) match = textStr.match(priceRe);
      else if (low.includes('город')) match = textStr.match(/город[:\s]*([^\r\n]+)/i);
      else if (low.includes('имя') || low.includes('клиент')) match = textStr.match(/имя(?: клиента)?[:\s]*([^\r\n]+)/i);

      if (!match) {
        const generic = new RegExp(`${escapeRegExp(field)}[:\-]\s*([^\r\n]+)`, 'i');
        match = textStr.match(generic);
      }

      if (match) {
        const value = (match[1] ?? match[0] ?? '').toString().trim();
        finalFields[key] = { value, confidence: 0.5, candidates: [], inferred: false };
        continue;
      }

      try {
        const single = await queryLLM([field], text);
        if (single && single[field] && single[field].value) {
          const entry = { ...single[field] };
          if (typeof entry.confidence !== 'number') entry.confidence = 0.25;
          entry.inferred = true;
          finalFields[key] = entry;
          continue;
        }
      } catch (e:any) {
        console.error('LLM guess error for field', field, e?.message || e);
        llmError = llmError || (e?.message || 'LLM guess failure');
      }

      finalFields[key] = { value: '', confidence: 0.0, candidates: [], inferred: false };
    }

    if (currencyCandidates.length > 0) {
      const currencyFieldKey = fieldsToUse.find((f) => f.toLowerCase().includes('валют')) || 'валюта';
      if (!finalFields[currencyFieldKey]) {
        const primary = currencyCandidates[0];
        if (primary) {
          finalFields[currencyFieldKey] = { value: primary.code, confidence: primary.score, candidates: currencyCandidates, inferred: false };
        }
      } else {
        finalFields[currencyFieldKey].candidates = currencyCandidates;
      }
    }

    await logResult(resolvedPath, fieldsToUse, text, finalFields);

    res.json({
      fields: finalFields,
      ocr: { text, blocks, avgConfidence, pageCount },
      meta: { 
        filePath: resolvedPath,
        originalFileName,
        isPDF,
        ocr_confidence: avgConfidence, 
        timestamp: new Date().toISOString(), 
        llm_error: llmError,
        language: ocrLanguage,
        detectedLanguage: detected.language,
        languageConfidence: detected.confidence,
        fromCache: fromCache || false,
        pageCount: pageCount || 1,
        autoMode,
        fieldsUsed: fieldsToUse,
        currencyCandidates
      }
    });
  } catch (err:any) {
    console.error(err);
    res.status(500).json({ error: { en: err.message || 'Recognition failed', ru: 'Ошибка распознавания' } });
  }
});
