import express from 'express';
import cors from 'cors';
import { uploadRouter } from './routes/upload.route.js';
import { recognizeRouter } from './routes/recognize.route.js';
import { historyRouter } from './routes/history.route.js';
import { templatesRouter } from './routes/templates.route.js';
import { assistRouter } from './routes/assist.route.js';
import { pagesRouter } from './routes/pages.route.js';
import { errorHandler } from './middleware/errorHandler.js';
import { UPLOADS_DIR } from './utils/paths.js';
import path from 'path';

const app = express();

// CORS настройки для продакшн
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://*.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    // Разрешаем запросы без origin (например, мобильные приложения)
    if (!origin) return callback(null, true);
    
    // Проверяем точное совпадение или wildcard
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed.includes('*')) {
        const pattern = allowed.replace('*', '.*');
        return new RegExp(pattern).test(origin);
      }
      return origin === allowed;
    });
    
    callback(null, isAllowed);
  },
  credentials: true
}));

app.use(express.json({ limit: '5mb' }));

app.use('/api/upload', uploadRouter);
app.use('/api/recognize', recognizeRouter);
app.use('/api/history', historyRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/assist', assistRouter);
app.use('/api/pages', pagesRouter);

app.use('/api/uploads', express.static(UPLOADS_DIR));

app.get('/api/ping', (req, res) => res.json({ message: 'Server is alive' }));

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
