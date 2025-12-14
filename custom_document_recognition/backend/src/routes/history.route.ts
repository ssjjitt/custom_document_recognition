import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { ObjectId } from 'mongodb';
import { LOG_FILE, UPLOADS_DIR } from '../utils/paths.ts';
import { connectDB } from '../utils/mongo.ts';

export const historyRouter = Router();

// Получить всю историю
historyRouter.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Пытаемся получить из MongoDB
    try {
      const db = await connectDB();
      const collection = db.collection('logs');
      const logs = await collection
        .find({})
        .sort({ timestamp: -1 })
        .limit(limit)
        .skip(offset)
        .toArray();
      
      const total = await collection.countDocuments();
      
      // Преобразуем ObjectId в строку и добавляем id
      const formattedLogs = logs.map((log: any) => ({
        id: log._id ? (typeof log._id === 'string' ? log._id : log._id.toString()) : `file_${Date.now()}_${Math.random()}`,
        timestamp: log.timestamp,
        filePath: log.filePath,
        fileName: path.basename(log.filePath || ''),
        fields: log.fields,
        ocrTextSnippet: log.ocrTextSnippet,
        llmResult: log.llmResult,
      }));

      return res.json({ logs: formattedLogs, total, limit, offset });
    } catch (mongoErr: any) {
      console.warn('MongoDB недоступен, используем файловое хранилище:', mongoErr.message);
    }

    // Fallback на файловое хранилище
    if (!fs.existsSync(LOG_FILE)) {
      return res.json({ logs: [], total: 0, limit, offset });
    }

    const raw = fs.readFileSync(LOG_FILE, 'utf-8').trim() || '[]';
    const allLogs = JSON.parse(raw);
    
    // Добавляем ID если его нет
    const logsWithId = allLogs.map((log: any, index: number) => ({
      id: log.id || `file_${index}_${Date.parse(log.timestamp || Date.now())}`,
      ...log,
      fileName: path.basename(log.filePath || ''),
    }));

    // Сортируем по дате (новые сначала)
    logsWithId.sort((a: any, b: any) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA;
    });

    const paginatedLogs = logsWithId.slice(offset, offset + limit);
    
    res.json({ logs: paginatedLogs, total: logsWithId.length, limit, offset });
  } catch (err: any) {
    console.error('Ошибка при получении истории:', err);
    res.status(500).json({ error: { en: 'Failed to fetch history', ru: 'Не удалось получить историю' } });
  }
});

// Получить конкретную запись по ID
historyRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Пытаемся получить из MongoDB
    try {
      const db = await connectDB();
      const collection = db.collection('logs');
      let log;
      
      // Пытаемся найти по ObjectId
      try {
        log = await collection.findOne({ _id: new ObjectId(id) });
      } catch {
        // Если не ObjectId, ищем по полю id
        log = await collection.findOne({ id: id });
      }
      
      if (log) {
        return res.json({
          id: log._id ? (typeof log._id === 'string' ? log._id : log._id.toString()) : log.id || id,
          timestamp: log.timestamp,
          filePath: log.filePath,
          fileName: path.basename(log.filePath || ''),
          fields: log.fields,
          ocrTextSnippet: log.ocrTextSnippet,
          llmResult: log.llmResult,
        });
      }
    } catch (mongoErr: any) {
      console.warn('MongoDB недоступен, используем файловое хранилище:', mongoErr.message);
    }

    // Fallback на файловое хранилище
    if (!fs.existsSync(LOG_FILE)) {
      return res.status(404).json({ error: { en: 'Log not found', ru: 'Запись не найдена' } });
    }

    const raw = fs.readFileSync(LOG_FILE, 'utf-8').trim() || '[]';
    const logs = JSON.parse(raw);
    
    const log = logs.find((l: any) => {
      const logId = l.id || `file_${logs.indexOf(l)}_${Date.parse(l.timestamp || Date.now())}`;
      return logId === id;
    });

    if (!log) {
      return res.status(404).json({ error: { en: 'Log not found', ru: 'Запись не найдена' } });
    }

    res.json({
      id: log.id || `file_${logs.indexOf(log)}_${Date.parse(log.timestamp || Date.now())}`,
      timestamp: log.timestamp,
      filePath: log.filePath,
      fileName: path.basename(log.filePath || ''),
      fields: log.fields,
      ocrTextSnippet: log.ocrTextSnippet,
      llmResult: log.llmResult,
    });
  } catch (err: any) {
    console.error('Ошибка при получении записи:', err);
    res.status(500).json({ error: { en: 'Failed to fetch log entry', ru: 'Не удалось получить запись' } });
  }
});

// Удалить запись из истории
historyRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Пытаемся удалить из MongoDB
    try {
      const db = await connectDB();
      const collection = db.collection('logs');
      let result;
      
      // Пытаемся удалить по ObjectId
      try {
        result = await collection.deleteOne({ _id: new ObjectId(id) });
      } catch {
        // Если не ObjectId, удаляем по полю id
        result = await collection.deleteOne({ id: id });
      }
      
      if (result.deletedCount > 0) {
        return res.json({ success: true, message: { en: 'Log deleted', ru: 'Запись удалена' } });
      }
    } catch (mongoErr: any) {
      console.warn('MongoDB недоступен, используем файловое хранилище:', mongoErr.message);
    }

    // Fallback на файловое хранилище
    if (!fs.existsSync(LOG_FILE)) {
      return res.status(404).json({ error: { en: 'Log not found', ru: 'Запись не найдена' } });
    }

    const raw = fs.readFileSync(LOG_FILE, 'utf-8').trim() || '[]';
    const logs = JSON.parse(raw);
    
    const filteredLogs = logs.filter((l: any, index: number) => {
      const logId = l.id || `file_${index}_${Date.parse(l.timestamp || Date.now())}`;
      return logId !== id;
    });

    if (filteredLogs.length === logs.length) {
      return res.status(404).json({ error: { en: 'Log not found', ru: 'Запись не найдена' } });
    }

    fs.writeFileSync(LOG_FILE, JSON.stringify(filteredLogs, null, 2));
    res.json({ success: true, message: { en: 'Log deleted', ru: 'Запись удалена' } });
  } catch (err: any) {
    console.error('Ошибка при удалении записи:', err);
    res.status(500).json({ error: { en: 'Failed to delete log entry', ru: 'Не удалось удалить запись' } });
  }
});

