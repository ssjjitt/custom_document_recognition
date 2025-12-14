import { Router } from 'express';
import fs from 'fs';
import { TEMPLATES_DIR, TEMPLATES_FILE } from '../utils/paths.js';
import { connectDB } from '../utils/mongo.js';

export const templatesRouter = Router();

if (!fs.existsSync(TEMPLATES_DIR)) fs.mkdirSync(TEMPLATES_DIR, { recursive: true });

// Получить все шаблоны
templatesRouter.get('/', async (req, res) => {
  try {
    // Пытаемся получить из MongoDB
    try {
      const db = await connectDB();
      const collection = db.collection('templates');
      const templates = await collection.find({}).sort({ updatedAt: -1 }).toArray();
      
      const formattedTemplates = templates.map((t: any) => ({
        id: t._id ? (typeof t._id === 'string' ? t._id : t._id.toString()) : t.id,
        name: t.name,
        description: t.description || '',
        fields: t.fields || [],
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      }));

      return res.json({ templates: formattedTemplates });
    } catch (mongoErr: any) {
      console.warn('MongoDB недоступен, используем файловое хранилище:', mongoErr.message);
    }

    // Fallback на файловое хранилище
    if (!fs.existsSync(TEMPLATES_FILE)) {
      // Создаем несколько предустановленных шаблонов
      const defaultTemplates = [
        {
          id: 'template_1',
          name: 'Чек',
          description: 'Шаблон для обработки чеков',
          fields: ['дата', 'время', 'сумма', 'магазин', 'номер чека'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'template_2',
          name: 'Договор',
          description: 'Шаблон для обработки договоров',
          fields: ['номер договора', 'дата', 'сторона 1', 'сторона 2', 'сумма', 'срок действия'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'template_3',
          name: 'Накладная',
          description: 'Шаблон для обработки накладных',
          fields: ['номер накладной', 'дата', 'поставщик', 'получатель', 'товары', 'общая сумма'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(defaultTemplates, null, 2));
      return res.json({ templates: defaultTemplates });
    }

    const raw = fs.readFileSync(TEMPLATES_FILE, 'utf-8').trim() || '[]';
    const templates = JSON.parse(raw);
    
    res.json({ templates });
  } catch (err: any) {
    console.error('Ошибка при получении шаблонов:', err);
    res.status(500).json({ error: { en: 'Failed to fetch templates', ru: 'Не удалось получить шаблоны' } });
  }
});

// Получить конкретный шаблон по ID
templatesRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Пытаемся получить из MongoDB
    try {
      const db = await connectDB();
      const collection = db.collection('templates');
      const { ObjectId } = await import('mongodb');
      let template;
      
      try {
        template = await collection.findOne({ _id: new ObjectId(id) });
      } catch {
        template = await collection.findOne({ id: id });
      }
      
      if (template) {
        return res.json({
          id: template._id ? (typeof template._id === 'string' ? template._id : template._id.toString()) : template.id || id,
          name: template.name,
          description: template.description || '',
          fields: template.fields || [],
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
        });
      }
    } catch (mongoErr: any) {
      console.warn('MongoDB недоступен, используем файловое хранилище:', mongoErr.message);
    }

    // Fallback на файловое хранилище
    if (!fs.existsSync(TEMPLATES_FILE)) {
      return res.status(404).json({ error: { en: 'Template not found', ru: 'Шаблон не найден' } });
    }

    const raw = fs.readFileSync(TEMPLATES_FILE, 'utf-8').trim() || '[]';
    const templates = JSON.parse(raw);
    
    const template = templates.find((t: any) => t.id === id);

    if (!template) {
      return res.status(404).json({ error: { en: 'Template not found', ru: 'Шаблон не найден' } });
    }

    res.json(template);
  } catch (err: any) {
    console.error('Ошибка при получении шаблона:', err);
    res.status(500).json({ error: { en: 'Failed to fetch template', ru: 'Не удалось получить шаблон' } });
  }
});

// Создать новый шаблон
templatesRouter.post('/', async (req, res) => {
  try {
    const { name, description, fields } = req.body;

    if (!name || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({ error: { en: 'Name and fields are required', ru: 'Требуются название и поля' } });
    }

    const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    const template = {
      id: templateId,
      name: name.trim(),
      description: (description || '').trim(),
      fields: fields,
      createdAt: now,
      updatedAt: now,
    };

    // Пытаемся сохранить в MongoDB
    try {
      const db = await connectDB();
      const collection = db.collection('templates');
      await collection.insertOne(template);
      return res.json(template);
    } catch (mongoErr: any) {
      console.warn('MongoDB недоступен, используем файловое хранилище:', mongoErr.message);
    }

    // Fallback на файловое хранилище
    let templates: any[] = [];
    if (fs.existsSync(TEMPLATES_FILE)) {
      const raw = fs.readFileSync(TEMPLATES_FILE, 'utf-8').trim() || '[]';
      templates = JSON.parse(raw);
    }

    templates.push(template);
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2));
    
    res.json(template);
  } catch (err: any) {
    console.error('Ошибка при создании шаблона:', err);
    res.status(500).json({ error: { en: 'Failed to create template', ru: 'Не удалось создать шаблон' } });
  }
});

