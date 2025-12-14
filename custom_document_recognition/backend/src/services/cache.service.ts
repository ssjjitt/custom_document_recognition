import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

const CACHE_DIR = path.join(os.tmpdir(), 'ocr-cache');
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 часа

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

interface CacheEntry {
  text: string;
  blocks: any[];
  avgConfidence: number;
  pageCount?: number;
  timestamp: number;
  language: string;
}

function getFileHash(filePath: string, language: string): string {
  try {
    const stats = fs.statSync(filePath);
    // Для больших файлов используем только размер и модификацию времени
    // Для маленьких файлов читаем содержимое
    const hash = crypto.createHash('sha256');
    if (stats.size < 10 * 1024 * 1024) { // Файлы меньше 10MB
      const fileContent = fs.readFileSync(filePath);
      hash.update(fileContent);
    } else {
      // Для больших файлов используем метаданные
      hash.update(stats.size.toString());
      hash.update(stats.mtimeMs.toString());
    }
    hash.update(stats.size.toString());
    hash.update(language);
    return hash.digest('hex');
  } catch (e) {
    // Fallback на простой хеш
    return crypto.createHash('sha256')
      .update(filePath + language + Date.now())
      .digest('hex');
  }
}

function getCachePath(filePath: string, language: string): string {
  const hash = getFileHash(filePath, language);
  return path.join(CACHE_DIR, `${hash}.json`);
}

export function getCachedOCR(filePath: string, language: string): CacheEntry | null {
  try {
    const cachePath = getCachePath(filePath, language);
    if (!fs.existsSync(cachePath)) return null;

    const data = fs.readFileSync(cachePath, 'utf-8');
    const entry: CacheEntry = JSON.parse(data);

    // Проверка TTL
    const age = Date.now() - entry.timestamp;
    if (age > CACHE_TTL) {
      fs.unlinkSync(cachePath);
      return null;
    }

    return entry;
  } catch (e) {
    return null;
  }
}

export function setCachedOCR(filePath: string, language: string, result: Omit<CacheEntry, 'timestamp' | 'language'>): void {
  try {
    const cachePath = getCachePath(filePath, language);
    const entry: CacheEntry = {
      ...result,
      timestamp: Date.now(),
      language,
    };
    fs.writeFileSync(cachePath, JSON.stringify(entry), 'utf-8');
  } catch (e) {
    // Игнорируем ошибки кэширования
  }
}

export function clearCache(): void {
  try {
    const files = fs.readdirSync(CACHE_DIR);
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(CACHE_DIR, file);
        const data = fs.readFileSync(filePath, 'utf-8');
        const entry: CacheEntry = JSON.parse(data);
        const age = Date.now() - entry.timestamp;
        if (age > CACHE_TTL) {
          fs.unlinkSync(filePath);
        }
      }
    }
  } catch (e) {
    // Игнорируем ошибки очистки
  }
}

// Периодическая очистка старых записей
setInterval(clearCache, 60 * 60 * 1000); // Каждый час

