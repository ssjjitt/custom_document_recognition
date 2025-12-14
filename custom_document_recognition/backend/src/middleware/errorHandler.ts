import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error(err);
  const message = err && err.message ? err.message : 'Internal Server Error';
  res.status(err.status || 500).json({
    error: {
      en: message,
      ru: message 
    }
  });
}