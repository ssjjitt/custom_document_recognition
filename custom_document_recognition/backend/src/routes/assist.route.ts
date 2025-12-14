import { Router } from 'express';
import { describeField } from '../services/llm.service.ts';

export const assistRouter = Router();

assistRouter.post('/describe-field', async (req, res) => {
  try {
    const { field, context } = req.body || {};
    if (!field || typeof field !== 'string') {
      return res.status(400).json({ error: { en: 'field required', ru: 'нужно передать поле' } });
    }
    const text = typeof context === 'string' ? context : '';
    const description = await describeField(field, text);
    res.json({ description });
  } catch (err: any) {
    console.error('describe-field failed', err);
    res.status(500).json({ error: { en: 'Failed to describe field', ru: 'Не удалось получить описание поля' } });
  }
});