// Обновить шаблон
templatesRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, fields } = req.body;

    if (!name || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({ error: { en: 'Name and fields are required', ru: 'Требуются название и поля' } });
    }

    const updated = {
      name: name.trim(),
      description: (description || '').trim(),
      fields: fields,
      updatedAt: new Date().toISOString(),
    };

    // Пытаемся обновить в MongoDB
    try {
      const db = await connectDB();
      const collection = db.collection('templates');
      const { ObjectId } = await import('mongodb');
      let result;
      
      try {
        result = await collection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updated }
        );
      } catch {
        result = await collection.updateOne(
          { id: id },
          { $set: updated }
        );
      }
      
      if (result.matchedCount > 0) {
        let template;
        try {
          template = await collection.findOne({ _id: new ObjectId(id) });
        } catch {
          template = await collection.findOne({ id: id });
        }
        if (template) {
          return res.json({
            id: template._id ? (typeof template._id === 'string' ? template._id : template._id.toString()) : template.id || id,
            name: template.name,
            description: template.description || '',
            fields: template.fields || [],
            createdAt: template.createdAt,
            updatedAt: template.updatedAt,
          });
        }
      }
    } catch (mongoErr: any) {
      console.warn('MongoDB недоступен, используем файловое хранилище:', mongoErr.message);
    }

    // Fallback на файловое хранилище
    if (!fs.existsSync(TEMPLATES_FILE)) {
      return res.status(404).json({ error: { en: 'Template not found', ru: 'Шаблон не найден' } });
    }

    const raw = fs.readFileSync(TEMPLATES_FILE, 'utf-8').trim() || '[]';
    const templates = JSON.parse(raw);
    
    const index = templates.findIndex((t: any) => t.id === id);
    if (index === -1) {
      return res.status(404).json({ error: { en: 'Template not found', ru: 'Шаблон не найден' } });
    }

    templates[index] = { ...templates[index], ...updated };
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(templates, null, 2));
    
    res.json(templates[index]);
  } catch (err: any) {
    console.error('Ошибка при обновлении шаблона:', err);
    res.status(500).json({ error: { en: 'Failed to update template', ru: 'Не удалось обновить шаблон' } });
  }
});

// Удалить шаблон
templatesRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Пытаемся удалить из MongoDB
    try {
      const db = await connectDB();
      const collection = db.collection('templates');
      const { ObjectId } = await import('mongodb');
      let result;
      
      try {
        result = await collection.deleteOne({ _id: new ObjectId(id) });
      } catch {
        result = await collection.deleteOne({ id: id });
      }
      
      if (result.deletedCount > 0) {
        return res.json({ success: true, message: { en: 'Template deleted', ru: 'Шаблон удален' } });
      }
    } catch (mongoErr: any) {
      console.warn('MongoDB недоступен, используем файловое хранилище:', mongoErr.message);
    }

    // Fallback на файловое хранилище
    if (!fs.existsSync(TEMPLATES_FILE)) {
      return res.status(404).json({ error: { en: 'Template not found', ru: 'Шаблон не найден' } });
    }

    const raw = fs.readFileSync(TEMPLATES_FILE, 'utf-8').trim() || '[]';
    const templates = JSON.parse(raw);
    
    const filtered = templates.filter((t: any) => t.id !== id);

    if (filtered.length === templates.length) {
      return res.status(404).json({ error: { en: 'Template not found', ru: 'Шаблон не найден' } });
    }

    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(filtered, null, 2));
    res.json({ success: true, message: { en: 'Template deleted', ru: 'Шаблон удален' } });
  } catch (err: any) {
    console.error('Ошибка при удалении шаблона:', err);
    res.status(500).json({ error: { en: 'Failed to delete template', ru: 'Не удалось удалить шаблон' } });
  }
});

