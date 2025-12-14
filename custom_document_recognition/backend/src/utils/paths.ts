import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const UPLOADS_DIR = path.join(__dirname, '../../uploads');
export const LOGS_DIR = path.join(__dirname, '../../logs');
export const LOG_FILE = path.join(LOGS_DIR, 'logs.json');
export const TEMPLATES_DIR = path.join(__dirname, '../../templates');
export const TEMPLATES_FILE = path.join(TEMPLATES_DIR, 'templates.json');
