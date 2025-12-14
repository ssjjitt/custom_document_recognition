import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import { UPLOADS_DIR } from '../utils/paths.js';
import { convertPDFPage } from '../services/ocr.service.js';
import sharp from 'sharp';

export const pagesRouter = Router();

/**
 * Получает изображение конкретной страницы PDF
 * GET /api/pages/:filePath/:pageNumber
 */
pagesRouter.get('/:filePath/:pageNumber', async (req, res) => {
  try {
    const { filePath, pageNumber } = req.params;
    const pageNum = parseInt(pageNumber, 10);
    
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ error: { en: 'Invalid page number', ru: 'Неверный номер страницы' } });
    }

    // Декодируем имя файла
    const decodedFilePath = decodeURIComponent(filePath);
    
    // Пытаемся найти файл
    let resolvedPath = decodedFilePath;
    if (!fs.existsSync(resolvedPath)) {
      const tryPath = path.join(UPLOADS_DIR, decodedFilePath);
      if (fs.existsSync(tryPath)) {
        resolvedPath = tryPath;
      } else {
        return res.status(404).json({ error: { en: 'File not found', ru: 'Файл не найден' } });
      }
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    
    // Если это не PDF, возвращаем файл как есть (для изображений)
    if (ext !== '.pdf') {
      if (fs.existsSync(resolvedPath)) {
        return res.sendFile(path.resolve(resolvedPath));
      }
      return res.status(404).json({ error: { en: 'File not found', ru: 'Файл не найден' } });
    }

    // Для PDF конвертируем страницу в изображение
    try {
      const imageBuffer = await convertPDFPage(resolvedPath, pageNum);
      
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(imageBuffer);
    } catch (err: any) {
      console.error('Error converting PDF page:', err);
      res.status(500).json({ 
        error: { 
          en: `Failed to convert page ${pageNum}: ${err.message}`, 
          ru: `Не удалось конвертировать страницу ${pageNum}: ${err.message}` 
        } 
      });
    }
  } catch (err: any) {
    console.error('Error in pages route:', err);
    res.status(500).json({ error: { en: err.message || 'Internal server error', ru: 'Внутренняя ошибка сервера' } });
  }
});

