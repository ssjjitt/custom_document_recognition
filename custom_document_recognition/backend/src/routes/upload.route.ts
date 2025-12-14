import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { UPLOADS_DIR } from '../utils/paths.ts';
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.pdf'];
    const allowedMimes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();
    
    if (!allowed.includes(ext) && !allowedMimes.includes(mime)) {
      return cb(new Error('INVALID_FILE_TYPE'));
    }
    cb(null, true);
  },
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB
});

export const uploadRouter = Router();

uploadRouter.post('/', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: { en: 'No file uploaded', ru: 'Файл не загружен' } });

  const ext = path.extname(req.file.originalname).toLowerCase();
  const uploadedPath = req.file.path;

  // Обработка изображений (png, jpg, jpeg) - возвращаем как есть
  if (['.png', '.jpg', '.jpeg'].includes(ext)) {
    const filename = path.basename(uploadedPath);
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
    return res.json({ filePath: filename, mime: mimeType });
  }

  if (ext === '.pdf') {
      // Для PDF файлов возвращаем оригинальный файл, чтобы можно было обработать все страницы
      const filename = path.basename(uploadedPath);
      return res.json({ 
        filePath: filename, 
        mime: 'application/pdf',
        original: path.basename(uploadedPath),
        meta: { isPDF: true }
      });
  }

  const filename = path.basename(uploadedPath);
  res.json({ filePath: filename, mime: req.file.mimetype });
});
