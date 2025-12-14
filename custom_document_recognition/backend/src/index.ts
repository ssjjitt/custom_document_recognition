import express from 'express';
import cors from 'cors';
import { uploadRouter } from './routes/upload.route.ts';
import { recognizeRouter } from './routes/recognize.route.ts';
import { historyRouter } from './routes/history.route.ts';
import { templatesRouter } from './routes/templates.route.ts';
import { assistRouter } from './routes/assist.route.ts';
import { pagesRouter } from './routes/pages.route.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import { UPLOADS_DIR } from './utils/paths.ts';
import path from 'path';

const app = express();
app.use(cors());
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
