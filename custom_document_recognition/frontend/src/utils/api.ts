// Утилита для получения базового URL API
export const getApiBaseUrl = (): string => {
  return import.meta.env.VITE_API_BASE || 'http://localhost:4000';
};

// Функция для создания полного URL к API endpoint
export const apiUrl = (endpoint: string): string => {
  const base = getApiBaseUrl();
  // Убираем начальный слеш если есть, чтобы избежать двойных слешей
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${base}/${cleanEndpoint}`;
};

